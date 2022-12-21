// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import {type Chrome} from '../../../extension-api/ExtensionAPI.js';  // eslint-disable-line rulesdir/es_modules_import
import {ExtensionEndpoint} from './ExtensionEndpoint.js';

import {PrivateAPI} from './ExtensionAPI.js';

class LanguageExtensionEndpointImpl extends ExtensionEndpoint {
  private plugin: LanguageExtensionEndpoint;
  constructor(plugin: LanguageExtensionEndpoint, port: MessagePort) {
    super(port);
    this.plugin = plugin;
  }
  protected handleEvent({event}: {event: string}): void {
    switch (event) {
      case PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin: {
        this.disconnect();
        const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
        if (pluginManager) {
          pluginManager.removePlugin(this.plugin);
        }
        break;
      }
    }
  }
}

export class LanguageExtensionEndpoint implements Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
  private readonly supportedScriptTypes: {
    language: string,
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/naming-convention
    symbol_types: Array<string>,
  };
  private endpoint: LanguageExtensionEndpointImpl;
  name: string;

  constructor(
      name: string, supportedScriptTypes: {
        language: string,
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/naming-convention
        symbol_types: Array<string>,
      },
      port: MessagePort) {
    this.name = name;
    this.supportedScriptTypes = supportedScriptTypes;
    this.endpoint = new LanguageExtensionEndpointImpl(this, port);
  }

  handleScript(script: SDK.Script.Script): boolean {
    const language = script.scriptLanguage();
    return language !== null && script.debugSymbols !== null && language === this.supportedScriptTypes.language &&
        this.supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
  }

  /** Notify the plugin about a new script
   */
  addRawModule(rawModuleId: string, symbolsURL: string, rawModule: Chrome.DevTools.RawModule): Promise<string[]> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.AddRawModule, {rawModuleId, symbolsURL, rawModule}) as
        Promise<string[]>;
  }

  /**
   * Notifies the plugin that a script is removed.
   */
  removeRawModule(rawModuleId: string): Promise<void> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule, {rawModuleId}) as
        Promise<void>;
  }

  /** Find locations in raw modules from a location in a source file
   */
  sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation, {sourceLocation}) as
        Promise<Chrome.DevTools.RawLocationRange[]>;
  }

  /** Find locations in source files from a location in a raw module
   */
  rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.SourceLocation[]> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation, {rawLocation}) as
        Promise<Chrome.DevTools.SourceLocation[]>;
  }

  getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo, {type}) as
        Promise<Chrome.DevTools.ScopeInfo>;
  }

  /** List all variables in lexical scope at a given location in a raw module
   */
  listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope, {rawLocation}) as
        Promise<Chrome.DevTools.Variable[]>;
  }

  /** List all function names (including inlined frames) at location
   */
  getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation): Promise<{
    frames: Array<Chrome.DevTools.FunctionInfo>,
  }> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo, {rawLocation}) as
        Promise<{
             frames: Array<Chrome.DevTools.FunctionInfo>,
           }>;
  }

  /** Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in.
   */
  getInlinedFunctionRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges, {rawLocation}) as
        Promise<Chrome.DevTools.RawLocationRange[]>;
  }

  /** Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   */
  getInlinedCalleesRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges, {rawLocation}) as
        Promise<Chrome.DevTools.RawLocationRange[]>;
  }

  getTypeInfo(expression: string, context: Chrome.DevTools.RawLocation): Promise<{
    typeInfos: Array<Chrome.DevTools.TypeInfo>,
    base: Chrome.DevTools.EvalBase,
  }|null> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetTypeInfo, {expression, context}) as
        Promise<{
             typeInfos: Array<Chrome.DevTools.TypeInfo>,
             base: Chrome.DevTools.EvalBase,
           }|null>;
  }

  getFormatter(
      expressionOrField: string|{
        base: Chrome.DevTools.EvalBase,
        field: Array<Chrome.DevTools.FieldInfo>,
      },
      context: Chrome.DevTools.RawLocation): Promise<{
    js: string,
  }> {
    return this.endpoint.sendRequest(
               PrivateAPI.LanguageExtensionPluginCommands.GetFormatter, {expressionOrField, context}) as Promise<{
             js: string,
           }>;
  }

  getInspectableAddress(field: {
    base: Chrome.DevTools.EvalBase,
    field: Array<Chrome.DevTools.FieldInfo>,
  }): Promise<{
    js: string,
  }> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetInspectableAddress, {field}) as
        Promise<{
             js: string,
           }>;
  }

  async getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined> {
    return this.endpoint.sendRequest(
        PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines, {rawModuleId, sourceFileURL});
  }

  evaluate(expression: string, context: Chrome.DevTools.RawLocation, stopId: number):
      Promise<Chrome.DevTools.RemoteObject> {
    return this.endpoint.sendRequest(
        PrivateAPI.LanguageExtensionPluginCommands.FormatValue, {expression, context, stopId});
  }

  getProperties(objectId: Chrome.DevTools.RemoteObjectId): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetProperties, {objectId});
  }

  releaseObject(objectId: Chrome.DevTools.RemoteObjectId): Promise<void> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.ReleaseObject, {objectId});
  }
}
