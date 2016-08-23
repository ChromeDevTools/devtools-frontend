/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {string} scriptId
 * @param {string} sourceURL
 * @param {number} startLine
 * @param {number} startColumn
 * @param {number} endLine
 * @param {number} endColumn
 * @param {!RuntimeAgent.ExecutionContextId} executionContextId
 * @param {string} hash
 * @param {boolean} isContentScript
 * @param {boolean} isLiveEdit
 * @param {string=} sourceMapURL
 * @param {boolean=} hasSourceURL
 */
WebInspector.Script = function(debuggerModel, scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash, isContentScript, isLiveEdit, sourceMapURL, hasSourceURL)
{
    WebInspector.SDKObject.call(this, debuggerModel.target());
    this.debuggerModel = debuggerModel;
    this.scriptId = scriptId;
    this.sourceURL = sourceURL;
    this.lineOffset = startLine;
    this.columnOffset = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
    this._executionContextId = executionContextId;
    this.hash = hash;
    this._isContentScript = isContentScript;
    this._isLiveEdit = isLiveEdit;
    this.sourceMapURL = sourceMapURL;
    this.hasSourceURL = hasSourceURL;
}

/** @enum {symbol} */
WebInspector.Script.Events = {
    ScriptEdited: Symbol("ScriptEdited"),
    SourceMapURLAdded: Symbol("SourceMapURLAdded")
}

WebInspector.Script.sourceURLRegex = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;

/**
 * @param {string} source
 * @return {string}
 */
WebInspector.Script._trimSourceURLComment = function(source)
{
    var sourceURLIndex = source.lastIndexOf("//# sourceURL=");
    if (sourceURLIndex === -1) {
        sourceURLIndex = source.lastIndexOf("//@ sourceURL=");
        if (sourceURLIndex === -1)
            return source;
    }
    var sourceURLLineIndex = source.lastIndexOf("\n", sourceURLIndex);
    if (sourceURLLineIndex === -1)
        return source;
    var sourceURLLine = source.substr(sourceURLLineIndex + 1).split("\n", 1)[0];
    if (sourceURLLine.search(WebInspector.Script.sourceURLRegex) === -1)
        return source;
    return source.substr(0, sourceURLLineIndex) + source.substr(sourceURLLineIndex + sourceURLLine.length + 1);
}

/**
 * @param {!WebInspector.Script} script
 * @param {string} source
 */
WebInspector.Script._reportDeprecatedCommentIfNeeded = function(script, source)
{
    var consoleModel = script.target().consoleModel;
    if (!consoleModel)
        return;
    var linesToCheck = 5;
    var offset = source.lastIndexOf("\n");
    while (linesToCheck && offset !== -1) {
        offset = source.lastIndexOf("\n", offset - 1);
        --linesToCheck;
    }
    offset = offset !== -1 ? offset : 0;
    var sourceTail = source.substr(offset);
    if (sourceTail.length > 5000)
        return;
    if (sourceTail.search(/^[\040\t]*\/\/@ source(mapping)?url=/mi) === -1)
        return;
    var text = WebInspector.UIString("'//@ sourceURL' and '//@ sourceMappingURL' are deprecated, please use '//# sourceURL=' and '//# sourceMappingURL=' instead.");
    var msg = new WebInspector.ConsoleMessage(script.target(), WebInspector.ConsoleMessage.MessageSource.JS, WebInspector.ConsoleMessage.MessageLevel.Warning, text, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, script.scriptId);
    consoleModel.addMessage(msg);
}

WebInspector.Script.prototype = {
    /**
     * @return {boolean}
     */
    isContentScript: function()
    {
        return this._isContentScript;
    },

    /**
     * @return {?WebInspector.ExecutionContext}
     */
    executionContext: function()
    {
        return this.target().runtimeModel.executionContext(this._executionContextId);
    },

    /**
     * @return {boolean}
     */
    isLiveEdit: function()
    {
        return this._isLiveEdit;
    },

    /**
     * @override
     * @return {string}
     */
    contentURL: function()
    {
        return this.sourceURL;
    },

    /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
    contentType: function()
    {
        return WebInspector.resourceTypes.Script;
    },

    /**
     * @override
     * @return {!Promise<?string>}
     */
    requestContent: function()
    {
        if (this._source)
            return Promise.resolve(this._source);
        if (!this.scriptId)
            return Promise.resolve(/** @type {?string} */(""));

        var callback;
        var promise = new Promise(fulfill => callback = fulfill);
        this.target().debuggerAgent().getScriptSource(this.scriptId, didGetScriptSource.bind(this));
        return promise;

        /**
         * @this {WebInspector.Script}
         * @param {?Protocol.Error} error
         * @param {string} source
         */
        function didGetScriptSource(error, source)
        {
            if (!error) {
                WebInspector.Script._reportDeprecatedCommentIfNeeded(this, source);
                this._source = WebInspector.Script._trimSourceURLComment(source);
            } else {
                this._source = "";
            }
            callback(this._source);
        }
    },

    /**
     * @override
     * @param {string} query
     * @param {boolean} caseSensitive
     * @param {boolean} isRegex
     * @param {function(!Array.<!DebuggerAgent.SearchMatch>)} callback
     */
    searchInContent: function(query, caseSensitive, isRegex, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<!DebuggerAgent.SearchMatch>} searchMatches
         */
        function innerCallback(error, searchMatches)
        {
            if (error) {
                console.error(error);
                callback([]);
                return;
            }
            var result = [];
            for (var i = 0; i < searchMatches.length; ++i) {
                var searchMatch = new WebInspector.ContentProvider.SearchMatch(searchMatches[i].lineNumber, searchMatches[i].lineContent);
                result.push(searchMatch);
            }
            callback(result || []);
        }

        if (this.scriptId) {
            // Script failed to parse.
            this.target().debuggerAgent().searchInContent(this.scriptId, query, caseSensitive, isRegex, innerCallback);
        } else {
            callback([]);
        }
    },

    /**
     * @param {string} source
     * @return {string}
     */
    _appendSourceURLCommentIfNeeded: function(source)
    {
        if (!this.hasSourceURL)
            return source;
        return source + "\n //# sourceURL=" + this.sourceURL;
    },

    /**
     * @param {string} newSource
     * @param {function(?Protocol.Error, !RuntimeAgent.ExceptionDetails=, !Array.<!DebuggerAgent.CallFrame>=, !RuntimeAgent.StackTrace=, boolean=)} callback
     */
    editSource: function(newSource, callback)
    {
        /**
         * @this {WebInspector.Script}
         * @param {?Protocol.Error} error
         * @param {!Array.<!DebuggerAgent.CallFrame>=} callFrames
         * @param {boolean=} stackChanged
         * @param {!RuntimeAgent.StackTrace=} asyncStackTrace
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         */
        function didEditScriptSource(error, callFrames, stackChanged, asyncStackTrace, exceptionDetails)
        {
            if (!error && !exceptionDetails)
                this._source = newSource;
            var needsStepIn = !!stackChanged;
            callback(error, exceptionDetails, callFrames, asyncStackTrace, needsStepIn);
        }

        newSource = WebInspector.Script._trimSourceURLComment(newSource);
        // We append correct sourceURL to script for consistency only. It's not actually needed for things to work correctly.
        newSource = this._appendSourceURLCommentIfNeeded(newSource);

        if (this.scriptId)
            this.target().debuggerAgent().setScriptSource(this.scriptId, newSource, undefined, didEditScriptSource.bind(this));
        else
            callback("Script failed to parse");
    },

    /**
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @return {!WebInspector.DebuggerModel.Location}
     */
    rawLocation: function(lineNumber, columnNumber)
    {
        return new WebInspector.DebuggerModel.Location(this.debuggerModel, this.scriptId, lineNumber, columnNumber || 0);
    },

    /**
     * @return {boolean}
     */
    isInlineScript: function()
    {
        var startsAtZero = !this.lineOffset && !this.columnOffset;
        return !!this.sourceURL && !startsAtZero;
    },

    /**
     * @param {string} sourceMapURL
     */
    addSourceMapURL: function(sourceMapURL)
    {
        if (this.sourceMapURL)
            return;
        this.sourceMapURL = sourceMapURL;
        this.dispatchEventToListeners(WebInspector.Script.Events.SourceMapURLAdded, this.sourceMapURL);
    },

    /**
     * @return {boolean}
     */
    isAnonymousScript: function()
    {
        return !this.sourceURL;
    },

    /**
     * @return {boolean}
     */
    isInlineScriptWithSourceURL: function()
    {
        return !!this.hasSourceURL && this.isInlineScript();
    },

    /**
     * @param {!Array<!DebuggerAgent.ScriptPosition>} positions
     * @return {!Promise<boolean>}
     */
    setBlackboxedRanges: function(positions)
    {
        return new Promise(setBlackboxedRanges.bind(this));

        /**
         * @param {function(?)} fulfill
         * @param {function(*)} reject
         * @this {WebInspector.Script}
         */
        function setBlackboxedRanges(fulfill, reject)
        {
            this.target().debuggerAgent().setBlackboxedRanges(this.scriptId, positions, callback);
            /**
             * @param {?Protocol.Error} error
             */
            function callback(error)
            {
                if (error)
                    console.error(error);
                fulfill(!error);
            }
        }
    },

    __proto__: WebInspector.SDKObject.prototype
}
