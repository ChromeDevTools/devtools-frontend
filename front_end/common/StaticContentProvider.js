// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.ContentProvider}
 * @unrestricted
 */
WebInspector.StaticContentProvider = class {
  /**
   * @param {string} contentURL
   * @param {!WebInspector.ResourceType} contentType
   * @param {function():!Promise<string>} lazyContent
   */
  constructor(contentURL, contentType, lazyContent) {
    this._contentURL = contentURL;
    this._contentType = contentType;
    this._lazyContent = lazyContent;
  }

  /**
   * @param {string} contentURL
   * @param {!WebInspector.ResourceType} contentType
   * @param {string} content
   * @return {!WebInspector.StaticContentProvider}
   */
  static fromString(contentURL, contentType, content) {
    var lazyContent = () => Promise.resolve(content);
    return new WebInspector.StaticContentProvider(contentURL, contentType, lazyContent);
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._contentURL;
  }

  /**
   * @override
   * @return {!WebInspector.ResourceType}
   */
  contentType() {
    return this._contentType;
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return /** @type {!Promise<?string>} */ (this._lazyContent());
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
   */
  searchInContent(query, caseSensitive, isRegex, callback) {
    /**
     * @param {string} content
     */
    function performSearch(content) {
      callback(WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex));
    }

    this._lazyContent().then(performSearch);
  }
};


