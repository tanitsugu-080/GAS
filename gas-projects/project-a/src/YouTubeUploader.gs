/**
 * YouTube URLからvideoIdを抽出し、指定したSRT字幕をアップロードする
 * 前提：
 * - Apps Scriptの拡張サービスで「YouTube Data API v3」を有効化済み
 * - GCP側でも同APIを有効化済み
 * - アップロード対象のチャンネルはスクリプト実行者の権限下
 */

// ======== メイン関数 ========
function uploadSrtFromUrl() {
  const url = 'https://youtube.com/shorts/dtLwyIE1sHw?si=TgN9-D__FkScwblp'; // ←テストURL
  const srtFileId = '【Google Drive上のSRTファイルIDを入れる】';
  const language = 'en';       // BCP-47コード
  const name = 'English';      // 字幕トラック名

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('動画IDを抽出できませんでした。URLを確認してください。');
  }

  const srtBlob = DriveApp.getFileById(srtFileId).getBlob();

  const resource = {
    snippet: {
      videoId: videoId,
      language: language,
      name: name,
      isDraft: false
    }
  };

  const response = YouTube.Captions.insert('snippet', resource, srtBlob);
  Logger.log(JSON.stringify(response, null, 2));
  Logger.log(`✅ 字幕アップロード完了: Video ID = ${videoId}`);
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
