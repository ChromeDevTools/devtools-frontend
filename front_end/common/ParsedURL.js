/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Common.ParsedURL = class {
  /**
   * @param {string} url
   */
  constructor(url) {
    this.isValid = false;
    this.url = url;
    this.scheme = '';
    this.host = '';
    this.port = '';
    this.path = '';
    this.queryParams = '';
    this.fragment = '';
    this.folderPathComponents = '';
    this.lastPathComponent = '';

    var match = url.match(Common.ParsedURL._urlRegex());
    if (match) {
      this.isValid = true;
      this.scheme = match[1].toLowerCase();
      this.host = match[2];
      this.port = match[3];
      this.path = match[4] || '/';
      this.queryParams = match[5] || '';
      this.fragment = match[6];
    } else {
      if (this.url.startsWith('data:')) {
        this.scheme = 'data';
        return;
      }
      if (this.url === 'about:blank') {
        this.scheme = 'about';
        return;
      }
      this.path = this.url;
    }

    var lastSlashIndex = this.path.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      this.folderPathComponents = this.path.substring(0, lastSlashIndex);
      this.lastPathComponent = this.path.substring(lastSlashIndex + 1);
    } else {
      this.lastPathComponent = this.path;
    }
  }

  /**
   * @param {string} fileSystemPath
   * @return {string}
   */
  static platformPathToURL(fileSystemPath) {
    fileSystemPath = fileSystemPath.replace(/\\/g, '/');
    if (!fileSystemPath.startsWith('file://')) {
      if (fileSystemPath.startsWith('/'))
        fileSystemPath = 'file://' + fileSystemPath;
      else
        fileSystemPath = 'file:///' + fileSystemPath;
    }
    return fileSystemPath;
  }

  /**
   * @return {!RegExp}
   */
  static _urlRegex() {
    if (Common.ParsedURL._urlRegexInstance)
      return Common.ParsedURL._urlRegexInstance;
    // RegExp groups:
    // 1 - scheme (using the RFC3986 grammar)
    // 2 - hostname
    // 3 - ?port
    // 4 - ?path
    // 5 - ?query
    // 6 - ?fragment
    var schemeRegex = /([A-Za-z][A-Za-z0-9+.-]*):\/\//;
    var hostRegex = /([^\s\/:]*)/;
    var portRegex = /(?::([\d]+))?/;
    var pathRegex = /(\/[^#?]*)?/;
    var queryRegex = /(?:\?([^#]*))?/;
    var fragmentRegex = /(?:#(.*))?/;

    Common.ParsedURL._urlRegexInstance = new RegExp(
        '^' + schemeRegex.source + hostRegex.source + portRegex.source + pathRegex.source + queryRegex.source +
        fragmentRegex.source + '$');
    return Common.ParsedURL._urlRegexInstance;
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static extractPath(url) {
    var parsedURL = url.asParsedURL();
    return parsedURL ? parsedURL.path : '';
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static extractOrigin(url) {
    var parsedURL = url.asParsedURL();
    return parsedURL ? parsedURL.securityOrigin() : '';
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static extractExtension(url) {
    var lastIndexOfDot = url.lastIndexOf('.');
    var extension = lastIndexOfDot !== -1 ? url.substr(lastIndexOfDot + 1) : '';
    var indexOfQuestionMark = extension.indexOf('?');
    if (indexOfQuestionMark !== -1)
      extension = extension.substr(0, indexOfQuestionMark);
    return extension;
  }

  /**
   * @param {string} url
   * @return {string}
   */
  static extractName(url) {
    var index = url.lastIndexOf('/');
    return index !== -1 ? url.substr(index + 1) : url;
  }

  /**
   * @param {string} baseURL
   * @param {string} href
   * @return {?string}
   */
  static completeURL(baseURL, href) {
    // Return special URLs as-is.
    var trimmedHref = href.trim();
    if (trimmedHref.startsWith('data:') || trimmedHref.startsWith('blob:') || trimmedHref.startsWith('javascript:'))
      return href;

    // Return absolute URLs as-is.
    var parsedHref = trimmedHref.asParsedURL();
    if (parsedHref && parsedHref.scheme)
      return trimmedHref;

    var parsedURL = baseURL.asParsedURL();
    if (!parsedURL)
      return null;

    if (parsedURL.isDataURL())
      return href;

    if (href.length > 1 && href.charAt(0) === '/' && href.charAt(1) === '/') {
      // href starts with "//" which is a full URL with the protocol dropped (use the baseURL protocol).
      return parsedURL.scheme + ':' + href;
    }

    var securityOrigin = parsedURL.securityOrigin();
    var pathText = parsedURL.path;
    var queryText = parsedURL.queryParams ? '?' + parsedURL.queryParams : '';

    // Empty href resolves to a URL without fragment.
    if (!href.length)
      return securityOrigin + pathText + queryText;

    if (href.charAt(0) === '#')
      return securityOrigin + pathText + queryText + href;

    if (href.charAt(0) === '?')
      return securityOrigin + pathText + href;

    var hrefPath = href.match(/^[^#?]*/)[0];
    var hrefSuffix = href.substring(hrefPath.length);
    if (hrefPath.charAt(0) !== '/')
      hrefPath = parsedURL.folderPathComponents + '/' + hrefPath;
    return securityOrigin + Runtime.normalizePath(hrefPath) + hrefSuffix;
  }

  /**
   * @param {string} string
   * @return {!{url: string, lineNumber: (number|undefined), columnNumber: (number|undefined)}}
   */
  static splitLineAndColumn(string) {
    var lineColumnRegEx = /(?::(\d+))?(?::(\d+))?$/;
    var lineColumnMatch = lineColumnRegEx.exec(string);
    var lineNumber;
    var columnNumber;
    console.assert(lineColumnMatch);

    if (typeof(lineColumnMatch[1]) === 'string') {
      lineNumber = parseInt(lineColumnMatch[1], 10);
      // Immediately convert line and column to 0-based numbers.
      lineNumber = isNaN(lineNumber) ? undefined : lineNumber - 1;
    }
    if (typeof(lineColumnMatch[2]) === 'string') {
      columnNumber = parseInt(lineColumnMatch[2], 10);
      columnNumber = isNaN(columnNumber) ? undefined : columnNumber - 1;
    }

    return {
      url: string.substring(0, string.length - lineColumnMatch[0].length),
      lineNumber: lineNumber,
      columnNumber: columnNumber
    };
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static isRelativeURL(url) {
    return !(/^[A-Za-z][A-Za-z0-9+.-]*:/.test(url));
  }

  get displayName() {
    if (this._displayName)
      return this._displayName;

    if (this.isDataURL())
      return this.dataURLDisplayName();
    if (this.isAboutBlank())
      return this.url;

    this._displayName = this.lastPathComponent;
    if (!this._displayName)
      this._displayName = (this.host || '') + '/';
    if (this._displayName === '/')
      this._displayName = this.url;
    return this._displayName;
  }

  /**
   * @return {string}
   */
  dataURLDisplayName() {
    if (this._dataURLDisplayName)
      return this._dataURLDisplayName;
    if (!this.isDataURL())
      return '';
    this._dataURLDisplayName = this.url.trimEnd(20);
    return this._dataURLDisplayName;
  }

  /**
   * @return {boolean}
   */
  isAboutBlank() {
    return this.url === 'about:blank';
  }

  /**
   * @return {boolean}
   */
  isDataURL() {
    return this.scheme === 'data';
  }

  /**
   * @return {string}
   */
  lastPathComponentWithFragment() {
    return this.lastPathComponent + (this.fragment ? '#' + this.fragment : '');
  }

  /**
   * @return {string}
   */
  domain() {
    if (this.isDataURL())
      return 'data:';
    return this.host + (this.port ? ':' + this.port : '');
  }

  /**
   * @return {string}
   */
  securityOrigin() {
    if (this.isDataURL())
      return 'data:';
    return this.scheme + '://' + this.domain();
  }

  /**
   * @return {string}
   */
  urlWithoutScheme() {
    if (this.scheme && this.url.startsWith(this.scheme + '://'))
      return this.url.substring(this.scheme.length + 3);
    return this.url;
  }
};


/**
 * @return {?Common.ParsedURL}
 */
String.prototype.asParsedURL = function() {
  var parsedURL = new Common.ParsedURL(this.toString());
  if (parsedURL.isValid)
    return parsedURL;
  return null;
};
