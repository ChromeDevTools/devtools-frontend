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

/**
 * @constructor
 * @implements {WebInspector.CSSSourceMapping}
 * @param {!WebInspector.CSSStyleModel} cssModel
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 * @param {!WebInspector.NetworkProject} networkProject
 */
WebInspector.SASSSourceMapping = function(cssModel, workspace, networkMapping, networkProject)
{
    this.pollPeriodMs = 30 * 1000;
    this.pollIntervalMs = 200;
    this._cssModel = cssModel;
    this._workspace = workspace;
    this._networkProject = networkProject;
    this._addingRevisionCounter = 0;
    this._reset();
    WebInspector.fileManager.addEventListener(WebInspector.FileManager.EventTypes.SavedURL, this._fileSaveFinished, this);
    WebInspector.settings.cssSourceMapsEnabled.addChangeListener(this._toggleSourceMapSupport, this);
    this._cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetChanged, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeContentCommitted, this._uiSourceCodeContentCommitted, this);
    this._workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._reset, this);
    this._networkMapping = networkMapping;
}

WebInspector.SASSSourceMapping.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetChanged: function(event)
    {
        var id = /** @type {!CSSAgent.StyleSheetId} */ (event.data.styleSheetId);
        if (this._addingRevisionCounter) {
            --this._addingRevisionCounter;
            return;
        }
        var header = this._cssModel.styleSheetHeaderForId(id);
        if (!header)
            return;

        this.removeHeader(header);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _toggleSourceMapSupport: function(event)
    {
        var enabled = /** @type {boolean} */ (event.data);
        var headers = this._cssModel.styleSheetHeaders();
        for (var i = 0; i < headers.length; ++i) {
            if (enabled)
                this.addHeader(headers[i]);
            else
                this.removeHeader(headers[i]);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _fileSaveFinished: function(event)
    {
        var sassURL = /** @type {string} */ (event.data);
        this._sassFileSaved(sassURL, false);
    },

    /**
     * @param {string} headerName
     * @param {!Object.<string, string>} headers
     * @return {?string}
     */
    _headerValue: function(headerName, headers)
    {
        headerName = headerName.toLowerCase();
        var value = null;
        for (var name in headers) {
            if (name.toLowerCase() === headerName) {
                value = headers[name];
                break;
            }
        }
        return value;
    },

    /**
     * @param {!Object.<string, string>} headers
     * @return {?Date}
     */
    _lastModified: function(headers)
    {
        var lastModifiedHeader = this._headerValue("last-modified", headers);
        if (!lastModifiedHeader)
            return null;
        var lastModified = new Date(lastModifiedHeader);
        if (isNaN(lastModified.getTime()))
            return null;
        return lastModified;
    },

    /**
     * @param {!Object.<string, string>} headers
     * @param {string} url
     * @return {?Date}
     */
    _checkLastModified: function(headers, url)
    {
        var lastModified = this._lastModified(headers);
        if (lastModified)
            return lastModified;

        var etagMessage = this._headerValue("etag", headers) ? ", \"ETag\" response header found instead" : "";
        var message = String.sprintf("The \"Last-Modified\" response header is missing or invalid for %s%s. The CSS auto-reload functionality will not work correctly.", url, etagMessage);
        WebInspector.console.log(message);
        return null;
    },

    /**
     * @param {string} sassURL
     * @param {boolean} wasLoadedFromFileSystem
     */
    _sassFileSaved: function(sassURL, wasLoadedFromFileSystem)
    {
        var cssURLs = this._cssURLsForSASSURL[sassURL];
        if (!cssURLs)
            return;
        if (!WebInspector.settings.cssReloadEnabled.get())
            return;

        var sassFile = this._networkMapping.uiSourceCodeForURL(sassURL, this._cssModel.target());
        console.assert(sassFile);
        if (wasLoadedFromFileSystem)
            sassFile.requestMetadata(metadataReceived.bind(this));
        else
            WebInspector.NetworkManager.loadResourceForFrontend(sassURL, null, sassLoadedViaNetwork.bind(this));

        /**
         * @param {number} statusCode
         * @param {!Object.<string, string>} headers
         * @param {string} content
         * @this {WebInspector.SASSSourceMapping}
         */
        function sassLoadedViaNetwork(statusCode, headers, content)
        {
            if (statusCode >= 400) {
                console.error("Could not load content for " + sassURL + " : " + "HTTP status code: " + statusCode);
                return;
            }
            var lastModified = this._checkLastModified(headers, sassURL);
            if (!lastModified)
                return;
            metadataReceived.call(this, lastModified);
        }

        /**
         * @param {?Date} timestamp
         * @this {WebInspector.SASSSourceMapping}
         */
        function metadataReceived(timestamp)
        {
            if (!timestamp)
                return;

            var now = Date.now();
            var deadlineMs = now + this.pollPeriodMs;
            var pollData = this._pollDataForSASSURL[sassURL];
            if (pollData) {
                var dataByURL = pollData.dataByURL;
                for (var url in dataByURL)
                    clearTimeout(dataByURL[url].timer);
            }
            pollData = { dataByURL: {}, deadlineMs: deadlineMs, sassTimestamp: timestamp };
            this._pollDataForSASSURL[sassURL] = pollData;
            for (var i = 0; i < cssURLs.length; ++i) {
                pollData.dataByURL[cssURLs[i]] = { previousPoll: now };
                this._pollCallback(cssURLs[i], sassURL, false);
            }
        }
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     * @param {boolean} stopPolling
     */
    _pollCallback: function(cssURL, sassURL, stopPolling)
    {
        var now;
        var pollData = this._pollDataForSASSURL[sassURL];
        if (!pollData)
            return;

        if (stopPolling) {
            this._stopPolling(cssURL, sassURL);
            return;
        }

        if ((now = new Date().getTime()) > pollData.deadlineMs) {
            WebInspector.console.warn(WebInspector.UIString("%s hasn't been updated in %d seconds.", cssURL, this.pollPeriodMs / 1000));
            this._stopPolling(cssURL, sassURL);
            return;
        }
        var nextPoll = this.pollIntervalMs + pollData.dataByURL[cssURL].previousPoll;
        var remainingTimeoutMs = Math.max(0, nextPoll - now);
        pollData.dataByURL[cssURL].previousPoll = now + remainingTimeoutMs;
        pollData.dataByURL[cssURL].timer = setTimeout(this._reloadCSS.bind(this, cssURL, sassURL, this._pollCallback.bind(this)), remainingTimeoutMs);
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     */
    _stopPolling: function(cssURL, sassURL)
    {
        var pollData = this._pollDataForSASSURL[sassURL];
        delete pollData.dataByURL[cssURL];
        if (!Object.keys(pollData.dataByURL).length)
            delete this._pollDataForSASSURL[sassURL];
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     * @param {function(string, string, boolean)} callback
     */
    _reloadCSS: function(cssURL, sassURL, callback)
    {
        var cssUISourceCode = this._networkMapping.uiSourceCodeForURL(cssURL, this._cssModel.target());
        if (!cssUISourceCode) {
            WebInspector.console.warn(WebInspector.UIString("%s resource missing. Please reload the page.", cssURL));
            callback(cssURL, sassURL, true);
            return;
        }

        if (this._networkMapping.hasMappingForURL(sassURL))
            this._reloadCSSFromFileSystem(cssUISourceCode, sassURL, callback);
        else
            this._reloadCSSFromNetwork(cssUISourceCode, sassURL, callback);
    },

    /**
     * @param {!WebInspector.UISourceCode} cssUISourceCode
     * @param {string} sassURL
     * @param {function(string, string, boolean)} callback
     */
    _reloadCSSFromNetwork: function(cssUISourceCode, sassURL, callback)
    {
        var cssURL = this._networkMapping.networkURL(cssUISourceCode);
        var data = this._pollDataForSASSURL[sassURL];
        if (!data) {
            callback(cssURL, sassURL, true);
            return;
        }
        var headers = { "if-modified-since": new Date(data.sassTimestamp.getTime() - 1000).toUTCString() };
        WebInspector.NetworkManager.loadResourceForFrontend(cssURL, headers, contentLoaded.bind(this));

        /**
         * @param {number} statusCode
         * @param {!Object.<string, string>} headers
         * @param {string} content
         * @this {WebInspector.SASSSourceMapping}
         */
        function contentLoaded(statusCode, headers, content)
        {
            if (statusCode >= 400) {
                console.error("Could not load content for " + cssURL + " : " + "HTTP status code: " + statusCode);
                callback(cssURL, sassURL, true);
                return;
            }
            if (!this._pollDataForSASSURL[sassURL]) {
                callback(cssURL, sassURL, true);
                return;
            }
            if (statusCode === 304) {
                callback(cssURL, sassURL, false);
                return;
            }
            var lastModified = this._checkLastModified(headers, cssURL);
            if (!lastModified) {
                callback(cssURL, sassURL, true);
                return;
            }
            if (lastModified.getTime() < data.sassTimestamp.getTime()) {
                callback(cssURL, sassURL, false);
                return;
            }
            this._updateCSSRevision(cssUISourceCode, content, sassURL, callback);
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} cssUISourceCode
     * @param {string} content
     * @param {string} sassURL
     * @param {function(string, string, boolean)} callback
     */
    _updateCSSRevision: function(cssUISourceCode, content, sassURL, callback)
    {
        ++this._addingRevisionCounter;
        cssUISourceCode.addRevision(content);
        var networkURL = this._networkMapping.networkURL(cssUISourceCode);
        this._cssUISourceCodeUpdated(networkURL, sassURL, callback);
    },

    /**
     * @param {!WebInspector.UISourceCode} cssUISourceCode
     * @param {string} sassURL
     * @param {function(string, string, boolean)} callback
     */
    _reloadCSSFromFileSystem: function(cssUISourceCode, sassURL, callback)
    {
        cssUISourceCode.requestMetadata(metadataCallback.bind(this));

        /**
         * @param {?Date} timestamp
         * @this {WebInspector.SASSSourceMapping}
         */
        function metadataCallback(timestamp)
        {
            var cssURL = this._networkMapping.networkURL(cssUISourceCode);
            if (!timestamp) {
                callback(cssURL, sassURL, false);
                return;
            }
            var cssTimestamp = timestamp.getTime();
            var pollData = this._pollDataForSASSURL[sassURL];
            if (!pollData) {
                callback(cssURL, sassURL, true);
                return;
            }

            if (cssTimestamp < pollData.sassTimestamp.getTime()) {
                callback(cssURL, sassURL, false);
                return;
            }

            cssUISourceCode.requestOriginalContent(contentCallback.bind(this));

            /**
             * @param {?string} content
             * @this {WebInspector.SASSSourceMapping}
             */
            function contentCallback(content)
            {
                // Empty string is a valid value, null means error.
                if (content === null)
                    return;
                this._updateCSSRevision(cssUISourceCode, content, sassURL, callback);
            }
        }
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     * @param {function(string, string, boolean)} callback
     */
    _cssUISourceCodeUpdated: function(cssURL, sassURL, callback)
    {
        var completeSourceMapURL = this._completeSourceMapURLForCSSURL[cssURL];
        if (!completeSourceMapURL)
            return;
        var ids = this._cssModel.styleSheetIdsForURL(cssURL);
        if (!ids)
            return;
        var headers = [];
        for (var i = 0; i < ids.length; ++i)
            headers.push(this._cssModel.styleSheetHeaderForId(ids[i]));
        for (var i = 0; i < ids.length; ++i)
            this._loadSourceMapAndBindUISourceCode(headers, true, completeSourceMapURL);
        callback(cssURL, sassURL, true);
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    addHeader: function(header)
    {
        if (!header.sourceMapURL || !header.sourceURL || !WebInspector.settings.cssSourceMapsEnabled.get())
            return;
        var completeSourceMapURL = WebInspector.ParsedURL.completeURL(header.sourceURL, header.sourceMapURL);
        if (!completeSourceMapURL)
            return;
        this._completeSourceMapURLForCSSURL[header.sourceURL] = completeSourceMapURL;
        this._loadSourceMapAndBindUISourceCode([header], false, completeSourceMapURL);
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        var sourceURL = header.sourceURL;
        if (!sourceURL || !header.sourceMapURL || !this._completeSourceMapURLForCSSURL[sourceURL])
            return;
        delete this._sourceMapByStyleSheetURL[sourceURL];
        delete this._completeSourceMapURLForCSSURL[sourceURL];
        for (var sassURL in this._cssURLsForSASSURL) {
            var urls = this._cssURLsForSASSURL[sassURL];
            urls.remove(sourceURL);
            if (!urls.length)
                delete this._cssURLsForSASSURL[sassURL];
        }
        var completeSourceMapURL = WebInspector.ParsedURL.completeURL(sourceURL, header.sourceMapURL);
        if (completeSourceMapURL)
            delete this._sourceMapByURL[completeSourceMapURL];
        WebInspector.cssWorkspaceBinding.updateLocations(header);
    },

    /**
     * @param {!Array.<!WebInspector.CSSStyleSheetHeader>} headersWithSameSourceURL
     * @param {boolean} forceRebind
     * @param {string} completeSourceMapURL
     */
    _loadSourceMapAndBindUISourceCode: function(headersWithSameSourceURL, forceRebind, completeSourceMapURL)
    {
        console.assert(headersWithSameSourceURL.length);
        var sourceURL = headersWithSameSourceURL[0].sourceURL;
        this._loadSourceMapForStyleSheet(completeSourceMapURL, sourceURL, forceRebind, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.SASSSourceMapping}
         */
        function sourceMapLoaded(sourceMap)
        {
            if (!sourceMap)
                return;

            this._sourceMapByStyleSheetURL[sourceURL] = sourceMap;
            for (var i = 0; i < headersWithSameSourceURL.length; ++i) {
                if (forceRebind)
                    WebInspector.cssWorkspaceBinding.updateLocations(headersWithSameSourceURL[i]);
                else
                    this._bindUISourceCode(headersWithSameSourceURL[i], sourceMap);
            }
        }
    },

    /**
     * @param {string} cssURL
     * @param {string} sassURL
     */
    _addCSSURLforSASSURL: function(cssURL, sassURL)
    {
        var cssURLs;
        if (this._cssURLsForSASSURL.hasOwnProperty(sassURL))
            cssURLs = this._cssURLsForSASSURL[sassURL];
        else {
            cssURLs = [];
            this._cssURLsForSASSURL[sassURL] = cssURLs;
        }
        if (cssURLs.indexOf(cssURL) === -1)
            cssURLs.push(cssURL);
    },

    /**
     * @param {string} completeSourceMapURL
     * @param {string} completeStyleSheetURL
     * @param {boolean} forceReload
     * @param {function(?WebInspector.SourceMap)} callback
     */
    _loadSourceMapForStyleSheet: function(completeSourceMapURL, completeStyleSheetURL, forceReload, callback)
    {
        var sourceMap = this._sourceMapByURL[completeSourceMapURL];
        if (sourceMap && !forceReload) {
            callback(sourceMap);
            return;
        }

        var pendingCallbacks = this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
        if (pendingCallbacks) {
            pendingCallbacks.push(callback);
            return;
        }

        pendingCallbacks = [callback];
        this._pendingSourceMapLoadingCallbacks[completeSourceMapURL] = pendingCallbacks;

        WebInspector.SourceMap.load(completeSourceMapURL, completeStyleSheetURL, sourceMapLoaded.bind(this));

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.SASSSourceMapping}
         */
        function sourceMapLoaded(sourceMap)
        {
            var callbacks = this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
            delete this._pendingSourceMapLoadingCallbacks[completeSourceMapURL];
            if (!callbacks)
                return;
            if (sourceMap)
                this._sourceMapByURL[completeSourceMapURL] = sourceMap;
            else
                delete this._sourceMapByURL[completeSourceMapURL];
            for (var i = 0; i < callbacks.length; ++i)
                callbacks[i](sourceMap);
        }
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @param {!WebInspector.SourceMap} sourceMap
     */
    _bindUISourceCode: function(header, sourceMap)
    {
        WebInspector.cssWorkspaceBinding.pushSourceMapping(header, this);
        var rawURL = header.sourceURL;
        var sources = sourceMap.sources();
        for (var i = 0; i < sources.length; ++i) {
            var url = sources[i];
            this._addCSSURLforSASSURL(rawURL, url);
            if (!this._networkMapping.hasMappingForURL(url) && !this._networkMapping.uiSourceCodeForURL(url, header.target())) {
                var contentProvider = sourceMap.sourceContentProvider(url, WebInspector.resourceTypes.Stylesheet);
                this._networkProject.addFileForURL(url, contentProvider);
            }
        }
    },

    /**
     * @override
     * @param {!WebInspector.CSSLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var entry;
        var sourceMap = this._sourceMapByStyleSheetURL[rawLocation.url];
        if (!sourceMap)
            return null;
        entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
        if (!entry || entry.length === 2)
            return null;
        var uiSourceCode = this._networkMapping.uiSourceCodeForURL(entry[2], rawLocation.target());
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(entry[3], entry[4]);
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!WebInspector.CSSLocation}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        // FIXME: Implement this when ui -> raw mapping has clients.
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        return new WebInspector.CSSLocation(this._cssModel.target(), null, networkURL || "", lineNumber, columnNumber);
    },

    /**
     * @override
     * @return {boolean}
     */
    isIdentity: function()
    {
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        return true;
    },

    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._cssModel.target();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        var cssURLs = this._cssURLsForSASSURL[networkURL];
        if (!cssURLs)
            return;
        for (var i = 0; i < cssURLs.length; ++i) {
            var ids = this._cssModel.styleSheetIdsForURL(cssURLs[i]);
            for (var j = 0; j < ids.length; ++j) {
                var header = this._cssModel.styleSheetHeaderForId(ids[j]);
                console.assert(header);
                WebInspector.cssWorkspaceBinding.updateLocations(/** @type {!WebInspector.CSSStyleSheetHeader} */ (header));
            }
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeContentCommitted: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data.uiSourceCode);
        if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem) {
            var networkURL = this._networkMapping.networkURL(uiSourceCode);
            this._sassFileSaved(networkURL, true);
        }
    },

    _reset: function()
    {
        this._addingRevisionCounter = 0;
        this._completeSourceMapURLForCSSURL = {};
        this._cssURLsForSASSURL = {};
        /** @type {!Object.<string, !Array.<function(?WebInspector.SourceMap)>>} */
        this._pendingSourceMapLoadingCallbacks = {};
        /** @type {!Object.<string, !{deadlineMs: number, dataByURL: !Object.<string, !{timer: number, previousPoll: number}>}>} */
        this._pollDataForSASSURL = {};
        /** @type {!Object.<string, !WebInspector.SourceMap>} */
        this._sourceMapByURL = {};
        this._sourceMapByStyleSheetURL = {};
    }
}
