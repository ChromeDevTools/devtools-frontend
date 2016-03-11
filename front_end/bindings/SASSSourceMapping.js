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
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!WebInspector.NetworkMapping} networkMapping
 * @param {!WebInspector.NetworkProject} networkProject
 */
WebInspector.SASSSourceMapping = function(cssModel, networkMapping, networkProject)
{
    this._cssModel = cssModel;
    this._networkProject = networkProject;
    this._reset();
    WebInspector.moduleSetting("cssSourceMapsEnabled").addChangeListener(this._toggleSourceMapSupport, this);
    this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetChanged, this._styleSheetChanged, this);
    cssModel.target().resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._reset, this);
    this._networkMapping = networkMapping;
}

WebInspector.SASSSourceMapping.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetChanged: function(event)
    {
        var id = /** @type {!CSSAgent.StyleSheetId} */ (event.data.styleSheetId);
        var header = this._cssModel.styleSheetHeaderForId(id);
        if (!header)
            return;
        this.removeHeader(header);
        this.addHeader(header);
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
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    addHeader: function(header)
    {
        if (!header.sourceMapURL || !header.sourceURL || !WebInspector.moduleSetting("cssSourceMapsEnabled").get())
            return;
        var completeSourceMapURL = WebInspector.ParsedURL.completeURL(header.sourceURL, header.sourceMapURL);
        if (!completeSourceMapURL)
            return;
        this._loadSourceMap(completeSourceMapURL, header)
            .then(sourceMapLoaded.bind(this));

        /**
         * @this {WebInspector.SASSSourceMapping}
         */
        function sourceMapLoaded()
        {
            WebInspector.cssWorkspaceBinding.pushSourceMapping(header, this);
        }

    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        if (!header.sourceURL)
            return;
        this._sourceMapByStyleSheetURL.delete(header.sourceURL);
        WebInspector.cssWorkspaceBinding.updateLocations(header);
    },

    /**
     * @param {string} completeSourceMapURL
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {!Promise}
     */
    _loadSourceMap: function(completeSourceMapURL, header)
    {
        var loadingPromise = this._sourceMapLoadingPromises.get(completeSourceMapURL);
        if (!loadingPromise) {
            loadingPromise = WebInspector.SourceMap.load(completeSourceMapURL, header.sourceURL)
                .then(sourceMapLoaded.bind(this));
            this._sourceMapLoadingPromises.set(completeSourceMapURL, loadingPromise);
        }

        return loadingPromise;

        /**
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.SASSSourceMapping}
         */
        function sourceMapLoaded(sourceMap)
        {
            if (!sourceMap) {
                this._sourceMapLoadingPromises.delete(completeSourceMapURL);
                this._sourceMapByStyleSheetURL.delete(header.sourceURL);
                return;
            }

            this._sourceMapByStyleSheetURL.set(header.sourceURL, sourceMap);

            // Report sources.
            var sources = sourceMap.sources();
            for (var sassURL of sourceMap.sources()) {
                if (!this._networkMapping.hasMappingForNetworkURL(sassURL)) {
                    var contentProvider = sourceMap.sourceContentProvider(sassURL, WebInspector.resourceTypes.SourceMapStyleSheet);
                    this._networkProject.addFileForURL(sassURL, contentProvider, WebInspector.ResourceTreeFrame.fromStyleSheet(header));
                }
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
        var sourceMap = this._sourceMapByStyleSheetURL.get(rawLocation.url);
        if (!sourceMap)
            return null;
        var entry = sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
        if (!entry || !entry.sourceURL)
            return null;
        var uiSourceCode = this._networkMapping.uiSourceCodeForStyleURL(entry.sourceURL, rawLocation.header());
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(entry.sourceLineNumber || 0, entry.sourceColumnNumber);
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.CSSLocation}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        return null;
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

    _reset: function()
    {
        /** @type {!Map<string, !Promise>} */
        this._sourceMapLoadingPromises = new Map();
        /** @type {!Map<string, !WebInspector.SourceMap>} */
        this._sourceMapByStyleSheetURL = new Map();
    }
}
