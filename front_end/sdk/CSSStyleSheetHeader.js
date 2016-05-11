// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!CSSAgent.CSSStyleSheetHeader} payload
 */
WebInspector.CSSStyleSheetHeader = function(cssModel, payload)
{
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

WebInspector.CSSStyleSheetHeader.prototype = {
    /**
     * @return {!WebInspector.ContentProvider}
     */
    originalContentProvider: function()
    {
        if (!this._originalContentProvider) {
            var originalContentPromise = this._cssModel.originalStyleSheetText(this);
            this._originalContentProvider = new WebInspector.StaticContentProvider(this.contentURL(), this.contentType(), originalContentPromise);
        }
        return this._originalContentProvider;
    },

    /**
     * @param {string=} sourceMapURL
     */
    setSourceMapURL: function(sourceMapURL)
    {
        var completeSourceMapURL = this.sourceURL && sourceMapURL ? WebInspector.ParsedURL.completeURL(this.sourceURL, sourceMapURL) : null;
        this.sourceMapURL = completeSourceMapURL;
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._cssModel.target();
    },

    /**
     * @return {!WebInspector.CSSModel}
     */
    cssModel: function()
    {
        return this._cssModel;
    },

    /**
     * @return {string}
     */
    resourceURL: function()
    {
        return this.isViaInspector() ? this._viaInspectorResourceURL() : this.sourceURL;
    },

    /**
     * @return {string}
     */
    _viaInspectorResourceURL: function()
    {
        var frame = this._cssModel.target().resourceTreeModel.frameForId(this.frameId);
        console.assert(frame);
        var parsedURL = new WebInspector.ParsedURL(frame.url);
        var fakeURL = "inspector://" + parsedURL.host + parsedURL.folderPathComponents;
        if (!fakeURL.endsWith("/"))
            fakeURL += "/";
        fakeURL += "inspector-stylesheet";
        return fakeURL;
    },

    /**
     * @param {number} lineNumberInStyleSheet
     * @return {number}
     */
    lineNumberInSource: function(lineNumberInStyleSheet)
    {
        return this.startLine + lineNumberInStyleSheet;
    },

    /**
     * @param {number} lineNumberInStyleSheet
     * @param {number} columnNumberInStyleSheet
     * @return {number|undefined}
     */
    columnNumberInSource: function(lineNumberInStyleSheet, columnNumberInStyleSheet)
    {
        return (lineNumberInStyleSheet ? 0 : this.startColumn) + columnNumberInStyleSheet;
    },

    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this.resourceURL();
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return WebInspector.resourceTypes.Stylesheet;
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        return /** @type {!Promise<?string>} */(this._cssModel.getStyleSheetText(this.id));
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        function performSearch(content)
        {
            callback(WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex));
        }

        // searchInContent should call back later.
        this.requestContent().then(performSearch);
    },

    /**
     * @return {boolean}
     */
    isViaInspector: function()
    {
        return this.origin === "inspector";
    }
}

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.CSSStyleSheetHeader} header
 */
WebInspector.CSSStyleSheetHeader.OriginalContentProvider = function(header)
{
    this._header = header;
}

WebInspector.CSSStyleSheetHeader.OriginalContentProvider.prototype = {
    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this._header.contentURL();
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return this._header.contentType();
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        return /** @type {!Promise<?string>} */(this._header.cssModel().originalStyleSheetText(this._header));
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        /**
         * @param {?string} content
         */
        function performSearch(content)
        {
            var searchResults = content ? WebInspector.ContentProvider.performSearchInContent(content, query, caseSensitive, isRegex) : [];
            callback(searchResults);
        }

        this.requestContent().then(performSearch);
    }
}