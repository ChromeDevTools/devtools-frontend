"use strict";
export var MimeType = /* @__PURE__ */ ((MimeType2) => {
  MimeType2["HTML"] = "text/html";
  MimeType2["XML"] = "text/xml";
  MimeType2["PLAIN"] = "text/plain";
  MimeType2["XHTML"] = "application/xhtml+xml";
  MimeType2["SVG"] = "image/svg+xml";
  MimeType2["CSS"] = "text/css";
  MimeType2["XSL"] = "text/xsl";
  MimeType2["VTT"] = "text/vtt";
  MimeType2["PDF"] = "application/pdf";
  MimeType2["EVENTSTREAM"] = "text/event-stream";
  return MimeType2;
})(MimeType || {});
const ADDITIONAL_TEXT_MIME_TYPES = /* @__PURE__ */ new Set([
  "application/ecmascript",
  "application/javascript",
  "application/json",
  "application/json+protobuf",
  "application/mpegurl",
  "application/vnd.apple.mpegurl",
  "application/vnd.dart",
  "application/xml",
  "application/x-aspx",
  "application/x-javascript",
  "application/x-jsp",
  "application/x-httpd-php",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl"
]);
export function isTextType(mimeType) {
  return mimeType.startsWith("text/") || mimeType.startsWith("multipart/") || mimeType.includes("json") || mimeType.endsWith("+xml") || ADDITIONAL_TEXT_MIME_TYPES.has(mimeType);
}
export function parseContentType(contentType) {
  if (contentType === "*/*") {
    return { mimeType: null, charset: null };
  }
  const { mimeType, params } = parseMimeType(contentType);
  const charset = params.get("charset")?.toLowerCase().trim() ?? null;
  return { mimeType, charset };
}
function parseMimeType(contentType) {
  contentType = contentType.trim();
  let mimeTypeEnd = findFirstIndexOf(contentType, " 	;(");
  if (mimeTypeEnd < 0) {
    mimeTypeEnd = contentType.length;
  }
  const slashPos = contentType.indexOf("/");
  if (slashPos < 0 || slashPos > mimeTypeEnd) {
    return { mimeType: null, params: /* @__PURE__ */ new Map() };
  }
  const mimeType = contentType.substring(0, mimeTypeEnd).toLowerCase();
  const params = /* @__PURE__ */ new Map();
  let offset = contentType.indexOf(";", mimeTypeEnd);
  while (offset >= 0 && offset < contentType.length) {
    ++offset;
    offset = findFirstIndexNotOf(contentType, " 	", offset);
    if (offset < 0) {
      continue;
    }
    const paramNameStart = offset;
    offset = findFirstIndexOf(contentType, ";=", offset);
    if (offset < 0 || contentType[offset] === ";") {
      continue;
    }
    const paramName = contentType.substring(paramNameStart, offset).toLowerCase();
    ++offset;
    offset = findFirstIndexNotOf(contentType, " 	", offset);
    let paramValue = "";
    if (offset < 0 || contentType[offset] === ";") {
      continue;
    } else if (contentType[offset] !== '"') {
      const valueStart = offset;
      offset = contentType.indexOf(";", offset);
      const valueEnd = offset >= 0 ? offset : contentType.length;
      paramValue = contentType.substring(valueStart, valueEnd).trimEnd();
    } else {
      ++offset;
      while (offset < contentType.length && contentType[offset] !== '"') {
        if (contentType[offset] === "\\" && offset + 1 < contentType.length) {
          ++offset;
        }
        paramValue += contentType[offset];
        ++offset;
      }
      offset = contentType.indexOf(";", offset);
    }
    if (!params.has(paramName)) {
      params.set(paramName, paramValue);
    }
  }
  return { mimeType, params };
}
function findFirstIndexOf(searchString, characters, pos = 0) {
  for (let i = pos; i < searchString.length; i++) {
    if (characters.includes(searchString[i])) {
      return i;
    }
  }
  return -1;
}
function findFirstIndexNotOf(searchString, characters, pos = 0) {
  for (let i = pos; i < searchString.length; i++) {
    if (!characters.includes(searchString[i])) {
      return i;
    }
  }
  return -1;
}
//# sourceMappingURL=MimeType.js.map
