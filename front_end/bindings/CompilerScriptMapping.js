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
 * @implements {WebInspector.DebuggerSourceMapping}
 * @unrestricted
 */
WebInspector.CompilerScriptMapping = class {
  /**
   * @param {!WebInspector.DebuggerModel} debuggerModel
   * @param {!WebInspector.Workspace} workspace
   * @param {!WebInspector.NetworkMapping} networkMapping
   * @param {!WebInspector.NetworkProject} networkProject
   * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, networkMapping, networkProject, debuggerWorkspaceBinding) {
    this._target = debuggerModel.target();
    this._debuggerModel = debuggerModel;
    this._networkMapping = networkMapping;
    this._networkProject = networkProject;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Map<string, !Promise<?WebInspector.TextSourceMap>>} */
    this._sourceMapLoadingPromises = new Map();
    /** @type {!Map<string, !WebInspector.TextSourceMap>} */
    this._sourceMapForScriptId = new Map();
    /** @type {!Map.<!WebInspector.TextSourceMap, !WebInspector.Script>} */
    this._scriptForSourceMap = new Map();
    /** @type {!Map.<string, !WebInspector.TextSourceMap>} */
    this._sourceMapForURL = new Map();
    /** @type {!Map.<string, !WebInspector.UISourceCode>} */
    this._stubUISourceCodes = new Map();

    var projectId = WebInspector.CompilerScriptMapping.projectIdForTarget(this._target);
    this._stubProject =
        new WebInspector.ContentProviderBasedProject(workspace, projectId, WebInspector.projectTypes.Service, '');
    this._eventListeners = [
      workspace.addEventListener(
          WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this),
      debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this)
    ];
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?string}
   */
  static uiSourceCodeOrigin(uiSourceCode) {
    return uiSourceCode[WebInspector.CompilerScriptMapping._originSymbol] || null;
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {string}
   */
  static projectIdForTarget(target) {
    return 'compiler-script-project:' + target.id();
  }

  /**
   * @param {!WebInspector.DebuggerModel.Location} rawLocation
   * @return {boolean}
   */
  mapsToSourceCode(rawLocation) {
    var sourceMap = this._sourceMapForScriptId.get(rawLocation.scriptId);
    if (!sourceMap) {
      return true;
    }
    return !!sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
  }

  /**
   * @override
   * @param {!WebInspector.DebuggerModel.Location} rawLocation
   * @return {?WebInspector.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);

    var stubUISourceCode = this._stubUISourceCodes.get(debuggerModelLocation.scriptId);
    if (stubUISourceCode)
      return new WebInspector.UILocation(stubUISourceCode, rawLocation.lineNumber, rawLocation.columnNumber);

    var sourceMap = this._sourceMapForScriptId.get(debuggerModelLocation.scriptId);
    if (!sourceMap)
      return null;
    var lineNumber = debuggerModelLocation.lineNumber;
    var columnNumber = debuggerModelLocation.columnNumber || 0;
    var entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry || !entry.sourceURL)
      return null;
    var script = rawLocation.script();
    if (!script)
      return null;
    var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(/** @type {string} */ (entry.sourceURL), script);
    if (!uiSourceCode)
      return null;
    return uiSourceCode.uiLocation(
        /** @type {number} */ (entry.sourceLineNumber), /** @type {number} */ (entry.sourceColumnNumber));
  }

  /**
   * @override
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?WebInspector.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    if (uiSourceCode.project().type() === WebInspector.projectTypes.Service)
      return null;
    var sourceMap = this._sourceMapForURL.get(uiSourceCode.url());
    if (!sourceMap)
      return null;
    var script = /** @type {!WebInspector.Script} */ (this._scriptForSourceMap.get(sourceMap));
    console.assert(script);
    var entry = sourceMap.firstSourceLineMapping(uiSourceCode.url(), lineNumber);
    if (!entry)
      return null;
    return this._debuggerModel.createRawLocation(script, entry.lineNumber, entry.columnNumber);
  }

  /**
   * @param {!WebInspector.Script} script
   */
  addScript(script) {
    if (!script.sourceMapURL) {
      script.addEventListener(WebInspector.Script.Events.SourceMapURLAdded, this._sourceMapURLAdded.bind(this));
      return;
    }

    this._processScript(script);
  }

  /**
   * @param {!WebInspector.Script} script
   * @return {?WebInspector.TextSourceMap}
   */
  sourceMapForScript(script) {
    return this._sourceMapForScriptId.get(script.scriptId) || null;
  }

  /**
   * @param {!WebInspector.Script} script
   */
  maybeLoadSourceMap(script) {
    if (!script.sourceMapURL)
      return;
    if (this._sourceMapLoadingPromises.has(script.sourceMapURL))
      return;
    if (this._sourceMapForScriptId.has(script.scriptId))
      return;
    this._processScript(script);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _sourceMapURLAdded(event) {
    var script = /** @type {!WebInspector.Script} */ (event.target);
    if (!script.sourceMapURL)
      return;
    this._processScript(script);
  }

  /**
   * @param {!WebInspector.Script} script
   */
  _processScript(script) {
    if (WebInspector.blackboxManager.isBlackboxedURL(script.sourceURL, script.isContentScript()))
      return;
    // Create stub UISourceCode for the time source mapping is being loaded.
    var stubUISourceCode = this._stubProject.addContentProvider(
        script.sourceURL,
        WebInspector.StaticContentProvider.fromString(
            script.sourceURL, WebInspector.resourceTypes.Script,
            '\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!'));
    this._stubUISourceCodes.set(script.scriptId, stubUISourceCode);

    this._debuggerWorkspaceBinding.pushSourceMapping(script, this);
    this._loadSourceMapForScript(script).then(this._sourceMapLoaded.bind(this, script, stubUISourceCode.url()));
  }

  /**
   * @param {!WebInspector.Script} script
   * @param {string} uiSourceCodePath
   * @param {?WebInspector.TextSourceMap} sourceMap
   */
  _sourceMapLoaded(script, uiSourceCodePath, sourceMap) {
    WebInspector.blackboxManager.sourceMapLoaded(script, sourceMap);

    this._stubUISourceCodes.delete(script.scriptId);
    this._stubProject.removeFile(uiSourceCodePath);

    if (!sourceMap) {
      this._debuggerWorkspaceBinding.updateLocations(script);
      return;
    }

    if (this._scriptForSourceMap.get(sourceMap)) {
      this._sourceMapForScriptId.set(script.scriptId, sourceMap);
      this._debuggerWorkspaceBinding.updateLocations(script);
      return;
    }

    this._sourceMapForScriptId.set(script.scriptId, sourceMap);
    this._scriptForSourceMap.set(sourceMap, script);

    // Report sources.
    var missingSources = [];
    for (var sourceURL of sourceMap.sourceURLs()) {
      if (this._sourceMapForURL.get(sourceURL))
        continue;
      this._sourceMapForURL.set(sourceURL, sourceMap);
      var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(sourceURL, script);
      if (!uiSourceCode) {
        var contentProvider = sourceMap.sourceContentProvider(sourceURL, WebInspector.resourceTypes.SourceMapScript);
        var embeddedContent = sourceMap.embeddedContentByURL(sourceURL);
        var embeddedContentLength = typeof embeddedContent === 'string' ? embeddedContent.length : null;
        uiSourceCode = this._networkProject.addFile(
            contentProvider, WebInspector.ResourceTreeFrame.fromScript(script), script.isContentScript(),
            embeddedContentLength);
        uiSourceCode[WebInspector.CompilerScriptMapping._originSymbol] = script.sourceURL;
      }
      if (uiSourceCode) {
        this._bindUISourceCode(uiSourceCode);
      } else {
        if (missingSources.length < 3)
          missingSources.push(sourceURL);
        else if (missingSources.peekLast() !== '\u2026')
          missingSources.push('\u2026');
      }
    }
    if (missingSources.length) {
      WebInspector.console.warn(WebInspector.UIString(
          'Source map %s points to the files missing from the workspace: [%s]', sourceMap.url(),
          missingSources.join(', ')));
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
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  uiLineHasMapping(uiSourceCode, lineNumber) {
    var sourceMap = this._sourceMapForURL.get(uiSourceCode.url());
    if (!sourceMap)
      return true;
    return !!sourceMap.firstSourceLineMapping(uiSourceCode.url(), lineNumber);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _bindUISourceCode(uiSourceCode) {
    this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, this);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _unbindUISourceCode(uiSourceCode) {
    this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, null);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _uiSourceCodeAddedToWorkspace(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    if (!this._sourceMapForURL.get(uiSourceCode.url()))
      return;
    this._bindUISourceCode(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Script} script
   * @return {!Promise<?WebInspector.TextSourceMap>}
   */
  _loadSourceMapForScript(script) {
    // script.sourceURL can be a random string, but is generally an absolute path -> complete it to inspected page url for
    // relative links.
    var scriptURL = WebInspector.ParsedURL.completeURL(this._target.inspectedURL(), script.sourceURL);
    if (!scriptURL)
      return Promise.resolve(/** @type {?WebInspector.TextSourceMap} */ (null));

    console.assert(script.sourceMapURL);
    var scriptSourceMapURL = /** @type {string} */ (script.sourceMapURL);

    var sourceMapURL = WebInspector.ParsedURL.completeURL(scriptURL, scriptSourceMapURL);
    if (!sourceMapURL)
      return Promise.resolve(/** @type {?WebInspector.TextSourceMap} */ (null));

    var loadingPromise = this._sourceMapLoadingPromises.get(sourceMapURL);
    if (!loadingPromise) {
      loadingPromise =
          WebInspector.TextSourceMap.load(sourceMapURL, scriptURL).then(sourceMapLoaded.bind(this, sourceMapURL));
      this._sourceMapLoadingPromises.set(sourceMapURL, loadingPromise);
    }
    return loadingPromise;

    /**
     * @param {string} url
     * @param {?WebInspector.TextSourceMap} sourceMap
     * @this {WebInspector.CompilerScriptMapping}
     */
    function sourceMapLoaded(url, sourceMap) {
      if (!sourceMap) {
        this._sourceMapLoadingPromises.delete(url);
        return null;
      }

      return sourceMap;
    }
  }

  _debuggerReset() {
    /**
     * @param {!WebInspector.TextSourceMap} sourceMap
     * @this {WebInspector.CompilerScriptMapping}
     */
    function unbindSourceMapSources(sourceMap) {
      var script = this._scriptForSourceMap.get(sourceMap);
      if (!script)
        return;
      for (var sourceURL of sourceMap.sourceURLs()) {
        var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(sourceURL, script);
        if (uiSourceCode)
          this._unbindUISourceCode(uiSourceCode);
      }
    }

    this._sourceMapForURL.valuesArray().forEach(unbindSourceMapSources.bind(this));

    this._sourceMapLoadingPromises.clear();
    this._sourceMapForScriptId.clear();
    this._scriptForSourceMap.clear();
    this._sourceMapForURL.clear();
  }

  dispose() {
    WebInspector.EventTarget.removeEventListeners(this._eventListeners);
    this._debuggerReset();
    this._stubProject.dispose();
  }
};

WebInspector.CompilerScriptMapping._originSymbol = Symbol('origin');


