function jsonResponse(obj, status) {
  // Apps ScriptのWebアプリはステータスコードを細かく返せないので、payloadにcodeを含める運用でOK
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
