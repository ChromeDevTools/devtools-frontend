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
 * @unrestricted
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 * @implements {Bindings.DebuggerSourceMapping}
 */
Snippets.ScriptSnippetModel = class extends Common.Object {
  /**
   * @param {!Workspace.Workspace} workspace
   */
  constructor(workspace) {
    super();
    this._workspace = workspace;
    /** @type {!Object.<string, !Workspace.UISourceCode>} */
    this._uiSourceCodeForSnippetId = {};
    /** @type {!Map.<!Workspace.UISourceCode, string>} */
    this._snippetIdForUISourceCode = new Map();

    /** @type {!Map.<!SDK.DebuggerModel, !Snippets.SnippetScriptMapping>} */
    this._mappingForDebuggerModel = new Map();
    this._snippetStorage = new Snippets.SnippetStorage('script', 'Script snippet #');
    this._lastSnippetEvaluationIndexSetting = Common.settings.createSetting('lastSnippetEvaluationIndex', 0);
    this._project = new Snippets.SnippetsProject(workspace, this);
    this._loadSnippets();
    SDK.targetManager.observeModels(SDK.DebuggerModel, this);
    Bindings.debuggerWorkspaceBinding.addSourceMapping(this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._mappingForDebuggerModel.set(debuggerModel, new Snippets.SnippetScriptMapping(debuggerModel, this));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._mappingForDebuggerModel.remove(debuggerModel);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const mapping = this._mappingForDebuggerModel.get(rawLocation.debuggerModel);
    if (!mapping)
      return null;
    return mapping.rawLocationToUILocation(rawLocation);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locations = [];
    for (const mapping of this._mappingForDebuggerModel.values())
      locations.push(...mapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber));
    return locations;
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {!Snippets.SnippetScriptMapping|undefined}
   */
  snippetScriptMapping(debuggerModel) {
    return this._mappingForDebuggerModel.get(debuggerModel);
  }

  /**
   * @return {!Workspace.Project}
   */
  project() {
    return this._project;
  }

  _loadSnippets() {
    for (const snippet of this._snippetStorage.snippets())
      this._addScriptSnippet(snippet);
  }

  /**
   * @param {string} content
   * @return {!Workspace.UISourceCode}
   */
  createScriptSnippet(content) {
    const snippet = this._snippetStorage.createSnippet();
    snippet.content = content;
    return this._addScriptSnippet(snippet);
  }

  /**
   * @param {!Snippets.Snippet} snippet
   * @return {!Workspace.UISourceCode}
   */
  _addScriptSnippet(snippet) {
    const uiSourceCode = this._project.addSnippet(snippet.name, new Snippets.SnippetContentProvider(snippet));
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this._snippetIdForUISourceCode.set(uiSourceCode, snippet.id);
    const breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    this._uiSourceCodeForSnippetId[snippet.id] = uiSourceCode;
    return uiSourceCode;
  }

  /**
   * @param {!Common.Event} event
   */
  _workingCopyChanged(event) {
    const uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._scriptSnippetEdited(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  deleteScriptSnippet(uiSourceCode) {
    const snippetId = this._snippetIdForUISourceCode.get(uiSourceCode) || '';
    const snippet = this._snippetStorage.snippetForId(snippetId);
    if (!snippet)
      return;
    this._snippetStorage.deleteSnippet(snippet);
    this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    delete this._uiSourceCodeForSnippetId[snippet.id];
    this._snippetIdForUISourceCode.remove(uiSourceCode);
    this._project.removeFile(snippet.name);
  }

  /**
   * @param {string} name
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  renameScriptSnippet(name, newName, callback) {
    newName = newName.trim();
    if (!newName || newName.indexOf('/') !== -1 || name === newName || this._snippetStorage.snippetForName(newName)) {
      callback(false);
      return;
    }
    const snippet = this._snippetStorage.snippetForName(name);
    console.assert(snippet, 'Snippet \'' + name + '\' was not found.');
    const uiSourceCode = this._uiSourceCodeForSnippetId[snippet.id];
    console.assert(uiSourceCode, 'No uiSourceCode was found for snippet \'' + name + '\'.');

    const breakpointLocations = this._removeBreakpoints(uiSourceCode);
    snippet.name = newName;
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    callback(true, newName);
  }

  /**
   * @param {string} name
   * @param {string} newContent
   */
  _setScriptSnippetContent(name, newContent) {
    const snippet = this._snippetStorage.snippetForName(name);
    snippet.content = newContent;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _scriptSnippetEdited(uiSourceCode) {
    const breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);
    this._mappingForDebuggerModel.valuesArray().forEach(function(mapping) {
      mapping._restoreBreakpoints(uiSourceCode, breakpointLocations);
    });
  }

  /**
   * @return {number}
   */
  _nextEvaluationIndex() {
    const evaluationIndex = this._lastSnippetEvaluationIndexSetting.get() + 1;
    this._lastSnippetEvaluationIndexSetting.set(evaluationIndex);
    return evaluationIndex;
  }

  /**
   * @param {!SDK.ExecutionContext} executionContext
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<undefined>}
   */
  async evaluateScriptSnippet(executionContext, uiSourceCode) {
    console.assert(uiSourceCode.project().type() === Workspace.projectTypes.Snippets);
    let breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._releaseSnippetScript(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);

    const runtimeModel = executionContext.runtimeModel;
    const debuggerModel = executionContext.debuggerModel;
    const evaluationIndex = this._nextEvaluationIndex();
    const mapping = this._mappingForDebuggerModel.get(debuggerModel);
    mapping._setEvaluationIndex(evaluationIndex, uiSourceCode);
    const evaluationUrl = mapping._evaluationSourceURL(uiSourceCode);
    await uiSourceCode.requestContent();
    const expression = uiSourceCode.workingCopy();
    Common.console.show();
    const result = await runtimeModel.compileScript(expression, '', true, executionContext.id);
    if (!result || mapping.evaluationIndex(uiSourceCode) !== evaluationIndex)
      return;
    const script = /** @type {!SDK.Script} */ (
        debuggerModel.scriptForId(/** @type {string} */ (result.scriptId || result.exceptionDetails.scriptId)));
    mapping._addScript(script, uiSourceCode);
    if (!result.scriptId) {
      this._printRunOrCompileScriptResultFailure(
          runtimeModel, /** @type {!Protocol.Runtime.ExceptionDetails} */ (result.exceptionDetails), evaluationUrl);
      return;
    }

    breakpointLocations = this._removeBreakpoints(uiSourceCode);
    this._restoreBreakpoints(uiSourceCode, breakpointLocations);

    this._runScript(script.scriptId, executionContext, evaluationUrl);
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {!SDK.ExecutionContext} executionContext
   * @param {?string=} sourceURL
   */
  async _runScript(scriptId, executionContext, sourceURL) {
    const runtimeModel = executionContext.runtimeModel;
    const result = await runtimeModel.runScript(
        scriptId, executionContext.id, 'console', /* silent */ false, /* includeCommandLineAPI */ true,
        /* returnByValue */ false, /* generatePreview */ true);
    if (result.error)
      return;
    if (!result.exceptionDetails)
      this._printRunScriptResult(runtimeModel, result.object || null, scriptId, sourceURL);
    else
      this._printRunOrCompileScriptResultFailure(runtimeModel, result.exceptionDetails, sourceURL);
  }

  /**
   * @param {!SDK.RuntimeModel} runtimeModel
   * @param {?SDK.RemoteObject} result
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {?string=} sourceURL
   */
  _printRunScriptResult(runtimeModel, result, scriptId, sourceURL) {
    const consoleMessage = new SDK.ConsoleMessage(
        runtimeModel, SDK.ConsoleMessage.MessageSource.JS, SDK.ConsoleMessage.MessageLevel.Info, '',
        SDK.ConsoleMessage.MessageType.Result, sourceURL, undefined, undefined, [result], undefined, undefined,
        undefined, scriptId);
    SDK.consoleModel.addMessage(consoleMessage);
  }

  /**
   * @param {!SDK.RuntimeModel} runtimeModel
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   * @param {?string=} sourceURL
   */
  _printRunOrCompileScriptResultFailure(runtimeModel, exceptionDetails, sourceURL) {
    SDK.consoleModel.addMessage(
        SDK.ConsoleMessage.fromException(runtimeModel, exceptionDetails, undefined, undefined, sourceURL || undefined));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array.<!{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>}
   */
  _removeBreakpoints(uiSourceCode) {
    const breakpointLocations = Bindings.breakpointManager.breakpointLocationsForUISourceCode(uiSourceCode);
    for (let i = 0; i < breakpointLocations.length; ++i)
      breakpointLocations[i].breakpoint.remove(false /* keepInStorage */);
    return breakpointLocations;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Array.<!{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>} breakpointLocations
   */
  _restoreBreakpoints(uiSourceCode, breakpointLocations) {
    for (let i = 0; i < breakpointLocations.length; ++i) {
      const uiLocation = breakpointLocations[i].uiLocation;
      const breakpoint = breakpointLocations[i].breakpoint;
      Bindings.breakpointManager.setBreakpoint(
          uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber, breakpoint.condition(), breakpoint.enabled());
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _releaseSnippetScript(uiSourceCode) {
    this._mappingForDebuggerModel.valuesArray().forEach(function(mapping) {
      mapping._releaseSnippetScript(uiSourceCode);
    });
  }

  /**
   * @param {string} sourceURL
   * @return {?string}
   */
  _snippetIdForSourceURL(sourceURL) {
    const snippetPrefix = Snippets.ScriptSnippetModel.snippetSourceURLPrefix;
    if (!sourceURL.startsWith(snippetPrefix))
      return null;
    const splitURL = sourceURL.substring(snippetPrefix.length).split('_');
    const snippetId = splitURL[0];
    return snippetId;
  }
};

Snippets.ScriptSnippetModel.snippetSourceURLPrefix = 'snippets:///';

/**
 * @unrestricted
 */
Snippets.SnippetScriptMapping = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Snippets.ScriptSnippetModel} scriptSnippetModel
   */
  constructor(debuggerModel, scriptSnippetModel) {
    this._debuggerModel = debuggerModel;
    this._scriptSnippetModel = scriptSnippetModel;
    /** @type {!Object.<string, !Workspace.UISourceCode>} */
    this._uiSourceCodeForScriptId = {};
    /** @type {!Map.<!Workspace.UISourceCode, !SDK.Script>} */
    this._scriptForUISourceCode = new Map();
    /** @type {!Map.<!Workspace.UISourceCode, number>} */
    this._evaluationIndexForUISourceCode = new Map();
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._reset, this);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _releaseSnippetScript(uiSourceCode) {
    const script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return;

    delete this._uiSourceCodeForScriptId[script.scriptId];
    this._scriptForUISourceCode.remove(uiSourceCode);
    this._evaluationIndexForUISourceCode.remove(uiSourceCode);
  }

  /**
   * @param {number} evaluationIndex
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _setEvaluationIndex(evaluationIndex, uiSourceCode) {
    this._evaluationIndexForUISourceCode.set(uiSourceCode, evaluationIndex);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {number|undefined}
   */
  evaluationIndex(uiSourceCode) {
    return this._evaluationIndexForUISourceCode.get(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {string}
   */
  _evaluationSourceURL(uiSourceCode) {
    const evaluationSuffix = '_' + this._evaluationIndexForUISourceCode.get(uiSourceCode);
    const snippetId = this._scriptSnippetModel._snippetIdForUISourceCode.get(uiSourceCode);
    return Snippets.ScriptSnippetModel.snippetSourceURLPrefix + snippetId + evaluationSuffix;
  }

  _reset() {
    this._uiSourceCodeForScriptId = {};
    this._scriptForUISourceCode.clear();
    this._evaluationIndexForUISourceCode.clear();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    const debuggerModelLocation = /** @type {!SDK.DebuggerModel.Location} */ (rawLocation);
    const uiSourceCode = this._uiSourceCodeForScriptId[debuggerModelLocation.scriptId];
    if (!uiSourceCode)
      return null;

    return uiSourceCode.uiLocation(debuggerModelLocation.lineNumber, debuggerModelLocation.columnNumber || 0);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return [];
    return [this._debuggerModel.createRawLocation(script, lineNumber, columnNumber)];
  }

  /**
   * @param {!SDK.Script} script
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _addScript(script, uiSourceCode) {
    console.assert(!this._scriptForUISourceCode.get(uiSourceCode));
    this._uiSourceCodeForScriptId[script.scriptId] = uiSourceCode;
    this._scriptForUISourceCode.set(uiSourceCode, script);
    Bindings.debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Array.<!{breakpoint: !Bindings.BreakpointManager.Breakpoint, uiLocation: !Workspace.UILocation}>} breakpointLocations
   */
  _restoreBreakpoints(uiSourceCode, breakpointLocations) {
    const script = this._scriptForUISourceCode.get(uiSourceCode);
    if (!script)
      return;
    const rawLocation =
        /** @type {!SDK.DebuggerModel.Location} */ (this._debuggerModel.createRawLocation(script, 0, 0));
    const uiLocation = Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);
    if (uiLocation)
      this._scriptSnippetModel._restoreBreakpoints(uiLocation.uiSourceCode, breakpointLocations);
  }
};

/**
 * @implements {Common.ContentProvider}
 * @unrestricted
 */
Snippets.SnippetContentProvider = class {
  /**
   * @param {!Snippets.Snippet} snippet
   */
  constructor(snippet) {
    this._snippet = snippet;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return '';
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return Common.resourceTypes.Snippet;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  contentEncoded() {
    return Promise.resolve(false);
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return Promise.resolve(/** @type {?string} */ (this._snippet.content));
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!Common.ContentProvider.SearchMatch>>}
   */
  async searchInContent(query, caseSensitive, isRegex) {
    return Common.ContentProvider.performSearchInContent(this._snippet.content, query, caseSensitive, isRegex);
  }
};

/**
 * @unrestricted
 */
Snippets.SnippetsProject = class extends Bindings.ContentProviderBasedProject {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!Snippets.ScriptSnippetModel} model
   */
  constructor(workspace, model) {
    super(workspace, 'snippets:', Workspace.projectTypes.Snippets, '', false /* isServiceProject */);
    this._model = model;
  }

  /**
   * @param {string} name
   * @param {!Common.ContentProvider} contentProvider
   * @return {!Workspace.UISourceCode}
   */
  addSnippet(name, contentProvider) {
    return this.addContentProvider(name, contentProvider, 'text/javascript');
  }

  /**
   * @override
   * @return {boolean}
   */
  canSetFileContent() {
    return true;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} newContent
   * @param {boolean} isBase64
   * @return {!Promise}
   */
  async setFileContent(uiSourceCode, newContent, isBase64) {
    this._model._setScriptSnippetContent(uiSourceCode.url(), newContent);
  }

  /**
   * @override
   * @return {boolean}
   */
  canRename() {
    return true;
  }

  /**
   * @override
   * @param {string} url
   * @param {string} newName
   * @param {function(boolean, string=)} callback
   */
  performRename(url, newName, callback) {
    this._model.renameScriptSnippet(url, newName, callback);
  }

  /**
   * @override
   * @param {string} url
   * @param {?string} name
   * @param {string} content
   * @param {boolean=} isBase64
   * @return {!Promise<?Workspace.UISourceCode>}
   */
  createFile(url, name, content, isBase64) {
    return /** @type {!Promise<?Workspace.UISourceCode>} */ (Promise.resolve(this._model.createScriptSnippet(content)));
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  deleteFile(uiSourceCode) {
    this._model.deleteScriptSnippet(uiSourceCode);
  }
};

/**
 * @type {!Snippets.ScriptSnippetModel}
 */
Snippets.scriptSnippetModel = new Snippets.ScriptSnippetModel(Workspace.workspace);
