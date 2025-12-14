// ▼ 一時デバッグ：ヘッダ / クエリ / ボディ で認証を受け付ける
function verifyAuth(e) {
  console.log('=== DEBUG: verifyAuth ===');
  console.log('e.headers:', JSON.stringify(e?.headers || {}));
  console.log('e.parameter:', JSON.stringify(e?.parameter || {}));

  // 1) Authorizationヘッダ
  const headers = e?.headers || {};
  const auth = headers['Authorization'] || headers['authorization'] || '';
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7).trim();
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
