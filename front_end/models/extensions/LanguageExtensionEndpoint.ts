// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../bindings/bindings.js';

import {PrivateAPI} from './ExtensionAPI.js';
import {ExtensionEndpoint} from './ExtensionEndpoint.js';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isNumberArray = (value: unknown): value is number[] => Array.isArray(value) && value.every(isNumber);

const isRawLocationRange = (value: unknown): value is Chrome.DevTools.RawLocationRange => {
  return isObject(value) && isString(value.rawModuleId) && isNumber(value.startOffset) && isNumber(value.endOffset);
};

const isSourceLocation = (value: unknown): value is Chrome.DevTools.SourceLocation => {
  return isObject(value) && isString(value.rawModuleId) && isString(value.sourceFileURL) &&
      isNumber(value.lineNumber) && isNumber(value.columnNumber);
};

const isVariable = (value: unknown): value is Chrome.DevTools.Variable => {
  return isObject(value) && isString(value.scope) && isString(value.name) && isString(value.type) &&
      (value.nestedName === undefined || isStringArray(value.nestedName));
};

const isScopeInfo = (value: unknown): value is Chrome.DevTools.ScopeInfo => {
  return isObject(value) && isString(value.type) && isString(value.typeName) &&
      (value.icon === undefined || isString(value.icon));
};

const isFunctionInfo = (value: unknown): value is Chrome.DevTools.FunctionInfo => {
  return isObject(value) && isString(value.name);
};

const isForeignObject = (value: unknown): value is Chrome.DevTools.ForeignObject => {
  return isObject(value) && value.type === 'reftype' &&
      (value.valueClass === 'local' || value.valueClass === 'global' || value.valueClass === 'operand') &&
      isNumber(value.index);
};

const isRemoteObject = (value: unknown): value is Chrome.DevTools.RemoteObject => {
  return isObject(value) &&
      (value.type === 'object' || value.type === 'undefined' || value.type === 'string' || value.type === 'number' ||
       value.type === 'boolean' || value.type === 'bigint' || value.type === 'array' || value.type === 'null') &&
      isBoolean(value.hasChildren) && (value.className === undefined || isString(value.className)) &&
      (value.description === undefined || isString(value.description)) &&
      (value.objectId === undefined || isString(value.objectId)) &&
      (value.linearMemoryAddress === undefined || isNumber(value.linearMemoryAddress)) &&
      (value.linearMemorySize === undefined || isNumber(value.linearMemorySize));
};

const isPropertyDescriptor = (value: unknown): value is Chrome.DevTools.PropertyDescriptor => {
  return isObject(value) && isString(value.name) && (isRemoteObject(value.value) || isForeignObject(value.value));
};

const isAddRawModuleResult = (value: unknown): value is string[]|{missingSymbolFiles: string[]} => {
  return isStringArray(value) || (isObject(value) && isStringArray(value.missingSymbolFiles));
};

const isGetFunctionInfoResult =
    (value: unknown): value is {frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
    {missingSymbolFiles: string[]}|{frames: Chrome.DevTools.FunctionInfo[]} => {
      if (!isObject(value)) {
        return false;
      }
      if ('frames' in value && (!Array.isArray(value.frames) || !value.frames.every(isFunctionInfo))) {
        return false;
      }
      if ('missingSymbolFiles' in value && !isStringArray(value.missingSymbolFiles)) {
        return false;
      }
      return 'frames' in value || 'missingSymbolFiles' in value;
    };

class LanguageExtensionEndpointImpl extends ExtensionEndpoint {
  private plugin: LanguageExtensionEndpoint;
  #pluginManager: Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager;
  constructor(plugin: LanguageExtensionEndpoint, port: Platform.HostRuntime.WorkerMessagePort,
              pluginManager: Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager) {
    super(port);
    this.plugin = plugin;
    this.#pluginManager = pluginManager;
  }
  protected override handleEvent({event}: {event: string}): void {
    switch (event) {
      case PrivateAPI.LanguageExtensionPluginEvents.UnregisteredLanguageExtensionPlugin: {
        this.disconnect();
        this.#pluginManager.removePlugin(this.plugin);
        break;
      }
    }
  }
}

export class LanguageExtensionEndpoint implements Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
  private readonly supportedScriptTypes: {
    language: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    symbol_types: string[],
  };
  private readonly endpoint: LanguageExtensionEndpointImpl;
  private readonly extensionOrigin: string;
  readonly allowFileAccess: boolean;
  readonly name: string;

  constructor(allowFileAccess: boolean, extensionOrigin: string, name: string, supportedScriptTypes: {
    language: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    symbol_types: string[],
  },
              port: Platform.HostRuntime.WorkerMessagePort,
              pluginManager: Bindings.DebuggerLanguagePlugins.DebuggerLanguagePluginManager) {
    this.name = name;
    this.extensionOrigin = extensionOrigin;
    this.supportedScriptTypes = supportedScriptTypes;
    this.endpoint = new LanguageExtensionEndpointImpl(this, port, pluginManager);
    this.allowFileAccess = allowFileAccess;
  }

  canAccessURL(url: string): boolean {
    try {
      return !url || this.allowFileAccess || new URL(url).protocol !== 'file:';
    } catch {
      // If the URL isn't valid, it also isn't a valid file url and it's safe to tell the extensions about it.
      return true;
    }
  }

  handleScript(script: SDK.Script.Script): boolean {
    try {
      if (!this.canAccessURL(script.contentURL()) || (script.hasSourceURL && !this.canAccessURL(script.sourceURL)) ||
          (script.debugSymbols?.externalURL && !this.canAccessURL(script.debugSymbols.externalURL))) {
        return false;
      }
    } catch {
      return false;
    }
    const language = script.scriptLanguage();
    return language !== null && script.debugSymbols !== null && language === this.supportedScriptTypes.language &&
        this.supportedScriptTypes.symbol_types.includes(script.debugSymbols.type);
  }

  createPageResourceLoadInitiator(): SDK.PageResourceLoader.PageResourceLoadInitiator {
    return {
      target: null,
      frameId: null,
      extensionId: this.extensionOrigin,
      initiatorUrl: this.extensionOrigin as Platform.DevToolsPath.UrlString,
    };
  }

  /**
   * Notify the plugin about a new script
   */
  addRawModule(rawModuleId: string, symbolsURL: string,
               rawModule: Chrome.DevTools.RawModule): Promise<string[]|{missingSymbolFiles: string[]}> {
    if (!this.canAccessURL(symbolsURL) || !this.canAccessURL(rawModule.url)) {
      return Promise.resolve([]);
    }
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.AddRawModule,
                                     {rawModuleId, symbolsURL, rawModule}, isAddRawModuleResult);
  }

  /**
   * Notifies the plugin that a script is removed.
   */
  removeRawModule(rawModuleId: string): Promise<void> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.RemoveRawModule, {rawModuleId});
  }

  /**
   * Find locations in raw modules from a location in a source file
   */
  sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.SourceLocationToRawLocation,
                                     {sourceLocation},
                                     (value): value is Chrome.DevTools.RawLocationRange[] =>
                                         Array.isArray(value) && value.every(isRawLocationRange));
  }

  /**
   * Find locations in source files from a location in a raw module
   */
  rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.SourceLocation[]> {
    return this.endpoint.sendRequest(
        PrivateAPI.LanguageExtensionPluginCommands.RawLocationToSourceLocation, {rawLocation},
        (value): value is Chrome.DevTools.SourceLocation[] => Array.isArray(value) && value.every(isSourceLocation));
  }

  getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetScopeInfo, {type}, isScopeInfo);
  }

  /**
   * List all variables in lexical scope at a given location in a raw module
   */
  listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    return this.endpoint.sendRequest(
        PrivateAPI.LanguageExtensionPluginCommands.ListVariablesInScope, {rawLocation},
        (value): value is Chrome.DevTools.Variable[] => Array.isArray(value) && value.every(isVariable));
  }

  /**
   * List all function names (including inlined frames) at location
   */
  getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation):
      Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|{missingSymbolFiles: string[]}|
              {frames: Chrome.DevTools.FunctionInfo[]}> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetFunctionInfo, {rawLocation},
                                     isGetFunctionInfoResult);
  }

  /**
   * Find locations in raw modules corresponding to the inline function
   *  that rawLocation is in.
   */
  getInlinedFunctionRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetInlinedFunctionRanges, {rawLocation},
                                     (value): value is Chrome.DevTools.RawLocationRange[] =>
                                         Array.isArray(value) && value.every(isRawLocationRange));
  }

  /**
   * Find locations in raw modules corresponding to inline functions
   *  called by the function or inline frame that rawLocation is in.
   */
  getInlinedCalleesRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetInlinedCalleesRanges, {rawLocation},
                                     (value): value is Chrome.DevTools.RawLocationRange[] =>
                                         Array.isArray(value) && value.every(isRawLocationRange));
  }

  async getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined> {
    return await this.endpoint.sendRequest(
        PrivateAPI.LanguageExtensionPluginCommands.GetMappedLines, {rawModuleId, sourceFileURL},
        (value): value is number[]|undefined => value === undefined || isNumberArray(value));
  }

  async evaluate(expression: string, context: Chrome.DevTools.RawLocation,
                 stopId: number): Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|null> {
    return await this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.FormatValue,
                                           {expression, context, stopId},
                                           (value): value is Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|
                                           null => value === null || isRemoteObject(value) || isForeignObject(value));
  }

  getProperties(objectId: Chrome.DevTools.RemoteObjectId): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.GetProperties, {objectId},
                                     (value): value is Chrome.DevTools.PropertyDescriptor[] =>
                                         Array.isArray(value) && value.every(isPropertyDescriptor));
  }

  releaseObject(objectId: Chrome.DevTools.RemoteObjectId): Promise<void> {
    return this.endpoint.sendRequest(PrivateAPI.LanguageExtensionPluginCommands.ReleaseObject, {objectId});
  }
}
