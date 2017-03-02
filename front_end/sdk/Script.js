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
 * @implements {Common.ContentProvider}
 * @unrestricted
 */
SDK.Script = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {string} scriptId
   * @param {string} sourceURL
   * @param {number} startLine
   * @param {number} startColumn
   * @param {number} endLine
   * @param {number} endColumn
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   * @param {string} hash
   * @param {boolean} isContentScript
   * @param {boolean} isLiveEdit
   * @param {string=} sourceMapURL
   * @param {boolean=} hasSourceURL
   */
  constructor(
      debuggerModel,
      scriptId,
      sourceURL,
      startLine,
      startColumn,
      endLine,
      endColumn,
      executionContextId,
      hash,
      isContentScript,
      isLiveEdit,
      sourceMapURL,
      hasSourceURL) {
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
    this._originalContentProvider = null;
    this._originalSource = null;
  }

  /**
   * @param {string} source
   * @return {string}
   */
  static _trimSourceURLComment(source) {
    var sourceURLIndex = source.lastIndexOf('//# sourceURL=');
    if (sourceURLIndex === -1) {
      sourceURLIndex = source.lastIndexOf('//@ sourceURL=');
      if (sourceURLIndex === -1)
        return source;
    }
    var sourceURLLineIndex = source.lastIndexOf('\n', sourceURLIndex);
    if (sourceURLLineIndex === -1)
      return source;
    var sourceURLLine = source.substr(sourceURLLineIndex + 1).split('\n', 1)[0];
    if (sourceURLLine.search(SDK.Script.sourceURLRegex) === -1)
      return source;
    return source.substr(0, sourceURLLineIndex) + source.substr(sourceURLLineIndex + sourceURLLine.length + 1);
  }

  /**
   * @param {!SDK.Script} script
   * @param {string} source
   */
  static _reportDeprecatedCommentIfNeeded(script, source) {
    var consoleModel = script.debuggerModel.target().consoleModel;
    if (!consoleModel)
      return;
    var linesToCheck = 5;
    var offset = source.lastIndexOf('\n');
    while (linesToCheck && offset !== -1) {
      offset = source.lastIndexOf('\n', offset - 1);
      --linesToCheck;
    }
    offset = offset !== -1 ? offset : 0;
    var sourceTail = source.substr(offset);
    if (sourceTail.length > 5000)
      return;
    if (sourceTail.search(/^[\040\t]*\/\/@ source(mapping)?url=/mi) === -1)
      return;
    var text = Common.UIString(
        '\'//@ sourceURL\' and \'//@ sourceMappingURL\' are deprecated, please use \'//# sourceURL=\' and \'//# sourceMappingURL=\' instead.');
    var msg = new SDK.ConsoleMessage(
        script.debuggerModel.target(), SDK.ConsoleMessage.MessageSource.JS, SDK.ConsoleMessage.MessageLevel.Warning,
        text, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        script.scriptId);
    consoleModel.addMessage(msg);
  }

  /**
   * @return {boolean}
   */
  isContentScript() {
    return this._isContentScript;
  }

  /**
   * @return {?SDK.ExecutionContext}
   */
  executionContext() {
    return this.debuggerModel.target().runtimeModel.executionContext(this._executionContextId);
  }

  /**
   * @return {boolean}
   */
  isLiveEdit() {
    return this._isLiveEdit;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this.sourceURL;
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return Common.resourceTypes.Script;
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    if (this._source)
      return Promise.resolve(this._source);
    if (!this.scriptId)
      return Promise.resolve(/** @type {?string} */ (''));

    var callback;
    var promise = new Promise(fulfill => callback = fulfill);
    this.debuggerModel.target().debuggerAgent().getScriptSource(this.scriptId, didGetScriptSource.bind(this));
    return promise;

    /**
     * @this {SDK.Script}
     * @param {?Protocol.Error} error
     * @param {string} source
     */
    function didGetScriptSource(error, source) {
      if (!error) {
        SDK.Script._reportDeprecatedCommentIfNeeded(this, source);
        this._source = SDK.Script._trimSourceURLComment(source);
      } else {
        this._source = '';
      }
      if (this._originalSource === null)
        this._originalSource = this._source;
      callback(this._source);
    }
  }

  /**
   * @return {!Common.ContentProvider}
   */
  originalContentProvider() {
    if (!this._originalContentProvider) {
      var lazyContent = () => this.requestContent().then(() => this._originalSource);
      this._originalContentProvider =
          new Common.StaticContentProvider(this.contentURL(), this.contentType(), lazyContent);
    }
    return this._originalContentProvider;
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!Protocol.Debugger.SearchMatch>)} callback
   */
  searchInContent(query, caseSensitive, isRegex, callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!Array.<!Protocol.Debugger.SearchMatch>} searchMatches
     */
    function innerCallback(error, searchMatches) {
      if (error) {
        console.error(error);
        callback([]);
        return;
      }
      var result = [];
      for (var i = 0; i < searchMatches.length; ++i) {
        var searchMatch =
            new Common.ContentProvider.SearchMatch(searchMatches[i].lineNumber, searchMatches[i].lineContent);
        result.push(searchMatch);
      }
      callback(result || []);
    }

    if (this.scriptId) {
      // Script failed to parse.
      this.debuggerModel.target().debuggerAgent().searchInContent(
          this.scriptId, query, caseSensitive, isRegex, innerCallback);
    } else {
      callback([]);
    }
  }

  /**
   * @param {string} source
   * @return {string}
   */
  _appendSourceURLCommentIfNeeded(source) {
    if (!this.hasSourceURL)
      return source;
    return source + '\n //# sourceURL=' + this.sourceURL;
  }

  /**
   * @param {string} newSource
   * @param {function(?Protocol.Error, !Protocol.Runtime.ExceptionDetails=, !Array.<!Protocol.Debugger.CallFrame>=, !Protocol.Runtime.StackTrace=, boolean=)} callback
   */
  editSource(newSource, callback) {
    /**
     * @this {SDK.Script}
     * @param {?Protocol.Error} error
     * @param {!Array.<!Protocol.Debugger.CallFrame>=} callFrames
     * @param {boolean=} stackChanged
     * @param {!Protocol.Runtime.StackTrace=} asyncStackTrace
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function didEditScriptSource(error, callFrames, stackChanged, asyncStackTrace, exceptionDetails) {
      if (!error && !exceptionDetails)
        this._source = newSource;
      var needsStepIn = !!stackChanged;
      callback(error, exceptionDetails, callFrames, asyncStackTrace, needsStepIn);
    }

    newSource = SDK.Script._trimSourceURLComment(newSource);
    // We append correct sourceURL to script for consistency only. It's not actually needed for things to work correctly.
    newSource = this._appendSourceURLCommentIfNeeded(newSource);

    if (this.scriptId) {
      this.requestContent().then(
          () => this.debuggerModel.target().debuggerAgent().setScriptSource(
              this.scriptId, newSource, undefined, didEditScriptSource.bind(this)));
    } else {
      callback('Script failed to parse');
    }
  }

  /**
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!SDK.DebuggerModel.Location}
   */
  rawLocation(lineNumber, columnNumber) {
    return new SDK.DebuggerModel.Location(this.debuggerModel, this.scriptId, lineNumber, columnNumber || 0);
  }

  /**
   * @return {boolean}
   */
  isInlineScript() {
    var startsAtZero = !this.lineOffset && !this.columnOffset;
    return !!this.sourceURL && !startsAtZero;
  }

  /**
   * @param {string} sourceMapURL
   */
  addSourceMapURL(sourceMapURL) {
    if (this.sourceMapURL)
      return;
    this.sourceMapURL = sourceMapURL;
    this.debuggerModel.dispatchEventToListeners(SDK.DebuggerModel.Events.SourceMapURLAdded, this);
  }

  /**
   * @return {boolean}
   */
  isAnonymousScript() {
    return !this.sourceURL;
  }

  /**
   * @return {boolean}
   */
  isInlineScriptWithSourceURL() {
    return !!this.hasSourceURL && this.isInlineScript();
  }

  /**
   * @param {!Array<!Protocol.Debugger.ScriptPosition>} positions
   * @return {!Promise<boolean>}
   */
  setBlackboxedRanges(positions) {
    return new Promise(setBlackboxedRanges.bind(this));

    /**
     * @param {function(?)} fulfill
     * @param {function(*)} reject
     * @this {SDK.Script}
     */
    function setBlackboxedRanges(fulfill, reject) {
      this.debuggerModel.target().debuggerAgent().setBlackboxedRanges(this.scriptId, positions, callback);
      /**
       * @param {?Protocol.Error} error
       */
      function callback(error) {
        if (error)
          console.error(error);
        fulfill(!error);
      }
    }
  }
};

SDK.Script.sourceURLRegex = /^[\040\t]*\/\/[@#] sourceURL=\s*(\S*?)\s*$/m;
