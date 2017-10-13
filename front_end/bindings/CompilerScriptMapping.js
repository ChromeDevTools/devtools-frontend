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
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._sourceMapManager = this._debuggerModel.sourceMapManager();
    this._workspace = workspace;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    var target = debuggerModel.target();
    this._regularProject = new Bindings.ContentProviderBasedProject(
        workspace, 'jsSourceMaps::' + target.id(), Workspace.projectTypes.Network, '', false /* isServiceProject */);
    this._contentScriptsProject = new Bindings.ContentProviderBasedProject(
        workspace, 'jsSourceMaps:extensions:' + target.id(), Workspace.projectTypes.ContentScripts, '',
        false /* isServiceProject */);
    Bindings.NetworkProject.setTargetForProject(this._regularProject, target);
    Bindings.NetworkProject.setTargetForProject(this._contentScriptsProject, target);

    /** @type {!Map<!SDK.Script, !Workspace.UISourceCode>} */
    this._stubUISourceCodes = new Map();

    this._stubProject = new Bindings.ContentProviderBasedProject(
        workspace, 'jsSourceMaps:stub:' + target.id(), Workspace.projectTypes.Service, '', true /* isServiceProject */);
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
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'),
        'text/javascript');
    this._stubUISourceCodes.set(script, stubUISourceCode);
  }

  /**
   * @param {!SDK.Script} script
   */
  _removeStubUISourceCode(script) {
    var uiSourceCode = this._stubUISourceCodes.get(script);
    this._stubUISourceCodes.delete(script);
    this._stubProject.removeFile(uiSourceCode.url());
    this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?string}
   */
  static uiSourceCodeOrigin(uiSourceCode) {
    var sourceMap = uiSourceCode[Bindings.CompilerScriptMapping._sourceMapSymbol];
    if (!sourceMap)
      return null;
    return sourceMap.compiledURL();
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
   * @param {string} url
   * @param {boolean} isContentScript
   */
  uiSourceCodeForURL(url, isContentScript) {
    return isContentScript ? this._contentScriptsProject.uiSourceCodeForURL(url) :
                             this._regularProject.uiSourceCodeForURL(url);
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
    var uiSourceCode = script.isContentScript() ? this._contentScriptsProject.uiSourceCodeForURL(entry.sourceURL) :
                                                  this._regularProject.uiSourceCodeForURL(entry.sourceURL);
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
    var sourceMap = uiSourceCode[Bindings.CompilerScriptMapping._sourceMapSymbol];
    if (!sourceMap)
      return null;
    var scripts = this._sourceMapManager.clientsForSourceMap(sourceMap);
    var script = scripts.length ? scripts[0] : null;
    if (!script)
      return null;
    var entry = sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, columnNumber);
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
    this._debuggerWorkspaceBinding.updateLocations(script);
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
    var frameId = script[Bindings.CompilerScriptMapping._frameIdSymbol];
    var sourceMap = /** @type {!SDK.SourceMap} */ (event.data.sourceMap);
    var scripts = this._sourceMapManager.clientsForSourceMap(sourceMap);
    var hasOtherScripts = scripts.some(someScript => someScript.isContentScript() === script.isContentScript());
    var project = script.isContentScript() ? this._contentScriptsProject : this._regularProject;
    for (var sourceURL of sourceMap.sourceURLs()) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (project.uiSourceCodeForURL(sourceURL));
      if (hasOtherScripts)
        Bindings.NetworkProject.removeFrameAttribution(uiSourceCode, frameId);
      else
        project.removeFile(sourceURL);
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
    if (!sourceMap)
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
    var project = script.isContentScript() ? this._contentScriptsProject : this._regularProject;
    for (var sourceURL of sourceMap.sourceURLs()) {
      var uiSourceCode = project.uiSourceCodeForURL(sourceURL);
      if (uiSourceCode) {
        Bindings.NetworkProject.addFrameAttribution(uiSourceCode, frameId);
        continue;
      }

      var contentProvider = sourceMap.sourceContentProvider(sourceURL, Common.resourceTypes.SourceMapScript);
      var mimeType = Common.ResourceType.mimeFromURL(sourceURL) || contentProvider.contentType().canonicalMimeType();
      var embeddedContent = sourceMap.embeddedContentByURL(sourceURL);
      var metadata =
          typeof embeddedContent === 'string' ? new Workspace.UISourceCodeMetadata(null, embeddedContent.length) : null;
      uiSourceCode = project.createUISourceCode(sourceURL, contentProvider.contentType());
      uiSourceCode[Bindings.CompilerScriptMapping._sourceMapSymbol] = sourceMap;
      Bindings.NetworkProject.setInitialFrameAttribution(uiSourceCode, frameId);
      project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    }
    this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  static uiLineHasMapping(uiSourceCode, lineNumber) {
    var sourceMap = uiSourceCode[Bindings.CompilerScriptMapping._sourceMapSymbol];
    if (!sourceMap)
      return true;
    return !!sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, 0);
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._regularProject.dispose();
    this._contentScriptsProject.dispose();
    this._stubProject.dispose();
  }
};

Bindings.CompilerScriptMapping._frameIdSymbol = Symbol('Bindings.CompilerScriptMapping._frameIdSymbol');
Bindings.CompilerScriptMapping._sourceMapSymbol = Symbol('Bindings.CompilerScriptMapping._sourceMapSymbol');
