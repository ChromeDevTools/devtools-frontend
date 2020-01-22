// Copyright 2020 the Chromium project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class DebuggerLanguagePluginManager {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this._sourceMapManager = debuggerModel.sourceMapManager();
    this._debuggerModel = debuggerModel;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this._plugins = [];

    // @type {!Map<!Workspace.UISourceCode, !Array<[string, !SDK.Script]>>}
    this._uiSourceCodes = new Map();
    // @type {!Map<string, !DebuggerLanguagePlugin>}
    this._pluginForScriptId = new Map();

    const target = this._debuggerModel.target();
    this._project = new Bindings.ContentProviderBasedProject(
        workspace, 'language_plugins::' + target.id(), Workspace.projectTypes.Network, '',
        false /* isServiceProject */);
    Bindings.NetworkProject.setTargetForProject(this._project, target);

    const runtimeModel = debuggerModel.runtimeModel();
    this._eventHandlers = [
      this._sourceMapManager.addEventListener(
          SDK.SourceMapManager.Events.SourceMapWillAttach, this._newSourceMap, this),
      runtimeModel.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextDestroyed, this._executionContextDestroyed, this)
    ];
  }

  /**
   * @param {!DebuggerLanguagePlugin} plugin
   */
  addPlugin(plugin) {
    this._plugins.push(plugin);
  }

  /** TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  /* async */ rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const plugin = this._pluginForScriptId.get(script.scriptId);
    if (!plugin) {
      return null;
    }

    const pluginLocation = {
      rawModuleId: script.scriptId,
      // RawLocation.columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - script.columnOffset
    };
    const sourceLocations = plugin.rawLocationToSourceLocation(pluginLocation);

    if (!sourceLocations || sourceLocations.length === 0) {
      return null;
    }

    // TODO(chromium:1044536) Support multiple UI locations.
    const sourceLocation = sourceLocations[0];

    const sourceFileURL =
        DebuggerLanguagePluginManager._makeUISourceFileURL(sourceLocation.sourceFile, new URL(script.sourceURL).origin);
    if (sourceFileURL === null) {
      return null;
    }
    const uiSourceCode = this._project.uiSourceCodeForURL(sourceFileURL.toString());
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation(sourceLocation.lineNumber, sourceLocation.columnNumber);
  }

  /** TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  /* async */ uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locations = [];
    for (const [sourceFile, script] of this._uiSourceCodes.get(uiSourceCode) || []) {
      const plugin = this._pluginForScriptId.get(script.scriptId);
      if (!plugin) {
        continue;
      }
      locations.push(...getLocations(this._debuggerModel, plugin, sourceFile, script));
    }
    return locations;

    function getLocations(debuggerModel, plugin, sourceFile, script) {
      const pluginLocation =
          {rawModuleId: script.scriptId, sourceFile: sourceFile, lineNumber: lineNumber, columnNumber: columnNumber};

      const rawLocations = plugin.sourceLocationToRawLocation(pluginLocation);
      if (!rawLocations || rawLocations.length === 0) {
        return [];
      }

      return rawLocations.map(
          m => new SDK.DebuggerModel.Location(
              debuggerModel, script.scriptId, 0, Number(m.codeOffset) + script.columnOffset));
    }
  }

  async _getRawModule(script) {
    if (!script.sourceURL.startsWith('wasm://')) {
      return {url: script.sourceURL};
    }
    return {code: await script.getWasmBytecode()};
  }

  /**
   * @param {!SDK.Script} script
   * @return {!Promise<?Array<string>>}
   */
  async _getSourceFiles(script) {
    for (const plugin of this._plugins) {
      if (plugin.handleScript(script)) {
        const rawModule = await this._getRawModule(script);
        const sourceFiles = await plugin.addRawModule(script.scriptId, script.sourceMapURL, rawModule);
        if (!sourceFiles) {
          continue;
        }
        this._pluginForScriptId.set(script.scriptId, plugin);
        return sourceFiles;
      }
    }
    return null;
  }

  /**
   * @param {string} filename
   * @param {string=} baseURL
   * @return {?URL}
   */
  static _makeUISourceFileURL(filename, baseURL) {
    function makeUrl(filename) {
      try {
        const url = new URL(filename);
        if (url.protocol !== 'file:' || !url.hostname) {
          return url;
        }
      } catch (error) {
        if (!(error instanceof TypeError)) {
          throw error;
        }
      }
      return null;
    }
    return makeUrl(filename) || makeUrl('file://' + filename) || new URL(filename, baseURL);
  }

  /**
   * @param {string} sourceFileURL
   * @return {!Workspace.UISourceCode}
   */
  _getOrCreateUISourceCode(sourceFile, script, sourceFileURL) {
    let uiSourceCode = this._project.uiSourceCodeForURL(sourceFileURL);
    if (uiSourceCode) {
      return uiSourceCode;
    }

    uiSourceCode = this._project.createUISourceCode(sourceFileURL, Common.resourceTypes.SourceMapScript);
    Bindings.NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
    const contentProvider =
        new SDK.CompilerSourceMappingContentProvider(sourceFileURL, Common.resourceTypes.SourceMapScript);
    this._bindUISourceCode(uiSourceCode, script, sourceFile);

    // TODO(pfaffe) Try and set a correct mimetype here? We don't actually know the mime type of the source code here,
    // and there might not even be one for the respective language which only the plugin knows about.
    this._project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, 'text/javascript');
    return uiSourceCode;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!SDK.Script} script
   * @param {string} sourceFile
   */
  _bindUISourceCode(uiSourceCode, script, sourceFile) {
    const entry = this._uiSourceCodes.get(uiSourceCode);
    if (entry) {
      entry.push([sourceFile, script]);
    } else {
      this._uiSourceCodes.set(uiSourceCode, [sourceFile, script]);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Set<!SDK.Script>} scripts
   */
  _unbindUISourceCode(uiSourceCode, scripts) {
    const filter = ([sourceFile, script]) => !scripts.has(script);
    this._uiSourceCodes.set(uiSourceCode, this._uiSourceCodes.get(uiSourceCode).filter(filter));
    if (this._uiSourceCodes.get(uiSourceCode).length === 0) {
      this._project.removeFile(uiSourceCode.url());
      this._uiSourceCodes.delete(uiSourceCode);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  async _newSourceMap(event) {
    const script = /** @type {!SDK.Script} */ (event.data);
    const sourceFiles = await this._getSourceFiles(script);
    if (!sourceFiles) {
      return;
    }

    for (const sourceFile of sourceFiles) {
      const sourceFileURL =
          DebuggerLanguagePluginManager._makeUISourceFileURL(sourceFile, new URL(script.sourceURL).origin);
      if (sourceFileURL === null) {
        return;
      }
      this._getOrCreateUISourceCode(sourceFile, script, sourceFileURL.toString());
    }
    this._debuggerWorkspaceBinding.updateLocations(script);
  }

  /**
   * @param {!Common.Event} event
   */
  _executionContextDestroyed(event) {
    const executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    const scripts = new Set(this._debuggerModel.scriptsForExecutionContext(executionContext));

    for (const uiSourceCode of this._uiSourceCodes.keys()) {
      this._unbindUISourceCode(uiSourceCode, scripts);
    }

    for (const script of scripts) {
      this._pluginForScriptId.delete(script.scriptId);
    }
  }

  dispose() {
    this._project.dispose();
    for (const plugin of this._plugins) {
      if (plugin.dispose) {
        plugin.dispose();
      }
    }
    this._pluginForScriptId.clear();
    this._uiSourceCodes.clear();
  }
}

export class DebuggerLanguagePluginError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'DebuggerLanguagePluginError';
  }
}

/** Raw modules represent compiled JavaScript Scripts or Wasm Modules
 * @typedef {{
 *            url:string,
 *            code:string
 *          }}
 */
export let RawModule;

/** Offsets in raw modules
 * @typedef {{
 *            rawModuleId:string,
 *            codeOffset:number
 *          }}
 */
export let RawLocation;

/** Locations in source files
 * @typedef {{
 *            sourceFile:string,
 *            lineNumber:number,
 *            columnNumber:number
 *          }}
 */
export let SourceLocation;

/** A source language variable
 * @typedef {{
 *            scope:string,
 *            name:string,
 *            type:string
 *          }}
 */
export let Variable;


/**
 * @interface
 */
export class DebuggerLanguagePlugin {
  /**
   * @param {!SDK.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
  }

  dispose() {
  }

  /** Notify the plugin about a new script
   * @param {string} rawModuleId
   * @param {string} symbolsURL - URL of a file providing the debug symbols for this module
   * @param {!RawModule} rawModule
   * @return {!Promise<!Array<string>>} - An array of absolute or relative URLs for the source files for the raw module
   * @throws {DebuggerLanguagePluginError}
  */
  async addRawModule(rawModuleId, symbolsURL, rawModule) {
  }

  /** Find locations in raw modules from a location in a source file
   * TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @param {!SourceLocation} sourceLocation
   * @return {!Array<!RawLocation>}
   * @throws {DebuggerLanguagePluginError}
  */
  /* async*/ sourceLocationToRawLocation(sourceLocation) {
  }

  /** Find locations in source files from a location in a raw module
   * TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @param {!RawLocation} rawLocation
   * @return {!Array<!SourceLocation>}
   * @throws {DebuggerLanguagePluginError}
  */
  /* async*/ rawLocationToSourceLocation(rawLocation) {
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!Variable>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async listVariablesInScope(rawLocation) {
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @param {string} name
   * @param {!RawLocation} location
   * @return {!Promise<?RawModule>}
   * @throws {DebuggerLanguagePluginError}
  */
  async evaluateVariable(name, location) {
  }
}
