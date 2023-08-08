/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Platform from '../platform/platform.js';

/**
 * http://tools.ietf.org/html/rfc3986#section-5.2.4
 */
export function normalizePath(path: string): string {
  if (path.indexOf('..') === -1 && path.indexOf('.') === -1) {
    return path;
  }

  // Remove leading slash (will be added back below) so we
  // can handle all (including empty) segments consistently.
  const segments = (path[0] === '/' ? path.substring(1) : path).split('/');
  const normalizedSegments = [];
  for (const segment of segments) {
    if (segment === '.') {
      continue;
    } else if (segment === '..') {
      normalizedSegments.pop();
    } else {
      normalizedSegments.push(segment);
    }
  }
  let normalizedPath = normalizedSegments.join('/');
  if (path[0] === '/' && normalizedPath) {
    normalizedPath = '/' + normalizedPath;
  }
  if (normalizedPath[normalizedPath.length - 1] !== '/' &&
      ((path[path.length - 1] === '/') || (segments[segments.length - 1] === '.') ||
       (segments[segments.length - 1] === '..'))) {
    normalizedPath = normalizedPath + '/';
  }

  return normalizedPath;
}

/**
 * File paths in DevTools that are represented either as unencoded absolute or relative paths, or encoded paths, or URLs.
 * @example
 * RawPathString: “/Hello World/file.js”
 * EncodedPathString: “/Hello%20World/file.js”
 * UrlString: “file:///Hello%20World/file/js”
 */
type BrandedPathString =
    Platform.DevToolsPath.UrlString|Platform.DevToolsPath.RawPathString|Platform.DevToolsPath.EncodedPathString;

export class ParsedURL {
  isValid: boolean;
  url: string;
  scheme: string;
  user: string;
  host: string;
  port: string;
  path: string;
  queryParams: string;
  fragment: string;
  folderPathComponents: string;
  lastPathComponent: string;
  readonly blobInnerScheme: string|undefined;
  #displayNameInternal?: string;
  #dataURLDisplayNameInternal?: string;

  constructor(url: string) {
    this.isValid = false;
    this.url = url;
    this.scheme = '';
    this.user = '';
    this.host = '';
    this.port = '';
    this.path = '';
    this.queryParams = '';
    this.fragment = '';
    this.folderPathComponents = '';
    this.lastPathComponent = '';

    const isBlobUrl = this.url.startsWith('blob:');
    const urlToMatch = isBlobUrl ? url.substring(5) : url;
    const match = urlToMatch.match(ParsedURL.urlRegex());
    if (match) {
      this.isValid = true;
      if (isBlobUrl) {
        this.blobInnerScheme = match[2].toLowerCase();
        this.scheme = 'blob';
      } else {
        this.scheme = match[2].toLowerCase();
      }
      this.user = match[3] ?? '';
      this.host = match[4] ?? '';
      this.port = match[5] ?? '';
      this.path = match[6] ?? '/';
      this.queryParams = match[7] ?? '';
      this.fragment = match[8] ?? '';
    } else {
      if (this.url.startsWith('data:')) {
        this.scheme = 'data';
        return;
      }
      if (this.url.startsWith('blob:')) {
        this.scheme = 'blob';
        return;
      }
      if (this.url === 'about:blank') {
        this.scheme = 'about';
        return;
      }
      this.path = this.url;
    }

    const lastSlashExceptTrailingIndex = this.path.lastIndexOf('/', this.path.length - 2);
    if (lastSlashExceptTrailingIndex !== -1) {
      this.lastPathComponent = this.path.substring(lastSlashExceptTrailingIndex + 1);
    } else {
      this.lastPathComponent = this.path;
    }
    const lastSlashIndex = this.path.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      this.folderPathComponents = this.path.substring(0, lastSlashIndex);
    }
  }

  static fromString(string: string): ParsedURL|null {
    const parsedURL = new ParsedURL(string.toString());
    if (parsedURL.isValid) {
      return parsedURL;
    }
    return null;
  }

  static preEncodeSpecialCharactersInPath(path: string): string {
    // Based on net::FilePathToFileURL. Ideally we would handle
    // '\\' as well on non-Windows file systems.
    for (const specialChar of ['%', ';', '#', '?', ' ']) {
      (path as string) = path.replaceAll(specialChar, encodeURIComponent(specialChar));
    }
    return path;
  }

  static rawPathToEncodedPathString(path: Platform.DevToolsPath.RawPathString):
      Platform.DevToolsPath.EncodedPathString {
    const partiallyEncoded = ParsedURL.preEncodeSpecialCharactersInPath(path);
    if (path.startsWith('/')) {
      return new URL(partiallyEncoded, 'file:///').pathname as Platform.DevToolsPath.EncodedPathString;
    }
    // URL prepends a '/'
    return new URL('/' + partiallyEncoded, 'file:///').pathname.substr(1) as Platform.DevToolsPath.EncodedPathString;
  }

  /**
   * @param name Must not be encoded
   */
  static encodedFromParentPathAndName(parentPath: Platform.DevToolsPath.EncodedPathString, name: string):
      Platform.DevToolsPath.EncodedPathString {
    return ParsedURL.concatenate(parentPath, '/', ParsedURL.preEncodeSpecialCharactersInPath(name));
  }

  /**
   * @param name Must not be encoded
   */
  static urlFromParentUrlAndName(parentUrl: Platform.DevToolsPath.UrlString, name: string):
      Platform.DevToolsPath.UrlString {
    return ParsedURL.concatenate(parentUrl, '/', ParsedURL.preEncodeSpecialCharactersInPath(name));
  }

  static encodedPathToRawPathString(encPath: Platform.DevToolsPath.EncodedPathString):
      Platform.DevToolsPath.RawPathString {
    return decodeURIComponent(encPath) as Platform.DevToolsPath.RawPathString;
  }

  static rawPathToUrlString(fileSystemPath: Platform.DevToolsPath.RawPathString): Platform.DevToolsPath.UrlString {
    let preEncodedPath: string = ParsedURL.preEncodeSpecialCharactersInPath(
        fileSystemPath.replace(/\\/g, '/') as Platform.DevToolsPath.RawPathString);
    preEncodedPath = preEncodedPath.replace(/\\/g, '/');
    if (!preEncodedPath.startsWith('file://')) {
      if (preEncodedPath.startsWith('/')) {
        preEncodedPath = 'file://' + preEncodedPath;
      } else {
        preEncodedPath = 'file:///' + preEncodedPath;
      }
    }
    return new URL(preEncodedPath).toString() as Platform.DevToolsPath.UrlString;
  }

  static relativePathToUrlString(
      relativePath: Platform.DevToolsPath.RawPathString,
      baseURL: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    const preEncodedPath: string = ParsedURL.preEncodeSpecialCharactersInPath(
        relativePath.replace(/\\/g, '/') as Platform.DevToolsPath.RawPathString);
    return new URL(preEncodedPath, baseURL).toString() as Platform.DevToolsPath.UrlString;
  }

  static urlToRawPathString(fileURL: Platform.DevToolsPath.UrlString, isWindows?: boolean):
      Platform.DevToolsPath.RawPathString {
    console.assert(fileURL.startsWith('file://'), 'This must be a file URL.');
    const decodedFileURL = decodeURIComponent(fileURL);
    if (isWindows) {
      return decodedFileURL.substr('file:///'.length).replace(/\//g, '\\') as Platform.DevToolsPath.RawPathString;
    }
    return decodedFileURL.substr('file://'.length) as Platform.DevToolsPath.RawPathString;
  }

  static sliceUrlToEncodedPathString(url: Platform.DevToolsPath.UrlString, start: number):
      Platform.DevToolsPath.EncodedPathString {
    return url.substring(start) as Platform.DevToolsPath.EncodedPathString;
  }

  static substr<DevToolsPathType extends BrandedPathString>(
      devToolsPath: DevToolsPathType, from: number, length?: number): DevToolsPathType {
    return devToolsPath.substr(from, length) as DevToolsPathType;
  }

  static substring<DevToolsPathType extends BrandedPathString>(
      devToolsPath: DevToolsPathType, start: number, end?: number): DevToolsPathType {
    return devToolsPath.substring(start, end) as DevToolsPathType;
  }

  static prepend<DevToolsPathType extends BrandedPathString>(prefix: string, devToolsPath: DevToolsPathType):
      DevToolsPathType {
    return prefix + devToolsPath as DevToolsPathType;
  }

  static concatenate<DevToolsPathType extends BrandedPathString>(
      devToolsPath: DevToolsPathType, ...appendage: string[]): DevToolsPathType {
    return devToolsPath.concat(...appendage) as DevToolsPathType;
  }

  static trim<DevToolsPathType extends BrandedPathString>(devToolsPath: DevToolsPathType): DevToolsPathType {
    return devToolsPath.trim() as DevToolsPathType;
  }

  static slice<DevToolsPathType extends BrandedPathString>(
      devToolsPath: DevToolsPathType, start?: number, end?: number): DevToolsPathType {
    return devToolsPath.slice(start, end) as DevToolsPathType;
  }

  static join<DevToolsPathType extends BrandedPathString>(devToolsPaths: DevToolsPathType[], separator?: string):
      DevToolsPathType {
    return devToolsPaths.join(separator) as DevToolsPathType;
  }

  static split<DevToolsPathType extends BrandedPathString>(
      devToolsPath: DevToolsPathType, separator: string|RegExp, limit?: number): DevToolsPathType[] {
    return devToolsPath.split(separator, limit) as DevToolsPathType[];
  }

  static toLowerCase<DevToolsPathType extends BrandedPathString>(devToolsPath: DevToolsPathType): DevToolsPathType {
    return devToolsPath.toLowerCase() as DevToolsPathType;
  }

  static isValidUrlString(str: string): str is Platform.DevToolsPath.UrlString {
    return new ParsedURL(str).isValid;
  }

  static urlWithoutHash(url: string): string {
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      return url.substr(0, hashIndex);
    }
    return url;
  }

  static urlRegex(): RegExp {
    if (ParsedURL.urlRegexInstance) {
      return ParsedURL.urlRegexInstance;
    }
    // RegExp groups:
    // 1 - scheme, hostname, ?port
    // 2 - scheme (using the RFC3986 grammar)
    // 3 - ?user:password
    // 4 - hostname
    // 5 - ?port
    // 6 - ?path
    // 7 - ?query
    // 8 - ?fragment
    const schemeRegex = /([A-Za-z][A-Za-z0-9+.-]*):\/\//;
    const userRegex = /(?:([A-Za-z0-9\-._~%!$&'()*+,;=:]*)@)?/;
    const hostRegex = /((?:\[::\d?\])|(?:[^\s\/:]*))/;
    const portRegex = /(?::([\d]+))?/;
    const pathRegex = /(\/[^#?]*)?/;
    const queryRegex = /(?:\?([^#]*))?/;
    const fragmentRegex = /(?:#(.*))?/;

    ParsedURL.urlRegexInstance = new RegExp(
        '^(' + schemeRegex.source + userRegex.source + hostRegex.source + portRegex.source + ')' + pathRegex.source +
        queryRegex.source + fragmentRegex.source + '$');
    return ParsedURL.urlRegexInstance;
  }

  static extractPath(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.EncodedPathString {
    const parsedURL = this.fromString(url);
    return (parsedURL ? parsedURL.path : '') as Platform.DevToolsPath.EncodedPathString;
  }

  static extractOrigin(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString {
    const parsedURL = this.fromString(url);
    return parsedURL ? parsedURL.securityOrigin() : Platform.DevToolsPath.EmptyUrlString;
  }

  static extractExtension(url: string): string {
    url = ParsedURL.urlWithoutHash(url);
    const indexOfQuestionMark = url.indexOf('?');
    if (indexOfQuestionMark !== -1) {
      url = url.substr(0, indexOfQuestionMark);
    }
    const lastIndexOfSlash = url.lastIndexOf('/');
    if (lastIndexOfSlash !== -1) {
      url = url.substr(lastIndexOfSlash + 1);
    }
    const lastIndexOfDot = url.lastIndexOf('.');
    if (lastIndexOfDot !== -1) {
      url = url.substr(lastIndexOfDot + 1);
      const lastIndexOfPercent = url.indexOf('%');
      if (lastIndexOfPercent !== -1) {
        return url.substr(0, lastIndexOfPercent);
      }
      return url;
    }
    return '';
  }

  static extractName(url: string): string {
    let index = url.lastIndexOf('/');
    const pathAndQuery = index !== -1 ? url.substr(index + 1) : url;
    index = pathAndQuery.indexOf('?');
    return index < 0 ? pathAndQuery : pathAndQuery.substr(0, index);
  }

  static completeURL(baseURL: Platform.DevToolsPath.UrlString, href: string): Platform.DevToolsPath.UrlString|null {
    // Return special URLs as-is.
    const trimmedHref = href.trim();
    if (trimmedHref.startsWith('data:') || trimmedHref.startsWith('blob:') || trimmedHref.startsWith('javascript:') ||
        trimmedHref.startsWith('mailto:')) {
      return href as Platform.DevToolsPath.UrlString;
    }

    // Return absolute URLs with normalized path and other components as-is.
    const parsedHref = this.fromString(trimmedHref);
    if (parsedHref && parsedHref.scheme) {
      const securityOrigin = parsedHref.securityOrigin();
      const pathText = normalizePath(parsedHref.path);
      const queryText = parsedHref.queryParams && `?${parsedHref.queryParams}`;
      const fragmentText = parsedHref.fragment && `#${parsedHref.fragment}`;
      return securityOrigin + pathText + queryText + fragmentText as Platform.DevToolsPath.UrlString;
    }

    const parsedURL = this.fromString(baseURL);
    if (!parsedURL) {
      return null;
    }

    if (parsedURL.isDataURL()) {
      return href as Platform.DevToolsPath.UrlString;
    }

    if (href.length > 1 && href.charAt(0) === '/' && href.charAt(1) === '/') {
      // href starts with "//" which is a full URL with the protocol dropped (use the baseURL protocol).
      return parsedURL.scheme + ':' + href as Platform.DevToolsPath.UrlString;
    }

    const securityOrigin = parsedURL.securityOrigin();
    const pathText = parsedURL.path;
    const queryText = parsedURL.queryParams ? '?' + parsedURL.queryParams : '';

    // Empty href resolves to a URL without fragment.
    if (!href.length) {
      return securityOrigin + pathText + queryText as Platform.DevToolsPath.UrlString;
    }

    if (href.charAt(0) === '#') {
      return securityOrigin + pathText + queryText + href as Platform.DevToolsPath.UrlString;
    }

    if (href.charAt(0) === '?') {
      return securityOrigin + pathText + href as Platform.DevToolsPath.UrlString;
    }

    const hrefMatches = href.match(/^[^#?]*/);
    if (!hrefMatches || !href.length) {
      throw new Error('Invalid href');
    }
    let hrefPath: string = hrefMatches[0];
    const hrefSuffix = href.substring(hrefPath.length);
    if (hrefPath.charAt(0) !== '/') {
      hrefPath = parsedURL.folderPathComponents + '/' + hrefPath;
    }
    return securityOrigin + normalizePath(hrefPath) + hrefSuffix as Platform.DevToolsPath.UrlString;
  }

  static splitLineAndColumn(string: string): {
    url: Platform.DevToolsPath.UrlString,
    lineNumber: (number|undefined),
    columnNumber: (number|undefined),
  } {
    // Only look for line and column numbers in the path to avoid matching port numbers.
    const beforePathMatch = string.match(ParsedURL.urlRegex());
    let beforePath = '';
    let pathAndAfter: string = string;
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
      return {url: string as Platform.DevToolsPath.UrlString, lineNumber: 0, columnNumber: 0};
    }

    if (typeof (lineColumnMatch[1]) === 'string') {
      lineNumber = parseInt(lineColumnMatch[1], 10);
      // Immediately convert line and column to 0-based numbers.
      lineNumber = isNaN(lineNumber) ? undefined : lineNumber - 1;
    }
    if (typeof (lineColumnMatch[2]) === 'string') {
      columnNumber = parseInt(lineColumnMatch[2], 10);
      columnNumber = isNaN(columnNumber) ? undefined : columnNumber - 1;
    }

    let url: Platform.DevToolsPath.UrlString =
        beforePath + pathAndAfter.substring(0, pathAndAfter.length - lineColumnMatch[0].length) as
        Platform.DevToolsPath.UrlString;
    if (lineColumnMatch[1] === undefined && lineColumnMatch[2] === undefined) {
      const wasmCodeOffsetRegex = /wasm-function\[\d+\]:0x([a-z0-9]+)$/g;
      const wasmCodeOffsetMatch = wasmCodeOffsetRegex.exec(pathAndAfter);
      if (wasmCodeOffsetMatch && typeof (wasmCodeOffsetMatch[1]) === 'string') {
        url = ParsedURL.removeWasmFunctionInfoFromURL(url);
        columnNumber = parseInt(wasmCodeOffsetMatch[1], 16);
        columnNumber = isNaN(columnNumber) ? undefined : columnNumber;
      }
    }

    return {url, lineNumber, columnNumber};
  }

  static removeWasmFunctionInfoFromURL(url: string): Platform.DevToolsPath.UrlString {
    const wasmFunctionRegEx = /:wasm-function\[\d+\]/;
    const wasmFunctionIndex = url.search(wasmFunctionRegEx);
    if (wasmFunctionIndex === -1) {
      return url as Platform.DevToolsPath.UrlString;
    }
    return ParsedURL.substring(url as Platform.DevToolsPath.UrlString, 0, wasmFunctionIndex);
  }

  private static beginsWithWindowsDriveLetter(url: string): boolean {
    return /^[A-Za-z]:/.test(url);
  }

  private static beginsWithScheme(url: string): boolean {
    return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(url);
  }

  static isRelativeURL(url: string): boolean {
    return !this.beginsWithScheme(url) || this.beginsWithWindowsDriveLetter(url);
  }

  get displayName(): string {
    if (this.#displayNameInternal) {
      return this.#displayNameInternal;
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

    this.#displayNameInternal = this.lastPathComponent;
    if (!this.#displayNameInternal) {
      this.#displayNameInternal = (this.host || '') + '/';
    }
    if (this.#displayNameInternal === '/') {
      this.#displayNameInternal = this.url;
    }
    return this.#displayNameInternal;
  }

  dataURLDisplayName(): string {
    if (this.#dataURLDisplayNameInternal) {
      return this.#dataURLDisplayNameInternal;
    }
    if (!this.isDataURL()) {
      return '';
    }
    this.#dataURLDisplayNameInternal = Platform.StringUtilities.trimEndWithMaxLength(this.url, 20);
    return this.#dataURLDisplayNameInternal;
  }

  isAboutBlank(): boolean {
    return this.url === 'about:blank';
  }

  isDataURL(): boolean {
    return this.scheme === 'data';
  }

  isHttpOrHttps(): boolean {
    return this.scheme === 'http' || this.scheme === 'https';
  }

  isBlobURL(): boolean {
    return this.url.startsWith('blob:');
  }

  lastPathComponentWithFragment(): string {
    return this.lastPathComponent + (this.fragment ? '#' + this.fragment : '');
  }

  domain(): string {
    if (this.isDataURL()) {
      return 'data:';
    }
    return this.host + (this.port ? ':' + this.port : '');
  }

  securityOrigin(): Platform.DevToolsPath.UrlString {
    if (this.isDataURL()) {
      return 'data:' as Platform.DevToolsPath.UrlString;
    }
    const scheme = this.isBlobURL() ? this.blobInnerScheme : this.scheme;
    return scheme + '://' + this.domain() as Platform.DevToolsPath.UrlString;
  }

  urlWithoutScheme(): string {
    if (this.scheme && this.url.startsWith(this.scheme + '://')) {
      return this.url.substring(this.scheme.length + 3);
    }
    return this.url;
  }

  static urlRegexInstance: RegExp|null = null;
}
