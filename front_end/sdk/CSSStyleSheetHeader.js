// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {WebInspector.ContentProvider}
 * @unrestricted
 */
WebInspector.CSSStyleSheetHeader = class {
  /**
   * @param {!WebInspector.CSSModel} cssModel
   * @param {!Protocol.CSS.CSSStyleSheetHeader} payload
   */
  constructor(cssModel, payload) {
    this._cssModel = cssModel;
    this.id = payload.styleSheetId;
    this.frameId = payload.frameId;
    this.sourceURL = payload.sourceURL;
    this.hasSourceURL = !!payload.hasSourceURL;
    this.origin = payload.origin;
    this.title = payload.title;
    this.disabled = payload.disabled;
    this.isInline = payload.isInline;
    this.startLine = payload.startLine;
    this.startColumn = payload.startColumn;
    if (payload.ownerNode)
      this.ownerNode = new WebInspector.DeferredDOMNode(cssModel.target(), payload.ownerNode);
    this.setSourceMapURL(payload.sourceMapURL);
  }

  /**
   * @return {!WebInspector.ContentProvider}
   */
  originalContentProvider() {
    if (!this._originalContentProvider) {
      var lazyContent = this._cssModel.originalStyleSheetText.bind(this._cssModel, this);
      this._originalContentProvider =
          new WebInspector.StaticContentProvider(this.contentURL(), this.contentType(), lazyContent);
    }
    return this._originalContentProvider;
  }

  /**
   * @param {string=} sourceMapURL
   */
  setSourceMapURL(sourceMapURL) {
    var completeSourceMapURL = this.sourceURL && sourceMapURL ?
        WebInspector.ParsedURL.completeURL(this.sourceURL, sourceMapURL) :
        sourceMapURL;
    this.sourceMapURL = completeSourceMapURL;
  }

  /**
   * @return {!WebInspector.Target}
   */
  target() {
    return this._cssModel.target();
  }

  /**
   * @return {!WebInspector.CSSModel}
   */
  cssModel() {
    return this._cssModel;
  }

  /**
   * @return {string}
   */
  resourceURL() {
    return this.isViaInspector() ? this._viaInspectorResourceURL() : this.sourceURL;
  }

  /**
   * @return {string}
   */
  _viaInspectorResourceURL() {
    var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(this.target());
    var frame = resourceTreeModel.frameForId(this.frameId);
    console.assert(frame);
    var parsedURL = new WebInspector.ParsedURL(frame.url);
    var fakeURL = 'inspector://' + parsedURL.host + parsedURL.folderPathComponents;
    if (!fakeURL.endsWith('/'))
      fakeURL += '/';
    fakeURL += 'inspector-stylesheet';
    return fakeURL;
  }

  /**
   * @param {number} lineNumberInStyleSheet
   * @return {number}
   */
  lineNumberInSource(lineNumberInStyleSheet) {
    return this.startLine + lineNumberInStyleSheet;
  }

  /**
   * @param {number} lineNumberInStyleSheet
   * @param {number} columnNumberInStyleSheet
   * @return {number|undefined}
   */
  columnNumberInSource(lineNumberInStyleSheet, columnNumberInStyleSheet) {
    return (lineNumberInStyleSheet ? 0 : this.startColumn) + columnNumberInStyleSheet;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this.resourceURL();
  }

  /**
   * @override
   * @return {!WebInspector.ResourceType}
   */
  contentType() {
    return WebInspector.resourceTypes.Stylesheet;
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return /** @type {!Promise<?string>} */ (this._cssModel.getStyleSheetText(this.id));
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
   */
  searchInContent(query, caseSensitive, isRegex, callback) {
    function performSearch(content) {
      callback(WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex));
    }

    // searchInContent should call back later.
    this.requestContent().then(performSearch);
  }

  /**
   * @return {boolean}
   */
  isViaInspector() {
    return this.origin === 'inspector';
  }
};

/**
 * @implements {WebInspector.ContentProvider}
 * @unrestricted
 */
WebInspector.CSSStyleSheetHeader.OriginalContentProvider = class {
  /**
   * @param {!WebInspector.CSSStyleSheetHeader} header
   */
  constructor(header) {
    this._header = header;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._header.contentURL();
  }

  /**
   * @override
   * @return {!WebInspector.ResourceType}
   */
  contentType() {
    return this._header.contentType();
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return /** @type {!Promise<?string>} */ (this._header.cssModel().originalStyleSheetText(this._header));
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
     * @param {?string} content
     */
    function performSearch(content) {
      var searchResults =
          content ? WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex) : [];
      callback(searchResults);
    }

    this.requestContent().then(performSearch);
  }
};
