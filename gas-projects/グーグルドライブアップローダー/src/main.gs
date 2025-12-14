function doGet(e) {
  return jsonResponse({ ok: true, version: 'v2025-11-10-folder-create-list-files-no-legacy' });
}

function doPost(e) {
  try {
    // === 認証チェック ===
    if (!verifyAuth(e)) {
      return jsonResponse({ ok: false, error: 'Unauthorized', code: 401 });
    }

    // === リクエスト本文をパース ===
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const op = (body.op || 'create').toLowerCase(); // デフォルトはcreate

    // === フォルダ作成 ===
    if (op === 'create-folder') {
      if (!body.folderName) {
        return jsonResponse({ ok: false, error: 'folderName required', code: 400 });
      }
      const result = createFolder({
        folderName: body.folderName,
        parents: Array.isArray(body.parents) ? body.parents : undefined
      });
      return jsonResponse({ ok: true, ...result });
    }

    // === 新規ファイル作成 ===
    if (op === 'create') {
      if (!body.content_base64) {
        return jsonResponse({ ok: false, error: 'content_base64 required', code: 400 });
      }
      const created = createFileFromBase64({
        filename: body.filename || 'untitled.dat',
        mimeType: body.mimeType || MimeType.PLAIN_TEXT,
        contentB64: body.content_base64,
        parents: Array.isArray(body.parents) ? body.parents : undefined,
        makePublic: !!body.makePublic
      });
      return jsonResponse({ ok: true, ...created });
    }

    // === 既存ファイル上書き更新 ===
    if (op === 'update') {
      let fileId = body.fileId;
      if (!fileId && body.fileUrl) {
        fileId = extractFileIdFromUrl(body.fileUrl);
      }
      if (!fileId) {
        return jsonResponse({ ok: false, error: 'fileId or fileUrl required', code: 400 });
      }
      if (!body.content_base64) {
        return jsonResponse({ ok: false, error: 'content_base64 required', code: 400 });
      }

      const updated = updateFileFromBase64(fileId, {
        filename: body.filename,
        mimeType: body.mimeType,
        contentB64: body.content_base64,
        makePublic: !!body.makePublic
      });
      return jsonResponse({ ok: true, ...updated });
    }

    // === ファイル一覧取得（拡張子任意） ===
    if (op === 'list-files') {
      const result = listFiles({
        filetype: body.filetype,
        parentId: body.parentId,
        pageSize: typeof body.pageSize === 'number' ? body.pageSize : undefined,
        pageToken: body.pageToken
      });
      return jsonResponse({ ok: true, ...result });
    }

    // === 未対応のop ===
    return jsonResponse({ ok: false, error: 'unknown op: ' + op, code: 400 });

  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), code: 500 });
  }
}
