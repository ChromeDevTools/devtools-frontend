// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as SDK from '../../core/sdk/sdk.js';         // eslint-disable-line no-unused-vars
import * as Bindings from '../bindings/bindings.js';  // eslint-disable-line no-unused-vars

export class LanguageExtensionEndpoint extends Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _commands: any;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _events: any;
  _supportedScriptTypes: {
    language: string,
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    symbol_types: Array<string>,
  };
  _port: MessagePort;
  _nextRequestId: number;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _pendingRequests: Map<any, any>;
  constructor(
      name: string, supportedScriptTypes: {
        language: string,
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/naming-convention
        symbol_types: Array<string>,
      },
      port: MessagePort) {
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

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _sendRequest(method: string, parameters: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = this._nextRequestId++;
      this._pendingRequests.set(requestId, {resolve, reject});
      this._port.postMessage({requestId, method, parameters});
    });
  }

  _onResponse({data}: MessageEvent<{
    requestId: number,
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any,
    error: Error|null,
  }|{
    event: string,
  }>): void {
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

  handleScript(script: SDK.Script.Script): boolean {
    const language = script.scriptLanguage();
    return language !== null && script.debugSymbols !== null && language === this._supportedScriptTypes.language &&
        this._supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
  }

  /** Notify the plugin about a new script
     */
  addRawModule(rawModuleId: string, symbolsURL: string, rawModule: Bindings.DebuggerLanguagePlugins.RawModule):
      Promise<string[]> {
    return /** @type {!Promise<!Array<string>>} */ this._sendRequest(
               this._commands.AddRawModule, {rawModuleId, symbolsURL, rawModule}) as Promise<string[]>;
  }

  /**
   * Notifies the plugin that a script is removed.
   */
  removeRawModule(rawModuleId: string): Promise<void> {
    return /** @type {!Promise<void>} */ this._sendRequest(this._commands.RemoveRawModule, {rawModuleId}) as
        Promise<void>;
  }

  /** Find locations in raw modules from a location in a source file
     */
  sourceLocationToRawLocation(sourceLocation: Bindings.DebuggerLanguagePlugins.SourceLocation):
      Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]> {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ this._sendRequest(
               this._commands.SourceLocationToRawLocation, {sourceLocation}) as
        Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]>;
  }

  /** Find locations in source files from a location in a raw module
     */
  rawLocationToSourceLocation(rawLocation: Bindings.DebuggerLanguagePlugins.RawLocation):
      Promise<Bindings.DebuggerLanguagePlugins.SourceLocation[]> {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.SourceLocation>>} */ this._sendRequest(
               this._commands.RawLocationToSourceLocation, {rawLocation}) as
        Promise<Bindings.DebuggerLanguagePlugins.SourceLocation[]>;
  }

  getScopeInfo(type: string): Promise<Bindings.DebuggerLanguagePlugins.ScopeInfo> {
    return /** @type {!Promise<!Bindings.DebuggerLanguagePlugins.ScopeInfo>} */ this._sendRequest(
               this._commands.GetScopeInfo, {type}) as Promise<Bindings.DebuggerLanguagePlugins.ScopeInfo>;
  }

  /** List all variables in lexical scope at a given location in a raw module
     */
  listVariablesInScope(rawLocation: Bindings.DebuggerLanguagePlugins.RawLocation):
      Promise<Bindings.DebuggerLanguagePlugins.Variable[]> {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.Variable>>} */ this._sendRequest(
               this._commands.ListVariablesInScope, {rawLocation}) as
        Promise<Bindings.DebuggerLanguagePlugins.Variable[]>;
  }

  /** List all function names (including inlined frames) at location
     */
  getFunctionInfo(rawLocation: Bindings.DebuggerLanguagePlugins.RawLocation): Promise<{
    frames: Array<Bindings.DebuggerLanguagePlugins.FunctionInfo>,
  }> {
    return /** @type {!Promise<!{frames: !Array<!Bindings.DebuggerLanguagePlugins.FunctionInfo>}>} */ this._sendRequest(
               this._commands.GetFunctionInfo, {rawLocation}) as Promise<{
             frames: Array<Bindings.DebuggerLanguagePlugins.FunctionInfo>,
           }>;
  }

  /** Find locations in raw modules corresponding to the inline function
     *  that rawLocation is in.
     */
  getInlinedFunctionRanges(rawLocation: Bindings.DebuggerLanguagePlugins.RawLocation):
      Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]> {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ this._sendRequest(
               this._commands.GetInlinedFunctionRanges, {rawLocation}) as
        Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]>;
  }

  /** Find locations in raw modules corresponding to inline functions
     *  called by the function or inline frame that rawLocation is in.
     */
  getInlinedCalleesRanges(rawLocation: Bindings.DebuggerLanguagePlugins.RawLocation):
      Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]> {
    return /** @type {!Promise<!Array<!Bindings.DebuggerLanguagePlugins.RawLocationRange>>} */ this._sendRequest(
               this._commands.GetInlinedCalleesRanges, {rawLocation}) as
        Promise<Bindings.DebuggerLanguagePlugins.RawLocationRange[]>;
  }

  getTypeInfo(expression: string, context: Bindings.DebuggerLanguagePlugins.RawLocation): Promise<{
    typeInfos: Array<Bindings.DebuggerLanguagePlugins.TypeInfo>,
    base: Bindings.DebuggerLanguagePlugins.EvalBase,
  }|null> {
    return /** @type {!Promise<?{typeInfos: !Array<!Bindings.DebuggerLanguagePlugins.TypeInfo>, base: !Bindings.DebuggerLanguagePlugins.EvalBase}>} */ this
               ._sendRequest(this._commands.GetTypeInfo, {expression, context}) as Promise<{
             typeInfos: Array<Bindings.DebuggerLanguagePlugins.TypeInfo>,
             base: Bindings.DebuggerLanguagePlugins.EvalBase,
           }|null>;
  }

  getFormatter(
      expressionOrField: string|{
        base: Bindings.DebuggerLanguagePlugins.EvalBase,
        field: Array<Bindings.DebuggerLanguagePlugins.FieldInfo>,
      },
      context: Bindings.DebuggerLanguagePlugins.RawLocation): Promise<{
    js: string,
  }> {
    return /** @type {!Promise<!{js: string}>} */ this._sendRequest(
               this._commands.GetFormatter, {expressionOrField, context}) as Promise<{
             js: string,
           }>;
  }

  getInspectableAddress(field: {
    base: Bindings.DebuggerLanguagePlugins.EvalBase,
    field: Array<Bindings.DebuggerLanguagePlugins.FieldInfo>,
  }): Promise<{
    js: string,
  }> {
    return /** @type {!Promise<!{js: string}>}} */ this._sendRequest(this._commands.GetInspectableAddress, {field}) as
        Promise<{
             js: string,
           }>;
  }

  async getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined> {
    return /** {!Promise<!Array<number>|undefined>} */ (
        this._sendRequest(this._commands.GetMappedLines, {rawModuleId, sourceFileURL}));
  }

  dispose(): void {
  }
}
