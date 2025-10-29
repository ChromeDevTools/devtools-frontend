"use strict";
import * as Platform from "../platform/platform.js";
export function normalizePath(path) {
  if (path.indexOf("..") === -1 && path.indexOf(".") === -1) {
    return path;
  }
  const segments = (path[0] === "/" ? path.substring(1) : path).split("/");
  const normalizedSegments = [];
  for (const segment of segments) {
    if (segment === ".") {
      continue;
    } else if (segment === "..") {
      normalizedSegments.pop();
    } else {
      normalizedSegments.push(segment);
    }
  }
  let normalizedPath = normalizedSegments.join("/");
  if (path[0] === "/" && normalizedPath) {
    normalizedPath = "/" + normalizedPath;
  }
  if (normalizedPath[normalizedPath.length - 1] !== "/" && (path[path.length - 1] === "/" || segments[segments.length - 1] === "." || segments[segments.length - 1] === "..")) {
    normalizedPath = normalizedPath + "/";
  }
  return normalizedPath;
}
export function schemeIs(url, scheme) {
  try {
    return new URL(url).protocol === scheme;
  } catch {
    return false;
  }
}
export class ParsedURL {
  isValid = false;
  url;
  scheme = "";
  user = "";
  host = "";
  port = "";
  path = "";
  queryParams = "";
  fragment = "";
  folderPathComponents = "";
  lastPathComponent = "";
  blobInnerScheme;
  #displayName;
  #dataURLDisplayName;
  constructor(url) {
    this.url = url;
    const isBlobUrl = this.url.startsWith("blob:");
    const urlToMatch = isBlobUrl ? url.substring(5) : url;
    const match = urlToMatch.match(ParsedURL.urlRegex());
    if (match) {
      this.isValid = true;
      if (isBlobUrl) {
        this.blobInnerScheme = match[2].toLowerCase();
        this.scheme = "blob";
      } else {
        this.scheme = match[2].toLowerCase();
      }
      this.user = match[3] ?? "";
      this.host = match[4] ?? "";
      this.port = match[5] ?? "";
      this.path = match[6] ?? "/";
      this.queryParams = match[7] ?? "";
      this.fragment = match[8] ?? "";
    } else {
      if (this.url.startsWith("data:")) {
        this.scheme = "data";
        return;
      }
      if (this.url.startsWith("blob:")) {
        this.scheme = "blob";
        return;
      }
      if (this.url === "about:blank") {
        this.scheme = "about";
        return;
      }
      this.path = this.url;
    }
    const lastSlashExceptTrailingIndex = this.path.lastIndexOf("/", this.path.length - 2);
    if (lastSlashExceptTrailingIndex !== -1) {
      this.lastPathComponent = this.path.substring(lastSlashExceptTrailingIndex + 1);
    } else {
      this.lastPathComponent = this.path;
    }
    const lastSlashIndex = this.path.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      this.folderPathComponents = this.path.substring(0, lastSlashIndex);
    }
  }
  static fromString(string) {
    const parsedURL = new ParsedURL(string.toString());
    if (parsedURL.isValid) {
      return parsedURL;
    }
    return null;
  }
  static preEncodeSpecialCharactersInPath(path) {
    for (const specialChar of ["%", ";", "#", "?", " "]) {
      path = path.replaceAll(specialChar, encodeURIComponent(specialChar));
    }
    return path;
  }
  static rawPathToEncodedPathString(path) {
    const partiallyEncoded = ParsedURL.preEncodeSpecialCharactersInPath(path);
    if (path.startsWith("/")) {
      return new URL(partiallyEncoded, "file:///").pathname;
    }
    return new URL("/" + partiallyEncoded, "file:///").pathname.substr(1);
  }
  /**
   * @param name Must not be encoded
   */
  static encodedFromParentPathAndName(parentPath, name) {
    return ParsedURL.concatenate(parentPath, "/", ParsedURL.preEncodeSpecialCharactersInPath(name));
  }
  /**
   * @param name Must not be encoded
   */
  static urlFromParentUrlAndName(parentUrl, name) {
    return ParsedURL.concatenate(parentUrl, "/", ParsedURL.preEncodeSpecialCharactersInPath(name));
  }
  static encodedPathToRawPathString(encPath) {
    return decodeURIComponent(encPath);
  }
  static rawPathToUrlString(fileSystemPath) {
    let preEncodedPath = ParsedURL.preEncodeSpecialCharactersInPath(
      fileSystemPath.replace(/\\/g, "/")
    );
    preEncodedPath = preEncodedPath.replace(/\\/g, "/");
    if (!preEncodedPath.startsWith("file://")) {
      if (preEncodedPath.startsWith("/")) {
        preEncodedPath = "file://" + preEncodedPath;
      } else {
        preEncodedPath = "file:///" + preEncodedPath;
      }
    }
    return new URL(preEncodedPath).toString();
  }
  static relativePathToUrlString(relativePath, baseURL) {
    const preEncodedPath = ParsedURL.preEncodeSpecialCharactersInPath(
      relativePath.replace(/\\/g, "/")
    );
    return new URL(preEncodedPath, baseURL).toString();
  }
  static urlToRawPathString(fileURL, isWindows) {
    console.assert(fileURL.startsWith("file://"), "This must be a file URL.");
    const decodedFileURL = decodeURIComponent(fileURL);
    if (isWindows) {
      return decodedFileURL.substr("file:///".length).replace(/\//g, "\\");
    }
    return decodedFileURL.substr("file://".length);
  }
  static sliceUrlToEncodedPathString(url, start) {
    return url.substring(start);
  }
  static substr(devToolsPath, from, length) {
    return devToolsPath.substr(from, length);
  }
  static substring(devToolsPath, start, end) {
    return devToolsPath.substring(start, end);
  }
  static prepend(prefix, devToolsPath) {
    return prefix + devToolsPath;
  }
  static concatenate(devToolsPath, ...appendage) {
    return devToolsPath.concat(...appendage);
  }
  static trim(devToolsPath) {
    return devToolsPath.trim();
  }
  static slice(devToolsPath, start, end) {
    return devToolsPath.slice(start, end);
  }
  static join(devToolsPaths, separator) {
    return devToolsPaths.join(separator);
  }
  static split(devToolsPath, separator, limit) {
    return devToolsPath.split(separator, limit);
  }
  static toLowerCase(devToolsPath) {
    return devToolsPath.toLowerCase();
  }
  static isValidUrlString(str) {
    return new ParsedURL(str).isValid;
  }
  static urlWithoutHash(url) {
    const hashIndex = url.indexOf("#");
    if (hashIndex !== -1) {
      return url.substr(0, hashIndex);
    }
    return url;
  }
  static urlRegex() {
    if (ParsedURL.urlRegexInstance) {
      return ParsedURL.urlRegexInstance;
    }
    const schemeRegex = /([A-Za-z][A-Za-z0-9+.-]*):\/\//;
    const userRegex = /(?:([A-Za-z0-9\-._~%!$&'()*+,;=:]*)@)?/;
    const hostRegex = /((?:\[::\d?\])|(?:[^\s\/:]*))/;
    const portRegex = /(?::([\d]+))?/;
    const pathRegex = /(\/[^#?]*)?/;
    const queryRegex = /(?:\?([^#]*))?/;
    const fragmentRegex = /(?:#(.*))?/;
    ParsedURL.urlRegexInstance = new RegExp(
      "^(" + schemeRegex.source + userRegex.source + hostRegex.source + portRegex.source + ")" + pathRegex.source + queryRegex.source + fragmentRegex.source + "$"
    );
    return ParsedURL.urlRegexInstance;
  }
  static extractPath(url) {
    const parsedURL = this.fromString(url);
    return parsedURL ? parsedURL.path : "";
  }
  static extractOrigin(url) {
    const parsedURL = this.fromString(url);
    return parsedURL ? parsedURL.securityOrigin() : Platform.DevToolsPath.EmptyUrlString;
  }
  static extractExtension(url) {
    url = ParsedURL.urlWithoutHash(url);
    const indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark !== -1) {
      url = url.substr(0, indexOfQuestionMark);
    }
    const lastIndexOfSlash = url.lastIndexOf("/");
    if (lastIndexOfSlash !== -1) {
      url = url.substr(lastIndexOfSlash + 1);
    }
    const lastIndexOfDot = url.lastIndexOf(".");
    if (lastIndexOfDot !== -1) {
      url = url.substr(lastIndexOfDot + 1);
      const lastIndexOfPercent = url.indexOf("%");
      if (lastIndexOfPercent !== -1) {
        return url.substr(0, lastIndexOfPercent);
      }
      return url;
    }
    return "";
  }
  static extractName(url) {
    let index = url.lastIndexOf("/");
    const pathAndQuery = index !== -1 ? url.substr(index + 1) : url;
    index = pathAndQuery.indexOf("?");
    return index < 0 ? pathAndQuery : pathAndQuery.substr(0, index);
  }
  static completeURL(baseURL, href) {
    if (href.startsWith("data:") || href.startsWith("blob:") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      return href;
    }
    const trimmedHref = href.trim();
    const parsedHref = this.fromString(trimmedHref);
    if (parsedHref?.scheme) {
      const securityOrigin2 = parsedHref.securityOrigin();
      const pathText2 = normalizePath(parsedHref.path);
      const queryText2 = parsedHref.queryParams && `?${parsedHref.queryParams}`;
      const fragmentText = parsedHref.fragment && `#${parsedHref.fragment}`;
      return securityOrigin2 + pathText2 + queryText2 + fragmentText;
    }
    const parsedURL = this.fromString(baseURL);
    if (!parsedURL) {
      return null;
    }
    if (parsedURL.isDataURL()) {
      return href;
    }
    if (href.length > 1 && href.charAt(0) === "/" && href.charAt(1) === "/") {
      return parsedURL.scheme + ":" + href;
    }
    const securityOrigin = parsedURL.securityOrigin();
    const pathText = parsedURL.path;
    const queryText = parsedURL.queryParams ? "?" + parsedURL.queryParams : "";
    if (!href.length) {
      return securityOrigin + pathText + queryText;
    }
    if (href.charAt(0) === "#") {
      return securityOrigin + pathText + queryText + href;
    }
    if (href.charAt(0) === "?") {
      return securityOrigin + pathText + href;
    }
    const hrefMatches = href.match(/^[^#?]*/);
    if (!hrefMatches || !href.length) {
      throw new Error("Invalid href");
    }
    let hrefPath = hrefMatches[0];
    const hrefSuffix = href.substring(hrefPath.length);
    if (hrefPath.charAt(0) !== "/") {
      hrefPath = parsedURL.folderPathComponents + "/" + hrefPath;
    }
    return securityOrigin + normalizePath(hrefPath) + hrefSuffix;
  }
  static splitLineAndColumn(string) {
    const beforePathMatch = string.match(ParsedURL.urlRegex());
    let beforePath = "";
    let pathAndAfter = string;
    if (beforePathMatch) {
      beforePath = beforePathMatch[1];
      pathAndAfter = string.substring(beforePathMatch[1].length);
    }
    const lineColumnRegEx = /(?::(\d+))?(?::(\d+))?$/;
    const lineColumnMatch = lineColumnRegEx.exec(pathAndAfter);
    let lineNumber;
    let columnNumber;
    console.assert(Boolean(lineColumnMatch));
    if (!lineColumnMatch) {
      return { url: string, lineNumber: 0, columnNumber: 0 };
    }
    if (typeof lineColumnMatch[1] === "string") {
      lineNumber = parseInt(lineColumnMatch[1], 10);
      lineNumber = isNaN(lineNumber) ? void 0 : lineNumber - 1;
    }
    if (typeof lineColumnMatch[2] === "string") {
      columnNumber = parseInt(lineColumnMatch[2], 10);
      columnNumber = isNaN(columnNumber) ? void 0 : columnNumber - 1;
    }
    let url = beforePath + pathAndAfter.substring(0, pathAndAfter.length - lineColumnMatch[0].length);
    if (lineColumnMatch[1] === void 0 && lineColumnMatch[2] === void 0) {
      const wasmCodeOffsetRegex = /wasm-function\[\d+\]:0x([a-z0-9]+)$/g;
      const wasmCodeOffsetMatch = wasmCodeOffsetRegex.exec(pathAndAfter);
      if (wasmCodeOffsetMatch && typeof wasmCodeOffsetMatch[1] === "string") {
        url = ParsedURL.removeWasmFunctionInfoFromURL(url);
        columnNumber = parseInt(wasmCodeOffsetMatch[1], 16);
        columnNumber = isNaN(columnNumber) ? void 0 : columnNumber;
      }
    }
    return { url, lineNumber, columnNumber };
  }
  static removeWasmFunctionInfoFromURL(url) {
    const wasmFunctionRegEx = /:wasm-function\[\d+\]/;
    const wasmFunctionIndex = url.search(wasmFunctionRegEx);
    if (wasmFunctionIndex === -1) {
      return url;
    }
    return ParsedURL.substring(url, 0, wasmFunctionIndex);
  }
  static beginsWithWindowsDriveLetter(url) {
    return /^[A-Za-z]:/.test(url);
  }
  static beginsWithScheme(url) {
    return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(url);
  }
  static isRelativeURL(url) {
    return !this.beginsWithScheme(url) || this.beginsWithWindowsDriveLetter(url);
  }
  get displayName() {
    if (this.#displayName) {
      return this.#displayName;
    }
    if (this.isDataURL()) {
      return this.dataURLDisplayName();
    }
    if (this.isBlobURL()) {
      return this.url;
    }
    if (this.isAboutBlank()) {
      return this.url;
    }
    this.#displayName = this.lastPathComponent;
    if (!this.#displayName) {
      this.#displayName = (this.host || "") + "/";
    }
    if (this.#displayName === "/") {
      this.#displayName = this.url;
    }
    return this.#displayName;
  }
  dataURLDisplayName() {
    if (this.#dataURLDisplayName) {
      return this.#dataURLDisplayName;
    }
    if (!this.isDataURL()) {
      return "";
    }
    this.#dataURLDisplayName = Platform.StringUtilities.trimEndWithMaxLength(this.url, 20);
    return this.#dataURLDisplayName;
  }
  isAboutBlank() {
    return this.url === "about:blank";
  }
  isDataURL() {
    return this.scheme === "data";
  }
  extractDataUrlMimeType() {
    const regexp = /^data:((?<type>\w+)\/(?<subtype>\w+))?(;base64)?,/;
    const match = this.url.match(regexp);
    return {
      type: match?.groups?.type,
      subtype: match?.groups?.subtype
    };
  }
  isBlobURL() {
    return this.url.startsWith("blob:");
  }
  lastPathComponentWithFragment() {
    return this.lastPathComponent + (this.fragment ? "#" + this.fragment : "");
  }
  domain() {
    if (this.isDataURL()) {
      return "data:";
    }
    return this.host + (this.port ? ":" + this.port : "");
  }
  securityOrigin() {
    if (this.isDataURL()) {
      return "data:";
    }
    const scheme = this.isBlobURL() ? this.blobInnerScheme : this.scheme;
    return scheme + "://" + this.domain();
  }
  urlWithoutScheme() {
    if (this.scheme && this.url.startsWith(this.scheme + "://")) {
      return this.url.substring(this.scheme.length + 3);
    }
    return this.url;
  }
  static urlRegexInstance = null;
}
//# sourceMappingURL=ParsedURL.js.map
