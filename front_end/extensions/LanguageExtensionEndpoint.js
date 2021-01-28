// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';                 // eslint-disable-line no-unused-vars

export class LanguageExtensionEndpoint extends Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
  /**
   * @param {string} name
   * @param {!{language: string, symbol_types: !Array<string>}} supportedScriptTypes
   * @param {!MessagePort} port
   */
  constructor(name, supportedScriptTypes, port) {
    super(name);
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._commands = Extensions.extensionAPI.LanguageExtensionPluginCommands;
    // @ts-expect-error TODO(crbug.com/1011811): Fix after extensionAPI is migrated.
    this._events = Extensions.extensionAPI.LanguageExtensionPluginEvents;
    this._supportedScriptTypes = supportedScriptTypes;
    this._port = port;
    this._port.onmessage = this._onResponse.bind(this);
    this._nextRequestId = 0;
    this._pendingRequests = new Map();
  }

  /**
   * @param {string} method
   * @param {*} parameters
   * @return {!Promise<*>}
   */
  _sendRequest(method, parameters) {
    return new Promise((resolve, reject) => {
      const requestId = this._nextRequestId++;
      this._pendingRequests.set(requestId, {resolve, reject});
      this._port.postMessage({requestId, method, parameters});
    });
  }

  /**
   * @param {!MessageEvent<!{requestId: number, result: *, error: ?Error} | !{event: string}>} event
   */
  _onResponse({data}) {
    if ('event' in data) {
      const {event} = data;
      switch (event) {
        case this._events.UnregisteredLanguageExtensionPlugin: {
          for (const {reject} of this._pendingRequests.values()) {
            reject(new Error('Language extension endpoint disconnected'));
          }
          this._pendingRequests.clear();
          this._port.close();
          const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
          if (pluginManager) {
            pluginManager.removePlugin(this);
          }
          break;
        }
      }
      return;
    }
    const {requestId, result, error} = data;
    if (!this._pendingRequests.has(requestId)) {
      console.error(`No pending request ${requestId}`);
      return;
    }
    const {resolve, reject} = this._pendingRequests.get(requestId);
    this._pendingRequests.delete(requestId);
    if (error) {
      reject(new Error(error.message));
    } else {
      resolve(result);
    }
  }

  /**
   * @override
   * @param {!SDK.Script.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
    const language = script.scriptLanguage();
    return language !== null && script.debugSymbols !== null && language === this._supportedScriptTypes.language &&
        this._supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
  }

  /** Notify the plugin about a new script
   * @override
   * @param {string} rawModuleId
   * @param {string} symbolsURL - URL of a file providing the debug symbols for this module
   * @param {!Bindings.DebuggerLanguagePlugins.RawModule} rawModule
   * @return {!Promise<!Array<string>>} - An array of URLs for the source files for the raw module
   */
  addRawModule(rawModuleId, symbolsURL, rawModule) {
    return /** @type {!Promise<!Array<string>>} */ (
        this._sendRequest(this._commands.AddRawModule, {rawModuleId, symbolsURL, rawModule}));
  }

  /**
   * Notifies the plugin that a script is removed.
   * @override
   * @param {string} rawModuleId
   * @return {!Promise<void>}
   */
  removeRawModule(rawModuleId) {
    return /** @type {!Promise<void>} */ (this._sendRequest(this._commands.RemoveRawModule, {rawModuleId}));
  }

  /** Find locations in raw modules from a location in a source file
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.SourceLocation} sourceLocation
   * @return {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>}
   */
  sourceLocationToRawLocation(sourceLocation) {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ (
        this._sendRequest(this._commands.SourceLocationToRawLocation, {sourceLocation}));
  }

  /** Find locations in source files from a location in a raw module
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} rawLocation
   * @return {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.SourceLocation>>}
   */
  rawLocationToSourceLocation(rawLocation) {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.SourceLocation>>} */ (
        this._sendRequest(this._commands.RawLocationToSourceLocation, {rawLocation}));
  }

  /**
   * @override
   * @param {string} type
   * @return {!Promise<!Bindings.DebuggerLanguagePlugins.ScopeInfo>}
   */
  getScopeInfo(type) {
    return /** @type {!Promise<!Bindings.DebuggerLanguagePlugins.ScopeInfo>} */ (
        this._sendRequest(this._commands.GetScopeInfo, {type}));
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} rawLocation
   * @return {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.Variable>>}
   */
  listVariablesInScope(rawLocation) {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.Variable>>} */ (
        this._sendRequest(this._commands.ListVariablesInScope, {rawLocation}));
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @override
   * @param {string} name
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} location
   * @return {!Promise<?Bindings.DebuggerLanguagePlugins.EvaluatorModule>}
   */
  evaluateVariable(name, location) {
    return /** @type {!Promise<?Bindings.DebuggerLanguagePlugins.EvaluatorModule>}*/ (
        this._sendRequest(this._commands.EvaluateVariable, {name, location}));
  }

  /** List all function names (including inlined frames) at location
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} rawLocation
   * @return {!Promise<!{frames: !Array<!Bindings.DebuggerLanguagePlugins.FunctionInfo>}>}
   */
  getFunctionInfo(rawLocation) {
    return /** @type {!Promise<!{frames: !Array<!Bindings.DebuggerLanguagePlugins.FunctionInfo>}>} */ (
        this._sendRequest(this._commands.GetFunctionInfo, {rawLocation}));
  }

  /** Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in.
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} rawLocation
   * @return {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>}
   */
  getInlinedFunctionRanges(rawLocation) {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ (
        this._sendRequest(this._commands.GetInlinedFunctionRanges, {rawLocation}));
  }

  /** Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   * @override
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} rawLocation
   * @return {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>}
   */
  getInlinedCalleesRanges(rawLocation) {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ (
        this._sendRequest(this._commands.GetInlinedCalleesRanges, {rawLocation}));
  }

  /**
   * @override
   * @param {string} expression
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} context
   * @return {!Promise<?{typeInfos: !Array<!Bindings.DebuggerLanguagePlugins.TypeInfo>, base: !Bindings.DebuggerLanguagePlugins.EvalBase}>}
   */
  getTypeInfo(expression, context) {
    return /** @type {!Promise<?{typeInfos: !Array<!Bindings.DebuggerLanguagePlugins.TypeInfo>, base: !Bindings.DebuggerLanguagePlugins.EvalBase}>} */ (
        this._sendRequest(this._commands.GetTypeInfo, {expression, context}));
  }

  /**
   * @override
   * @param {string|{base: !Bindings.DebuggerLanguagePlugins.EvalBase, field: !Array<!Bindings.DebuggerLanguagePlugins.FieldInfo>}} expressionOrField
   * @param {!Bindings.DebuggerLanguagePlugins.RawLocation} context
   * @return {!Promise<!{js: string}>}
   */
  getFormatter(expressionOrField, context) {
    return /** @type {!Promise<!{js: string}>} */ (
        this._sendRequest(this._commands.GetFormatter, {expressionOrField, context}));
  }

  /**
   * @override
   * @param {{base: !Bindings.DebuggerLanguagePlugins.EvalBase, field: !Array<!Bindings.DebuggerLanguagePlugins.FieldInfo>}} field
   * @return {!Promise<!{js: string}>}
   */
  getInspectableAddress(field) {
    return /** @type {!Promise<!{js: string}>}} */ (this._sendRequest(this._commands.GetInspectableAddress, {field}));
  }

  /**
   * @override
   * @param {string} rawModuleId
   * @param {string} sourceFileURL
   * @return {!Promise<!Array<number>|undefined>}
   */
  async getMappedLines(rawModuleId, sourceFileURL) {
    return /** {!Promise<!Array<number>|undefined>} */ (
        this._sendRequest(this._commands.GetMappedLines, {rawModuleId, sourceFileURL}));
  }

  /**
   * @override
   */
  dispose() {
  }
}
