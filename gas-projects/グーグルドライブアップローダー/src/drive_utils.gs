/**
 * Driveユーティリティ
 * Advanced Drive Service（Drive API）を有効化して利用します。
 * エディタ左の「サービス」→「Drive API」を追加してください。
 */

/**
 * Base64文字列からBlobを作る
 * @param {string} contentB64
 * @param {string} mimeType
 * @param {string} filename
 * @return {GoogleAppsScript.Base.Blob}
 */
function toBlobFromBase64_(contentB64, mimeType, filename) {
  return Utilities.newBlob(
    Utilities.base64Decode(contentB64),
    mimeType,
    filename
  );
}

/**
 * Drive の共有URL等から fileId を抽出する
 * 想定形式: https://drive.google.com/file/d/<ID>/view?...
 * 予備形式: ...?id=<ID>
 * @param {string} url
 * @return {string|null}
 */
function extractFileIdFromUrl(url) {
  if (!url) return null;
  // /file/d/<ID>/ 形式
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)(?:\/|$|\?)/);
  if (m && m[1]) return m[1];
  // open?id=<ID> などの形式
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2 && m2[1]) return m2[1];
  return null;
}

/**
 * 新規フォルダを作成する
 * @param {Object} p {folderName: string, parents?: string[]}
 * @return {{id: string, name: string, url: string}}
 */
function createFolder(p) {
  const name = p.folderName || 'New Folder';
  const parents = Array.isArray(p.parents) ? p.parents : (DEFAULT_PARENT_FOLDER_ID ? [DEFAULT_PARENT_FOLDER_ID] : []);
  let folder;

  if (parents.length > 0) {
    try {
      const parent = DriveApp.getFolderById(parents[0]);
      folder = parent.createFolder(name);
    } catch (err) {
      throw new Error('Invalid parent folder ID: ' + err);
    }
  } else {
    folder = DriveApp.createFolder(name);
  }

  return { id: folder.getId(), name: folder.getName(), url: folder.getUrl() };
}

/**
 * 新規ファイル作成（DriveApp版）
 * @param {Object} p {filename, mimeType, contentB64, parents?: string[], makePublic?: boolean}
 * @return {{id: string, name: string, url: string}}
 */
function createFileFromBase64(p) {
  const blob = toBlobFromBase64_(p.contentB64, p.mimeType || MimeType.PLAIN_TEXT, p.filename || 'untitled.dat');
  const file = DriveApp.createFile(blob);

  const parents = Array.isArray(p.parents)
    ? p.parents
    : (DEFAULT_PARENT_FOLDER_ID ? [DEFAULT_PARENT_FOLDER_ID] : []);

  if (parents.length > 0) {
    parents.forEach(fid => {
      try { DriveApp.getFolderById(fid).addFile(file); } catch (_) {}
    });
    try { DriveApp.getRootFolder().removeFile(file); } catch (_) {}
  }

  if (p.makePublic) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}

/**
 * 既存ファイルを上書き更新（内容差し替え）
 * - Advanced Drive Service: Drive.Files.update を使用
 * @param {string} fileId
 * @param {Object} p {filename?, mimeType?, contentB64, makePublic?}
 * @return {{id: string, name: string, url: string}}
 */
function updateFileFromBase64(fileId, p) {
  if (!fileId) throw new Error('fileId is required');
  if (!p || !p.contentB64) throw new Error('content_base64 is required');

  const meta = {};
  if (p.filename) meta.name = p.filename;
  if (p.mimeType) meta.mimeType = p.mimeType;

  const blob = toBlobFromBase64_(p.contentB64, p.mimeType || MimeType.PLAIN_TEXT, p.filename || undefined);
  const updated = Drive.Files.update(meta, fileId, blob); // 要: 追加サービス「Drive API」
  const f = DriveApp.getFileById(updated.id);

  if (p.makePublic) {
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return { id: updated.id, name: f.getName(), url: f.getUrl() };
}
