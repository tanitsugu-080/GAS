// ===== 設定（スクリプトプロパティ版） =====
const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const SHARED_TOKEN = SCRIPT_PROPS.getProperty('SHARED_TOKEN') || '';
const DEFAULT_PARENT_FOLDER_ID = SCRIPT_PROPS.getProperty('DEFAULT_PARENT_FOLDER_ID') || '';


function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse({ ok: true, version: 'v2025-11-08-2' });
}

// ▼ 一時デバッグ：ヘッダ / クエリ / ボディ で認証を受け付ける
function verifyAuth(e) {
  // デバッグ用ログ出力
  console.log('=== DEBUG: verifyAuth ===');
  console.log('e.headers:', JSON.stringify(e?.headers || {}));
  console.log('e.parameter:', JSON.stringify(e?.parameter || {}));
  
  // 1) Authorizationヘッダ
  const headers = e?.headers || {};
  console.log('All header keys:', Object.keys(headers));
  
  const auth = headers['Authorization'] || headers['authorization'] || '';
  console.log('Auth header value:', auth);
  
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7).trim();
    console.log('Extracted token:', token);
    console.log('Expected SHARED_TOKEN:', SHARED_TOKEN);
    console.log('Token match:', token === SHARED_TOKEN);
    if (token === SHARED_TOKEN) return true;
  }
  
  // 2) クエリ ?token=...
  const q = e?.parameter || {};
  if (q.token && q.token === SHARED_TOKEN) return true;
  
  // 3) POSTボディ { token: "..." }
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.token && body.token === SHARED_TOKEN) return true;
  } catch (_) {}
  
  console.log('=== Auth failed ===');
  return false;
}

function doPost(e) {
  try {
    // 認証チェック
    if (!verifyAuth(e)) {
      return jsonResponse({ 
        ok: false, 
        error: 'Unauthorized', 
        code: 401 
      });
    }
    
    // POSTボディをパース
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const filename = body.filename || 'untitled.dat';
    const mimeType = body.mimeType || MimeType.PLAIN_TEXT;
    const contentB64 = body.content_base64;
    const parents = Array.isArray(body.parents) ? body.parents : (DEFAULT_PARENT_FOLDER_ID ? [DEFAULT_PARENT_FOLDER_ID] : []);
    const makePublic = !!body.makePublic;
    
    // content_base64が必須
    if (!contentB64) {
      return jsonResponse({ 
        ok: false, 
        error: 'content_base64 required', 
        code: 400 
      });
    }
    
    // Base64デコードしてBlobを作成
    const blob = Utilities.newBlob(
      Utilities.base64Decode(contentB64), 
      mimeType, 
      filename
    );
    const file = DriveApp.createFile(blob);
    
    // 親フォルダに移動
    if (parents.length > 0) {
      parents.forEach(fid => { 
        try { 
          DriveApp.getFolderById(fid).addFile(file); 
        } catch (_) {} 
      });
      try { 
        DriveApp.getRootFolder().removeFile(file); 
      } catch (_) {}
    }
    
    // 公開設定
    if (makePublic) {
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK, 
        DriveApp.Permission.VIEW
      );
    }
    
    // 成功レスポンス
    return jsonResponse({ 
      ok: true, 
      id: file.getId(), 
      name: file.getName(), 
      url: file.getUrl() 
    });
    
  } catch (err) {
    return jsonResponse({ 
      ok: false, 
      error: String(err), 
      code: 500 
    });
  }
}
