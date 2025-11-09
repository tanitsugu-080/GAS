/**
 * YouTube URLからvideoIdを抽出し、指定したSRT字幕をアップロードする
 * 前提：
 * - Apps Scriptの拡張サービスで「YouTube Data API v3」を有効化済み
 * - GCP側でも同APIを有効化済み
 * - アップロード対象のチャンネルはスクリプト実行者の権限下
 */

// ======== エントリポイント ========
/**
 * 指定されたパラメータを使って SRT 字幕をアップロードする。
 * @param {{url: string, srtFileId: string, language?: string, name?: string, isDraft?: boolean|string}} params
 * @returns {{videoId: string, captionId: string, language: (string|undefined), name: (string|undefined), rawResponse: GoogleAppsScript.YouTube.Schema.Caption}}
 */
function uploadSrtFromUrl(params) {
  const normalized = normalizeCaptionRequest_(params);
  const videoId = extractYouTubeVideoId(normalized.url);
  if (!videoId) {
    throw createValidationError_('動画IDを抽出できませんでした。URLを確認してください。');
  }

  const srtBlob = DriveApp.getFileById(normalized.srtFileId).getBlob();
  const resource = {
    snippet: {
      videoId: videoId,
      language: normalized.language,
      name: normalized.name,
      isDraft: normalized.isDraft
    }
  };

  const response = YouTube.Captions.insert(resource, 'snippet', srtBlob);
  Logger.log(JSON.stringify(response, null, 2));
  Logger.log(`✅ 字幕アップロード完了: Video ID = ${videoId}`);

  return {
    videoId: videoId,
    captionId: response.id,
    language: response.snippet && response.snippet.language,
    name: response.snippet && response.snippet.name,
    rawResponse: response
  };
}

/**
 * 外部（例: Dify）からの HTTP POST リクエストを受け付ける。
 * 期待する JSON ボディ:
 * {
 *   "url": "https://www.youtube.com/watch?v=...",
 *   "srtFileId": "<Google Drive file id>",
 *   "language": "en",
 *   "name": "English",
 *   "isDraft": false
 * }
 */
function doPost(e) {
  try {
    const params = extractCaptionRequestParams_(e);
    const result = uploadSrtFromUrl(params);
    return jsonResponse_({
      status: 'success',
      videoId: result.videoId,
      captionId: result.captionId,
      language: result.language || params.language,
      name: result.name || params.name
    });
  } catch (error) {
    Logger.log(`❌ 字幕アップロード失敗: ${error.stack || error.message}`);
    const status = error && error.name === 'ValidationError' ? 'invalid_request' : 'error';
    return jsonResponse_({
      status: status,
      message: error.message
    });
  }
}


// ======== URLからvideoIdを抽出 ========
function extractYouTubeVideoId(input) {
  if (!input) return null;
  const str = String(input).trim();

  // attribution_link対応
  try {
    const u = new URL(str);
    const uParam = u.searchParams.get('u');
    if (uParam) {
      const decoded = decodeURIComponent(uParam);
      const fromAttribution = extractYouTubeVideoId(decoded);
      if (fromAttribution) return fromAttribution;
    }
  } catch (e) {}

  try {
    const url = new URL(str);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const path = url.pathname;
    const v = url.searchParams.get('v');
    if (isYouTubeId(v)) return v;

    if (host === 'youtu.be') {
      const seg = path.split('/').filter(Boolean)[0];
      if (isYouTubeId(seg)) return seg;
    }

    const m = path.match(/^\/(?:shorts|embed|v|live)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/);
    if (m && isYouTubeId(m[1])) return m[1];

    if (!v) {
      const anyV = path.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (anyV && isYouTubeId(anyV[1])) return anyV[1];
    }
  } catch (e) {}

  const generic =
    str.match(/(?:(?:v=)|(?:\/(?:shorts|embed|v|live)\/)|(?:youtu\.be\/))([A-Za-z0-9_-]{11})/);
  if (generic && isYouTubeId(generic[1])) return generic[1];
  if (isYouTubeId(str)) return str;
  return null;
}

function isYouTubeId(s) {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{11}$/.test(s);
}

function extractCaptionRequestParams_(e) {
  const parameter = (e && e.parameter) || {};
  const body = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  const parsedBody = parseJsonIfPossible_(body);
  const merged = Object.assign({}, parameter, parsedBody);
  return merged;
}

function normalizeCaptionRequest_(raw) {
  if (!raw || typeof raw !== 'object') {
    throw createValidationError_('リクエストパラメータが空です。');
  }

  const url = coerceNonEmptyString_(raw.url);
  const srtFileIdRaw = coerceNonEmptyString_(raw.srtFileId);
  const srtFileId = extractDriveFileId_(srtFileIdRaw);
  const language = coerceNonEmptyString_(raw.language) || 'en';
  const name = coerceNonEmptyString_(raw.name) || language;
  const isDraft = parseBoolean_(raw.isDraft, false);

  if (!url) {
    throw createValidationError_('url は必須項目です。');
  }
  if (!srtFileId) {
    throw createValidationError_('srtFileId は必須項目です。');
  }

  return {
    url: url,
    srtFileId: srtFileId,
    language: language,
    name: name,
    isDraft: isDraft
  };
}

function parseJsonIfPossible_(text) {
  if (!text) return {};
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    throw createValidationError_('POST ボディは有効な JSON 形式である必要があります。');
  }
}

function coerceNonEmptyString_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function extractDriveFileId_(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && trimmed.indexOf('/') === -1) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'drive.google.com') {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch && fileMatch[1]) return fileMatch[1];
      const folderMatch = url.pathname.match(/\/folders\/([^/]+)/);
      if (folderMatch && folderMatch[1]) return folderMatch[1];
      const idParam = url.searchParams.get('id');
      if (idParam) return idParam;
    }
  } catch (e) {}

  return trimmed;
}

function parseBoolean_(value, defaultValue) {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

function createValidationError_(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  return error;
}
