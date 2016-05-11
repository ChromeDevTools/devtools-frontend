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
    this._networkMapping = networkMapping;
    this._cssModel.addEventListener(WebInspector.CSSModel.Events.SourceMapAttached, this._sourceMapAttached, this);
    this._cssModel.addEventListener(WebInspector.CSSModel.Events.SourceMapDetached, this._sourceMapDetached, this);
    this._cssModel.addEventListener(WebInspector.CSSModel.Events.SourceMapChanged, this._sourceMapChanged, this);
}

WebInspector.SASSSourceMapping.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _sourceMapAttached: function(event)
    {
        var header = /** @type {!WebInspector.CSSStyleSheetHeader} */ (event.data);
        var sourceMap = this._cssModel.sourceMapForHeader(header);
        for (var sassURL of sourceMap.sourceURLs()) {
            if (!this._networkMapping.hasMappingForNetworkURL(sassURL)) {
                var contentProvider = sourceMap.sourceContentProvider(sassURL, WebInspector.resourceTypes.SourceMapStyleSheet);
                this._networkProject.addFile(contentProvider, WebInspector.ResourceTreeFrame.fromStyleSheet(header));
            }
        }
        WebInspector.cssWorkspaceBinding.updateLocations(header);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceMapDetached: function(event)
    {
        var header = /** @type {!WebInspector.CSSStyleSheetHeader} */(event.data);
        WebInspector.cssWorkspaceBinding.updateLocations(header);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceMapChanged: function(event)
    {
        var sourceMap = /** @type {!WebInspector.SourceMap} */(event.data.sourceMap);
        var newSources = /** @type {!Map<string, string>} */(event.data.newSources);
        var headers = this._cssModel.headersForSourceMap(sourceMap);
        var handledUISourceCodes = new Set();
        for (var header of headers) {
            WebInspector.cssWorkspaceBinding.updateLocations(header);
            for (var sourceURL of newSources.keys()) {
                var uiSourceCode = this._networkMapping.uiSourceCodeForStyleURL(sourceURL, header);
                if (!uiSourceCode) {
                    console.error("Failed to update source for " + sourceURL);
                    continue;
                }
                if (handledUISourceCodes.has(uiSourceCode))
                    continue;
                handledUISourceCodes.add(uiSourceCode);
                var sassText = /** @type {string} */(newSources.get(sourceURL));
                uiSourceCode.setWorkingCopy(sassText);
            }
        }
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    addHeader: function(header)
    {
        if (!header.sourceMapURL)
            return;
        WebInspector.cssWorkspaceBinding.pushSourceMapping(header, this);
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    removeHeader: function(header)
    {
        if (!header.sourceMapURL)
            return;
        WebInspector.cssWorkspaceBinding.updateLocations(header);
    },

    /**
     * @override
     * @param {!WebInspector.CSSLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var sourceMap = this._cssModel.sourceMapForHeader(rawLocation.header());
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
    }
}
