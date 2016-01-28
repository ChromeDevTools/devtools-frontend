// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.CSSStyleModel} cssModel
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 */
WebInspector.SASSWorkspaceAdapter = function(cssModel, workspace, networkMapping)
{
    this._workspace = workspace;
    this._networkMapping = networkMapping;
    this._cssModel = cssModel;

    /** @type {!Map<string, number>} */
    this._versions = new Map();
    /** @type {!Map<string, !Promise<boolean>>} */
    this._awaitingPromises = new Map();
    /** @type {!Map<string, function(boolean)>} */
    this._awaitingFulfills = new Map();

    /** @type {!Multimap<string, !WebInspector.SourceMapTracker>} */
    this._urlToTrackers = new Multimap();
    /** @type {!Set<string>} */
    this._cssURLs = new Set();

    this._eventListeners = [
        this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this),
        this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this),
        this._workspace.addEventListener(WebInspector.Workspace.Events.WorkingCopyChanged, this._uiSourceCodeChanged, this),
        this._workspace.addEventListener(WebInspector.Workspace.Events.WorkingCopyCommitted, this._uiSourceCodeChanged, this),
        this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
        this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this),
        this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetChanged, this)
    ];
}

/**
 * @constructor
 * @param {string} url
 * @param {number} version
 * @param {string} text
 */
WebInspector.SASSWorkspaceAdapter.ContentResponse = function(url, version, text)
{
    this.url = url;
    this.version = version;
    this.text = text;
}

WebInspector.SASSWorkspaceAdapter.prototype = {
    /**
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {!WebInspector.SourceMapTracker}
     */
    trackSources: function(sourceMap)
    {
        var cssURL = sourceMap.compiledURL();
        this._cssURLs.add(cssURL);

        var allSources = new Set(sourceMap.sources().concat(cssURL));
        for (var sourceURL of allSources) {
            if (this._versions.has(sourceURL))
                continue;
            this._versions.set(sourceURL, 1);
            var promise = new Promise(fulfill => this._awaitingFulfills.set(sourceURL, fulfill));
            this._awaitingPromises.set(sourceURL, promise);
            var contentProvider = sourceURL === cssURL ? this._headersForURL(sourceURL).peekLast() : this._sassUISourceCode(sourceURL);
            if (contentProvider)
                this._contentProviderAdded(sourceURL);
        }

        var tracker = new WebInspector.SourceMapTracker(this, sourceMap);
        for (var sourceURL of tracker.allURLs())
            this._urlToTrackers.set(sourceURL, tracker);
        return tracker;
    },

    /**
     * @param {!WebInspector.SourceMapTracker} tracker
     */
    _stopTrackSources: function(tracker)
    {
        for (var sourceURL of tracker.allURLs()) {
            this._urlToTrackers.remove(sourceURL, tracker);
            if (!this._urlToTrackers.has(sourceURL)) {
                this._awaitingFulfills.get(sourceURL).call(null, false);
                this._awaitingFulfills.delete(sourceURL);
                this._awaitingPromises.delete(sourceURL);
                this._versions.delete(sourceURL);
                this._cssURLs.delete(sourceURL);
            }
        }
    },

    /**
     * @param {string} url
     * @return {?WebInspector.UISourceCode}
     */
    _sassUISourceCode: function(url)
    {
        return this._networkMapping.uiSourceCodeForURLForAnyTarget(url);
    },

    /**
     * @param {string} url
     * @return {!Array<!WebInspector.CSSStyleSheetHeader>}
     */
    _headersForURL: function(url)
    {
        return this._cssModel.styleSheetIdsForURL(url)
            .map(styleSheetId => this._cssModel.styleSheetHeaderForId(styleSheetId));
    },

    /**
     * @param {string} url
     */
    _contentProviderAdded: function(url)
    {
        this._awaitingFulfills.get(url).call(null, true);
    },

    /**
     * @param {string} url
     */
    _contentProviderRemoved: function(url)
    {
        var trackers = new Set(this._urlToTrackers.get(url));
        for (var tracker of trackers)
            tracker.dispose();
    },

    /**
     * @param {string} url
     * @return {boolean}
     */
    _isSASSURL: function(url)
    {
        return this._versions.has(url) && !this._cssURLs.has(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */(event.data);
        var url = this._networkMapping.networkURL(uiSourceCode);
        if (!this._isSASSURL(url))
            return;
        this._contentProviderAdded(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */(event.data);
        var url = this._networkMapping.networkURL(uiSourceCode);
        if (!this._isSASSURL(url))
            return;
        this._contentProviderRemoved(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetAdded: function(event)
    {
        var styleSheetHeader = /** @type {!WebInspector.CSSStyleSheetHeader} */(event.data);
        var url = styleSheetHeader.sourceURL;
        if (!this._cssURLs.has(url))
            return;
        this._contentProviderAdded(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetRemoved: function(event)
    {
        var styleSheetHeader = /** @type {!WebInspector.CSSStyleSheetHeader} */(event.data);
        var url = styleSheetHeader.sourceURL;
        if (!this._cssURLs.has(url))
            return;
        var headers = this._headersForURL(url);
        if (headers.length)
            return;
        this._contentProviderRemoved(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeChanged: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */(event.data.uiSourceCode);
        var url = this._networkMapping.networkURL(uiSourceCode);
        if (!this._isSASSURL(url))
            return;
        this._newContentAvailable(url);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetChanged: function(event)
    {
        var styleSheetId = /** @type {!CSSAgent.StyleSheetId} */(event.data.styleSheetId);
        var styleSheetHeader = this._cssModel.styleSheetHeaderForId(styleSheetId);
        var url = styleSheetHeader.sourceURL;
        if (!this._cssURLs.has(url))
            return;
        this._newContentAvailable(url);
    },

    /**
     * @param {string} url
     */
    _newContentAvailable: function(url)
    {
        console.assert(this._versions.has(url), "The '" + url + "' is not tracked.")
        var newVersion = this._versions.get(url) + 1;
        this._versions.set(url, newVersion);
        for (var tracker of this._urlToTrackers.get(url))
            tracker._newContentAvailable(url, newVersion);
    },

    /**
     * @param {string} url
     * @return {number}
     */
    _urlVersion: function(url)
    {
        var version = this._versions.get(url);
        console.assert(version, "The '" + url + "' is not tracked.")
        return version || 0;
    },

    /**
     * @param {string} url
     * @return {!Promise<?WebInspector.SASSWorkspaceAdapter.ContentResponse>}
     */
    _getContent: function(url)
    {
        console.assert(this._awaitingPromises.has(url), "The '" + url + "' is not tracked.")
        return this._awaitingPromises.get(url)
            .then(onContentProviderResolved.bind(this));

        /**
         * @param {boolean} success
         * @return {!Promise<?WebInspector.SASSWorkspaceAdapter.ContentResponse>}
         * @this {WebInspector.SASSWorkspaceAdapter}
         */
        function onContentProviderResolved(success)
        {
            if (!success)
                return Promise.resolve(/** @type {?WebInspector.SASSWorkspaceAdapter.ContentResponse} */(null));
            var contentProvider = this._cssURLs.has(url) ? this._headersForURL(url).peekLast() : this._sassUISourceCode(url);
            if (!contentProvider)
                return Promise.resolve(/** @type {?WebInspector.SASSWorkspaceAdapter.ContentResponse} */(null));
            return contentProvider.requestContent()
                .then(text => new WebInspector.SASSWorkspaceAdapter.ContentResponse(url, /** @type {number} */(this._versions.get(url)), text || ""));
        }
    },

    /**
     * @param {string} url
     * @param {string} text
     * @return {?WebInspector.SASSWorkspaceAdapter.ContentResponse}
     */
    _setSASSText: function(url, text)
    {
        console.assert(this._isSASSURL(url), "The url '" + url + "' should be a tracked SASS url");
        var uiSourceCode = this._sassUISourceCode(url);
        if (!uiSourceCode)
            return null;
        setImmediate(() => uiSourceCode.addRevision(text));
        var futureVersion = this._versions.get(url) + 1;
        return new WebInspector.SASSWorkspaceAdapter.ContentResponse(url, futureVersion, text);
    },

    /**
     * @param {string} url
     * @param {string} text
     * @param {!Array<!WebInspector.SourceEdit>} cssEdits
     * @return {?WebInspector.SASSWorkspaceAdapter.ContentResponse}
     */
    _setCSSText: function(url, text, cssEdits)
    {
        console.assert(this._cssURLs.has(url), "The url '" + url + "' should be a tracked CSS url");
        var headers = this._headersForURL(url);
        if (!headers.length)
            return null;
        for (var i = 0; i < headers.length; ++i)
            this._cssModel.setStyleSheetText(headers[i].id, text, true);
        for (var i = cssEdits.length - 1; i >= 0; --i) {
            var edit = cssEdits[i];
            var oldRange = edit.oldRange;
            var newRange = edit.newRange();
            for (var j = 0; j < headers.length; ++j) {
                this._cssModel.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.ExternalRangeEdit, {
                    styleSheetId: headers[j].id,
                    oldRange: oldRange,
                    newRange: newRange
                });
            }
        }
        var futureVersion = this._versions.get(url) + headers.length;
        return new WebInspector.SASSWorkspaceAdapter.ContentResponse(url, futureVersion, text);
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.SASSWorkspaceAdapter} adapter
 * @param {!WebInspector.SourceMap} sourceMap
 */
WebInspector.SourceMapTracker = function(adapter, sourceMap)
{
    WebInspector.Object.call(this);
    this._adapter = adapter;
    this._sourceMap = sourceMap;
    this._cssURL = sourceMap.compiledURL();
    this._sassURLs = sourceMap.sources().slice();
    this._allURLs = this._sassURLs.concat(this._cssURL);
    this._terminated = false;
    this._versions = new Map();
    for (var url of this._allURLs)
        this._versions.set(url, adapter._urlVersion(url));
}

/** @enum {string} */
WebInspector.SourceMapTracker.Events = {
    SourceChanged: "SourceChanged",
    TrackingStopped: "TrackingStopped"
}

WebInspector.SourceMapTracker.prototype = {
    /**
     * @return {!WebInspector.SourceMap}
     */
    sourceMap: function()
    {
        return this._sourceMap;
    },

    /**
     * @return {!Array<string>}
     */
    allURLs: function()
    {
        return this._allURLs;
    },

    /**
     * @return {string}
     */
    cssURL: function()
    {
        return this._cssURL;
    },

    /**
     * @return {!Array<string>}
     */
    sassURLs: function()
    {
        return this._sassURLs;
    },

    /**
     * @return {boolean}
     */
    isOutdated: function()
    {
        if (this._terminated)
            return true;
        for (var url of this._allURLs) {
            if (this._adapter._urlVersion(url) > this._versions.get(url))
                return true;
        }
        return false;
    },

    /**
     * @param {string} text
     * @param {!Array<!WebInspector.SourceEdit>} edits
     * @return {boolean}
     */
    setCSSText: function(text, edits)
    {
        if (this._terminated || this.isOutdated())
            return false;
        var result = this._adapter._setCSSText(this._cssURL, text, edits);
        this._handleContentResponse(result);
        return !!result;
    },

    /**
     * @param {string} url
     * @param {string} text
     * @return {boolean}
     */
    setSASSText: function(url, text)
    {
        if (this._terminated || this.isOutdated())
            return false;
        var result = this._adapter._setSASSText(url, text);
        this._handleContentResponse(result);
        return !!result;
    },

    /**
     * @param {?WebInspector.SASSWorkspaceAdapter.ContentResponse} contentResponse
     * @return {?string}
     */
    _handleContentResponse: function(contentResponse)
    {
        if (!contentResponse)
            return null;
        this._versions.set(contentResponse.url, contentResponse.version);
        return contentResponse.text;
    },

    /**
     * @param {string} url
     * @return {!Promise<string>}
     */
    content: function(url)
    {
        return this._adapter._getContent(url)
            .then(this._handleContentResponse.bind(this))
            .then(text => text || "");
    },

    dispose: function()
    {
        if (this._terminated)
            return;
        this._terminated = true;
        this._adapter._stopTrackSources(this);
        this.dispatchEventToListeners(WebInspector.SourceMapTracker.Events.TrackingStopped);
    },

    /**
     * @param {string} url
     * @param {number} newVersion
     */
    _newContentAvailable: function(url, newVersion)
    {
        if (this._versions.get(url) < newVersion)
            this.dispatchEventToListeners(WebInspector.SourceMapTracker.Events.SourceChanged, url);
    },

    __proto__: WebInspector.Object.prototype
}
