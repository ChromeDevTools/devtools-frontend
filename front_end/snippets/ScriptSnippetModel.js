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
 * @extends {WebInspector.Object}
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.Workspace} workspace
 */
WebInspector.ScriptSnippetModel = function(workspace) {
  this._workspace = workspace;
  /** @type {!Object.<string, !WebInspector.UISourceCode>} */
  this._uiSourceCodeForSnippetId = {};
  /** @type {!Map.<!WebInspector.UISourceCode, string>} */
  this._snippetIdForUISourceCode = new Map();

  /** @type {!Map.<!WebInspector.Target, !WebInspector.SnippetScriptMapping>} */
  this._mappingForTarget = new Map();
  this._snippetStorage = new WebInspector.SnippetStorage('script', 'Script snippet #');
  this._lastSnippetEvaluationIndexSetting =
      WebInspector.settings.createSetting('lastSnippetEvaluationIndex', 0);
  this._project = new WebInspector.SnippetsProject(workspace, this);
  this._loadSnippets();
  WebInspector.targetManager.observeTargets(this);
};

WebInspector.ScriptSnippetModel.snippetSourceURLPrefix = 'snippets:///';


WebInspector.ScriptSnippetModel.prototype = {
  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded: function(target) {
    var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    if (debuggerModel)
      this._mappingForTarget.set(
          target, new WebInspector.SnippetScriptMapping(debuggerModel, this));
  },

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved: function(target) {
    if (WebInspector.DebuggerModel.fromTarget(target))
      this._mappingForTarget.remove(target);
  },

  /**
     * @param {!WebInspector.Target} target
     * @return {!WebInspector.SnippetScriptMapping|undefined}
     */
  snippetScriptMapping: function(target) { return this._mappingForTarget.get(target); },

  /**
     * @return {!WebInspector.Project}
     */
  project: function() { return this._project; },

  _loadSnippets: function() {
    for (var snippet of this._snippetStorage.snippets())
      this._addScriptSnippet(snippet);
  },

  /**
     * @param {string} content
     * @return {!WebInspector.UISourceCode}
     */
  createScriptSnippet: function(content) {
    var snippet = this._snippetStorage.createSnippet();
    snippet.content = content;
    return this._addScriptSnippet(snippet);
  },

  /**
     * @param {!WebInspector.Snippet} snippet
     * @return {!WebInspector.UISourceCode}
     */
  _addScriptSnippet: function(snippet) {
    var uiSourceCode =
        this._project.addSnippet(snippet.name, new WebInspector.SnippetContentProvider(snippet));
    uiSourceCode.addEventListener(
        WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this._snippetIdForUISourceCode.set(uiSourceCode, snippet.id);
    var breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    this._uiSourceCodeForSnippetId[snippet.id] = uiSourceCode;
    return uiSourceCode;
  },

  /**
   * @param {!WebInspector.Event} event
   */
  _workingCopyChanged: function(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.target);
    this._scriptSnippetEdited(uiSourceCode);
  },

  /**
   * @param {string} url
   */
  deleteScriptSnippet: function(url) {
    var uiSourceCode = this._project.uiSourceCodeForURL(url);
    if (!uiSourceCode)
      return;
    var snippetId = this._snippetIdForUISourceCode.get(uiSourceCode) || '';
    var snippet = this._snippetStorage.snippetForId(snippetId);
    if (!snippet)
      return;
    this._snippetStorage.deleteSnippet(snippet);
    this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    delete this._uiSourceCodeForSnippetId[snippet.id];
    this._snippetIdForUISourceCode.remove(uiSourceCode);
    this._project.removeFile(snippet.name);
  },

  /**
   * @param {string} name
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  renameScriptSnippet: function(name, newName, callback) {
    newName = newName.trim();
    if (!newName || newName.indexOf('/') !== -1 || name === newName ||
        this._snippetStorage.snippetForName(newName)) {
      callback(false);
      return;
    }
    var snippet = this._snippetStorage.snippetForName(name);
    console.assert(snippet, 'Snippet \'' + name + '\' was not found.');
    var uiSourceCode = this._uiSourceCodeForSnippetId[snippet.id];
    console.assert(uiSourceCode, 'No uiSourceCode was found for snippet \'' + name + '\'.');

    var breakpointLocations = this._removeBreakpoints(uiSourceCode);
    snippet.name = newName;
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    callback(true, newName);
  },

  /**
   * @param {string} name
   * @param {string} newContent
   */
  _setScriptSnippetContent: function(name, newContent) {
    var snippet = this._snippetStorage.snippetForName(name);
    snippet.content = newContent;
  },

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _scriptSnippetEdited: function(uiSourceCode) {
    var breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    this._mappingForTarget.valuesArray().forEach(function(mapping) {
      mapping._restoreBreakpoints(uiSourceCode, breakpointLocations);
    });
  },

  /**
     * @return {number}
     */
  _nextEvaluationIndex: function() {
    var evaluationIndex = this._lastSnippetEvaluationIndexSetting.get() + 1;
    this._lastSnippetEvaluationIndexSetting.set(evaluationIndex);
    return evaluationIndex;
  },

  /**
   * @param {!WebInspector.ExecutionContext} executionContext
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  evaluateScriptSnippet: function(executionContext, uiSourceCode) {
    var breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);

    var target = executionContext.target();
    var runtimeModel = target.runtimeModel;
    var evaluationIndex = this._nextEvaluationIndex();
    var mapping = this._mappingForTarget.get(target);
    mapping._setEvaluationIndex(evaluationIndex, uiSourceCode);
    var evaluationUrl = mapping._evaluationSourceURL(uiSourceCode);
    uiSourceCode.requestContent().then(compileSnippet.bind(this));

    /**
     * @this {WebInspector.ScriptSnippetModel}
     */
    function compileSnippet() {
      var expression = uiSourceCode.workingCopy();
      WebInspector.console.show();
      runtimeModel.compileScript(
          expression, '', true, executionContext.id, compileCallback.bind(this));
    }

    /**
     * @param {!RuntimeAgent.ScriptId=} scriptId
     * @param {?RuntimeAgent.ExceptionDetails=} exceptionDetails
     * @this {WebInspector.ScriptSnippetModel}
     */
    function compileCallback(scriptId, exceptionDetails) {
      var mapping = this._mappingForTarget.get(target);
      if (mapping.evaluationIndex(uiSourceCode) !== evaluationIndex)
        return;

      var script = /** @type {!WebInspector.Script} */ (executionContext.debuggerModel.scriptForId(
          /** @type {string} */ (scriptId || exceptionDetails.scriptId)));
      mapping._addScript(script, uiSourceCode);
      if (!scriptId) {
        this._printRunOrCompileScriptResultFailure(
            target, /** @type {!RuntimeAgent.ExceptionDetails} */ (exceptionDetails),
            evaluationUrl);
        return;
      }

      var breakpointLocations = this._removeBreakpoints(uiSourceCode);
      this._restoreBreakpoints(uiSourceCode, breakpointLocations);

      this._runScript(scriptId, executionContext, evaluationUrl);
    }
  },

  /**
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {!WebInspector.ExecutionContext} executionContext
   * @param {?string=} sourceURL
   */
  _runScript: function(scriptId, executionContext, sourceURL) {
    var target = executionContext.target();
    target.runtimeModel.runScript(
        scriptId, executionContext.id, 'console', /* silent */ false,
        /* includeCommandLineAPI */ true, /* returnByValue */ false, /* generatePreview */ true,
        /* awaitPromise */ undefined, runCallback.bind(this, target));

    /**
     * @param {!WebInspector.Target} target
     * @param {?RuntimeAgent.RemoteObject} result
     * @param {?RuntimeAgent.ExceptionDetails=} exceptionDetails
     * @this {WebInspector.ScriptSnippetModel}
     */
    function runCallback(target, result, exceptionDetails) {
      if (!exceptionDetails)
        this._printRunScriptResult(target, result, scriptId, sourceURL);
      else
        this._printRunOrCompileScriptResultFailure(target, exceptionDetails, sourceURL);
    }
  },

  /**
   * @param {!WebInspector.Target} target
   * @param {?RuntimeAgent.RemoteObject} result
   * @param {!RuntimeAgent.ScriptId} scriptId
   * @param {?string=} sourceURL
   */
  _printRunScriptResult: function(target, result, scriptId, sourceURL) {
    var consoleMessage = new WebInspector.ConsoleMessage(
        target, WebInspector.ConsoleMessage.MessageSource.JS,
        WebInspector.ConsoleMessage.MessageLevel.Log, '', undefined, sourceURL, undefined,
        undefined, undefined, [result], undefined, undefined, undefined, scriptId);
    target.consoleModel.addMessage(consoleMessage);
  },

  /**
   * @param {!WebInspector.Target} target
   * @param {!RuntimeAgent.ExceptionDetails} exceptionDetails
   * @param {?string=} sourceURL
   */
  _printRunOrCompileScriptResultFailure: function(target, exceptionDetails, sourceURL) {
    target.consoleModel.addMessage(WebInspector.ConsoleMessage.fromException(
        target, exceptionDetails, undefined, undefined, sourceURL || undefined));
  },

  /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!{breakpoint: !WebInspector.BreakpointManager.Breakpoint, uiLocation: !WebInspector.UILocation}>}
     */
  _removeBreakpoints: function(uiSourceCode) {
    var breakpointLocations =
        WebInspector.breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
    for (var i = 0; i < breakpointLocations.length; ++i)
      breakpointLocations[i].breakpoint.remove();
    return breakpointLocations;
  },

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!Array.<!{breakpoint: !WebInspector.BreakpointManager.Breakpoint, uiLocation:
   * !WebInspector.UILocation}>} breakpointLocations
   */
  _restoreBreakpoints: function(uiSourceCode, breakpointLocations) {
    for (var i = 0; i < breakpointLocations.length; ++i) {
      var uiLocation = breakpointLocations[i].uiLocation;
      var breakpoint = breakpointLocations[i].breakpoint;
      WebInspector.breakpointManager.setBreakpoint(
          uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, breakpoint.condition(),
          breakpoint.enabled());
    }
  },

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _releaseSnippetScript: function(uiSourceCode) {
    this._mappingForTarget.valuesArray().forEach(function(mapping) {
      mapping._releaseSnippetScript(uiSourceCode);
    });
  },

  /**
     * @param {string} sourceURL
     * @return {?string}
     */
  _snippetIdForSourceURL: function(sourceURL) {
    var snippetPrefix = WebInspector.ScriptSnippetModel.snippetSourceURLPrefix;
    if (!sourceURL.startsWith(snippetPrefix))
      return null;
    var splitURL = sourceURL.substring(snippetPrefix.length).split('_');
    var snippetId = splitURL[0];
    return snippetId;
  },

  __proto__: WebInspector.Object.prototype
};

/**
 * @constructor
 * @implements {WebInspector.DebuggerSourceMapping}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.ScriptSnippetModel} scriptSnippetModel
 */
WebInspector.SnippetScriptMapping = function(debuggerModel, scriptSnippetModel) {
  this._target = debuggerModel.target();
  this._debuggerModel = debuggerModel;
  this._scriptSnippetModel = scriptSnippetModel;
  /** @type {!Object.<string, !WebInspector.UISourceCode>} */
  this._uiSourceCodeForScriptId = {};
  /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.Script>} */
  this._scriptForUISourceCode = new Map();
  /** @type {!Map.<!WebInspector.UISourceCode, number>} */
  this._evaluationIndexForUISourceCode = new Map();
  debuggerModel.addEventListener(
      WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._reset, this);
};

WebInspector.SnippetScriptMapping.prototype = {
  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _releaseSnippetScript: function(uiSourceCode) {
    var script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return;

    delete this._uiSourceCodeForScriptId[script.scriptId];
    this._scriptForUISourceCode.remove(uiSourceCode);
    this._evaluationIndexForUISourceCode.remove(uiSourceCode);
  },

  /**
   +* @param {number} evaluationIndex
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _setEvaluationIndex: function(evaluationIndex, uiSourceCode) {
    this._evaluationIndexForUISourceCode.set(uiSourceCode, evaluationIndex);
  },

  /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {number|undefined}
     */
  evaluationIndex: function(uiSourceCode) {
    return this._evaluationIndexForUISourceCode.get(uiSourceCode);
  },

  /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {string}
     */
  _evaluationSourceURL: function(uiSourceCode) {
    var evaluationSuffix = '_' + this._evaluationIndexForUISourceCode.get(uiSourceCode);
    var snippetId = this._scriptSnippetModel._snippetIdForUISourceCode.get(uiSourceCode);
    return WebInspector.ScriptSnippetModel.snippetSourceURLPrefix + snippetId + evaluationSuffix;
  },

  _reset: function() {
    this._uiSourceCodeForScriptId = {};
    this._scriptForUISourceCode.clear();
    this._evaluationIndexForUISourceCode.clear();
  },

  /**
     * @override
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
  rawLocationToUILocation: function(rawLocation) {
    var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
    var uiSourceCode = this._uiSourceCodeForScriptId[debuggerModelLocation.scriptId];
    if (!uiSourceCode)
      return null;

    return uiSourceCode.uiLocation(
        debuggerModelLocation.lineNumber, debuggerModelLocation.columnNumber || 0);
  },

  /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
  uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber) {
    var script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return null;

    return this._debuggerModel.createRawLocation(script, lineNumber, columnNumber);
  },

  /**
   * @param {!WebInspector.Script} script
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _addScript: function(script, uiSourceCode) {
    console.assert(!this._scriptForUISourceCode.get(uiSourceCode));
    WebInspector.debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, this);
    this._uiSourceCodeForScriptId[script.scriptId] = uiSourceCode;
    this._scriptForUISourceCode.set(uiSourceCode, script);
    WebInspector.debuggerWorkspaceBinding.pushSourceMapping(script, this);
  },

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!Array.<!{breakpoint: !WebInspector.BreakpointManager.Breakpoint, uiLocation:
   * !WebInspector.UILocation}>} breakpointLocations
   */
  _restoreBreakpoints: function(uiSourceCode, breakpointLocations) {
    var script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return;
    var rawLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (
        this._debuggerModel.createRawLocation(script, 0, 0));
    var scriptUISourceCode =
        WebInspector.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation).uiSourceCode;
    if (scriptUISourceCode)
      this._scriptSnippetModel._restoreBreakpoints(scriptUISourceCode, breakpointLocations);
  },

  /**
     * @override
     * @return {boolean}
     */
  isIdentity: function() { return false; },

  /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
  uiLineHasMapping: function(uiSourceCode, lineNumber) { return true; }
};

/**
 * @constructor
 * @implements {WebInspector.ContentProvider}
 * @param {!WebInspector.Snippet} snippet
 */
WebInspector.SnippetContentProvider = function(snippet) {
  this._snippet = snippet;
};

WebInspector.SnippetContentProvider.prototype = {
  /**
     * @override
     * @return {string}
     */
  contentURL: function() { return ''; },

  /**
     * @override
     * @return {!WebInspector.ResourceType}
     */
  contentType: function() { return WebInspector.resourceTypes.Script; },

  /**
     * @override
     * @return {!Promise<?string>}
     */
  requestContent: function() {
    return Promise.resolve(/** @type {?string} */ (this._snippet.content));
  },

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!WebInspector.ContentProvider.SearchMatch>)} callback
   */
  searchInContent: function(query, caseSensitive, isRegex, callback) {
    /**
     * @this {WebInspector.SnippetContentProvider}
     */
    function performSearch() {
      callback(WebInspector.ContentProvider.performSearchInContent(
          this._snippet.content, query, caseSensitive, isRegex));
    }

    // searchInContent should call back later.
    window.setTimeout(performSearch.bind(this), 0);
  }
};

/**
 * @constructor
 * @extends {WebInspector.ContentProviderBasedProject}
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.ScriptSnippetModel} model
 */
WebInspector.SnippetsProject = function(workspace, model) {
  WebInspector.ContentProviderBasedProject.call(
      this, workspace, 'snippets:', WebInspector.projectTypes.Snippets, '');
  this._model = model;
};

WebInspector.SnippetsProject.prototype = {
  /**
     * @param {string} name
     * @param {!WebInspector.ContentProvider} contentProvider
     * @return {!WebInspector.UISourceCode}
     */
  addSnippet: function(name, contentProvider) {
    return this.addContentProvider(name, contentProvider);
  },

  /**
     * @override
     * @return {boolean}
     */
  canSetFileContent: function() { return true; },

  /**
   * @override
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {string} newContent
   * @param {function(?string)} callback
   */
  setFileContent: function(uiSourceCode, newContent, callback) {
    this._model._setScriptSnippetContent(uiSourceCode.url(), newContent);
    callback('');
  },

  /**
     * @override
     * @return {boolean}
     */
  canRename: function() { return true; },

  /**
   * @override
   * @param {string} url
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  performRename: function(url, newName, callback) {
    this._model.renameScriptSnippet(url, newName, callback);
  },

  /**
   * @override
   * @param {string} url
   * @param {?string} name
   * @param {string} content
   * @param {function(?WebInspector.UISourceCode)} callback
   */
  createFile: function(url, name, content, callback) {
    callback(this._model.createScriptSnippet(content));
  },

  /**
   * @override
   * @param {string} url
   */
  deleteFile: function(url) { this._model.deleteScriptSnippet(url); },

  __proto__: WebInspector.ContentProviderBasedProject.prototype
};

/**
 * @type {!WebInspector.ScriptSnippetModel}
 */
WebInspector.scriptSnippetModel = new WebInspector.ScriptSnippetModel(WebInspector.workspace);
