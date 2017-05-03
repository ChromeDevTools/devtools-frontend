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
 * @implements {Bindings.DebuggerSourceMapping}
 * @unrestricted
 */
Bindings.CompilerScriptMapping = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.NetworkProject} networkProject
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, networkProject, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._sourceMapManager = this._debuggerModel.sourceMapManager();
    this._workspace = workspace;
    this._networkProject = networkProject;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Multimap<!SDK.Script, !Workspace.UISourceCode>} */
    this._scriptSources = new Multimap();
    /** @type {!Map<!SDK.Script, !Workspace.UISourceCode>} */
    this._stubUISourceCodes = new Map();

    var projectId = Bindings.CompilerScriptMapping.projectIdForTarget(this._debuggerModel.target());
    this._stubProject = new Bindings.ContentProviderBasedProject(
        workspace, projectId, Workspace.projectTypes.Service, '', true /* isServiceProject */);
    this._eventListeners = [
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach, this._sourceMapWillAttach, this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapFailedToAttach, this._sourceMapFailedToAttach, this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this._sourceMapAttached, this),
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapDetached, this._sourceMapDetached, this),
    ];
  }

  /**
   * @param {!SDK.Script} script
   */
  _addStubUISourceCode(script) {
    var stubUISourceCode = this._stubProject.addContentProvider(
        script.sourceURL + ':sourcemap',
        Common.StaticContentProvider.fromString(
            script.sourceURL, Common.resourceTypes.Script,
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'));
    this._stubUISourceCodes.set(script, stubUISourceCode);
  }

  /**
   * @param {!SDK.Script} script
   */
  _removeStubUISourceCode(script) {
    var uiSourceCode = this._stubUISourceCodes.get(script);
    this._stubUISourceCodes.delete(script);
    this._stubProject.removeFile(uiSourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?string}
   */
  static uiSourceCodeOrigin(uiSourceCode) {
    var script = uiSourceCode[Bindings.CompilerScriptMapping._scriptSymbol];
    return script ? script.sourceURL : null;
  }

  /**
   * @param {!SDK.Target} target
   * @return {string}
   */
  static projectIdForTarget(target) {
    return 'compiler-script-project:' + target.id();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {boolean}
   */
  mapsToSourceCode(rawLocation) {
    var script = rawLocation.script();
    var sourceMap = script ? this._sourceMapManager.sourceMapForClient(script) : null;
    if (!sourceMap)
      return true;
    return !!sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var script = rawLocation.script();
    if (!script)
      return null;

    var lineNumber = rawLocation.lineNumber;
    var columnNumber = rawLocation.columnNumber || 0;
    var stubUISourceCode = this._stubUISourceCodes.get(script);
    if (stubUISourceCode)
      return new Workspace.UILocation(stubUISourceCode, lineNumber, columnNumber);

    var sourceMap = this._sourceMapManager.sourceMapForClient(script);
    if (!sourceMap)
      return null;
    var entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry || !entry.sourceURL)
      return null;
    var uiSourceCode = Bindings.NetworkProject.uiSourceCodeForScriptURL(
        this._workspace, /** @type {string} */ (entry.sourceURL), script);
    if (!uiSourceCode)
      return null;
    return uiSourceCode.uiLocation(
        /** @type {number} */ (entry.sourceLineNumber), /** @type {number} */ (entry.sourceColumnNumber));
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var script = uiSourceCode[Bindings.CompilerScriptMapping._scriptSymbol];
    if (!script)
      return null;
    var sourceMap = this._sourceMapManager.sourceMapForClient(script);
    if (!sourceMap)
      return null;
    var entry = sourceMap.firstSourceLineMapping(uiSourceCode.url(), lineNumber);
    if (!entry)
      return null;
    return this._debuggerModel.createRawLocation(script, entry.lineNumber, entry.columnNumber);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapWillAttach(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    // Create stub UISourceCode for the time source mapping is being loaded.
    this._addStubUISourceCode(script);
    this._debuggerWorkspaceBinding.pushSourceMapping(script, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapFailedToAttach(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    this._removeStubUISourceCode(script);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapAttached(event) {
    var script = /** @type {!SDK.Script} */ (event.data.client);
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    this._removeStubUISourceCode(script);

    if (Bindings.blackboxManager.isBlackboxedURL(script.sourceURL, script.isContentScript()))
      return;
    Bindings.blackboxManager.sourceMapLoaded(script, sourceMap);

    this._populateSourceMapSources(script, sourceMap);
    this._sourceMapAttachedForTest(sourceMap);
  }

  /**
   * @param {!Common.Event} event
   */
  _sourceMapDetached(event) {
    var script = /** @type {!SDK.Script} */ (event.data.client);
    var sources = this._scriptSources.get(script);
    if (!sources.size)
      return;
    var frameId = script[Bindings.CompilerScriptMapping._frameIdSymbol];
    for (var uiSourceCode of sources) {
      this._debuggerWorkspaceBinding.setSourceMapping(this._debuggerModel, uiSourceCode, null);
      this._networkProject.removeSourceMapFile(uiSourceCode.url(), frameId, script.isContentScript());
    }
    this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!SDK.Script} script
   * @return {?SDK.SourceMap}
   */
  sourceMapForScript(script) {
    return this._sourceMapManager.sourceMapForClient(script);
  }

  /**
   * @param {!SDK.Script} script
   */
  maybeLoadSourceMap(script) {
    var sourceMap = this._sourceMapManager.sourceMapForClient(script);
    if (!sourceMap || this._scriptSources.has(script))
      return;
    this._populateSourceMapSources(script, sourceMap);
  }

  /**
   * @param {?SDK.SourceMap} sourceMap
   */
  _sourceMapAttachedForTest(sourceMap) {
  }

  /**
   * @param {!SDK.Script} script
   * @param {!SDK.SourceMap} sourceMap
   */
  _populateSourceMapSources(script, sourceMap) {
    var frameId = Bindings.frameIdForScript(script);
    script[Bindings.CompilerScriptMapping._frameIdSymbol] = frameId;
    for (var sourceURL of sourceMap.sourceURLs()) {
      var contentProvider = sourceMap.sourceContentProvider(sourceURL, Common.resourceTypes.SourceMapScript);
      var embeddedContent = sourceMap.embeddedContentByURL(sourceURL);
      var embeddedContentLength = typeof embeddedContent === 'string' ? embeddedContent.length : null;
      var uiSourceCode = this._networkProject.addSourceMapFile(
          contentProvider, frameId, script.isContentScript(), embeddedContentLength);
      uiSourceCode[Bindings.CompilerScriptMapping._scriptSymbol] = script;
      this._scriptSources.set(script, uiSourceCode);
      this._debuggerWorkspaceBinding.setSourceMapping(this._debuggerModel, uiSourceCode, this);
    }
    this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @override
   * @return {boolean}
   */
  isIdentity() {
    return false;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  uiLineHasMapping(uiSourceCode, lineNumber) {
    var script = uiSourceCode[Bindings.CompilerScriptMapping._scriptSymbol];
    var sourceMap = script ? this._sourceMapManager.sourceMapForClient(script) : null;
    if (!sourceMap)
      return true;
    return !!sourceMap.firstSourceLineMapping(uiSourceCode.url(), lineNumber);
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._stubProject.dispose();
  }
};

Bindings.CompilerScriptMapping._scriptSymbol = Symbol('Bindings.CompilerScriptMapping._scriptSymbol');
Bindings.CompilerScriptMapping._frameIdSymbol = Symbol('Bindings.CompilerScriptMapping._frameIdSymbol');