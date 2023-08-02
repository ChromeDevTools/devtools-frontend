// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DEFAULT_MODULE_CONFIGURATIONS, type ModuleConfigurations} from './ModuleConfiguration.js';
import {type Chrome} from '../../../extension-api/ExtensionAPI.js';

import {WorkerRPC, type AsyncHostInterface, type WorkerInterface} from './WorkerRPC.js';
import {type WasmValue} from './WasmTypes.js';

export class WorkerPlugin implements Chrome.DevTools.LanguageExtensionPlugin, AsyncHostInterface {
  private readonly worker: Worker;
  private readonly rpc: WorkerRPC<AsyncHostInterface, WorkerInterface>;

  constructor() {
    this.worker = new Worker('DevToolsPluginWorkerMain.bundle.js', {type: 'module'});
    this.rpc = new WorkerRPC<AsyncHostInterface, WorkerInterface>(this.worker, this);
  }
  getWasmLinearMemory(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer> {
    return chrome.devtools.languageServices.getWasmLinearMemory(offset, length, stopId);
  }
  getWasmLocal(local: number, stopId: unknown): Promise<WasmValue> {
    return chrome.devtools.languageServices.getWasmLocal(local, stopId);
  }
  getWasmGlobal(global: number, stopId: unknown): Promise<WasmValue> {
    return chrome.devtools.languageServices.getWasmGlobal(global, stopId);
  }
  getWasmOp(op: number, stopId: unknown): Promise<WasmValue> {
    return chrome.devtools.languageServices.getWasmOp(op, stopId);
  }

  static async create(
      moduleConfigurations: ModuleConfigurations = DEFAULT_MODULE_CONFIGURATIONS,
      logPluginApiCalls: boolean = false): Promise<WorkerPlugin> {
    const plugin = new WorkerPlugin();
    await plugin.rpc.sendMessage('hello', moduleConfigurations, logPluginApiCalls);
    return plugin;
  }

  addRawModule(rawModuleId: string, symbolsURL: string, rawModule: Chrome.DevTools.RawModule): Promise<string[]|{
    missingSymbolFiles: string[],
  }> {
    return this.rpc.sendMessage('addRawModule', rawModuleId, symbolsURL, rawModule);
  }

  removeRawModule(rawModuleId: string): Promise<void> {
    return this.rpc.sendMessage('removeRawModule', rawModuleId);
  }

  sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.rpc.sendMessage('sourceLocationToRawLocation', sourceLocation);
  }

  rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.SourceLocation[]> {
    return this.rpc.sendMessage('rawLocationToSourceLocation', rawLocation);
  }

  getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo> {
    return this.rpc.sendMessage('getScopeInfo', type);
  }

  listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    return this.rpc.sendMessage('listVariablesInScope', rawLocation);
  }

  getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation):
      Promise<{frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
    return this.rpc.sendMessage('getFunctionInfo', rawLocation);
  }

  getInlinedFunctionRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.rpc.sendMessage('getInlinedFunctionRanges', rawLocation);
  }

  getInlinedCalleesRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.rpc.sendMessage('getInlinedCalleesRanges', rawLocation);
  }

  getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined> {
    return this.rpc.sendMessage('getMappedLines', rawModuleId, sourceFileURL);
  }

  evaluate(expression: string, context: Chrome.DevTools.RawLocation, stopId: unknown):
      Promise<Chrome.DevTools.RemoteObject|null> {
    return this.rpc.sendMessage('evaluate', expression, context, stopId);
  }

  getProperties(objectId: Chrome.DevTools.RemoteObjectId): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    return this.rpc.sendMessage('getProperties', objectId);
  }

  releaseObject(objectId: Chrome.DevTools.RemoteObjectId): Promise<void> {
    return this.rpc.sendMessage('releaseObject', objectId);
  }
}

export interface Storage {
  onChanged: Chrome.DevTools
      .EventSink<(changes: {[key: string]: {oldValue: unknown, newValue: unknown}}, namespace: string) => unknown>;
  local:
      {set<ResultT>(value: ResultT): void, get<ResultT>(keys: ResultT, callback: (result: ResultT) => unknown): void};
}

export declare const chrome: Chrome.DevTools.Chrome&{storage?: Storage};

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
  const {storage} = chrome;
  const {languageServices} = chrome.devtools;

  async function registerPlugin(moduleConfigurations: ModuleConfigurations, logPluginApiCalls: boolean):
      Promise<Chrome.DevTools.LanguageExtensionPlugin> {
    const plugin = await WorkerPlugin.create(moduleConfigurations, logPluginApiCalls);
    await languageServices.registerLanguageExtensionPlugin(
        plugin, 'C/C++ DevTools Support (DWARF)',
        {language: 'WebAssembly', symbol_types: ['EmbeddedDWARF', 'ExternalDWARF']});
    return plugin;
  }

  async function unregisterPlugin(plugin: Chrome.DevTools.LanguageExtensionPlugin): Promise<void> {
    await languageServices.unregisterLanguageExtensionPlugin(plugin);
  }

  const defaultConfig = {
    'moduleConfigurations': DEFAULT_MODULE_CONFIGURATIONS,
    'logPluginApiCalls': false,
  };
  chrome.storage.local.get(defaultConfig, ({moduleConfigurations, logPluginApiCalls}) => {
    let pluginPromise = registerPlugin(moduleConfigurations, logPluginApiCalls);
    storage.onChanged.addListener(changes => {
      // Note that this doesn't use optional chaining '?.' as it is problematic in vscode.
      const moduleConfigurations =
          changes['moduleConfigurations'] !== undefined ? changes['moduleConfigurations'].newValue : undefined;
      const logPluginApiCalls =
          changes['logPluginApiCalls'] !== undefined ? changes['logPluginApiCalls'].newValue : undefined;
      if (moduleConfigurations || logPluginApiCalls !== undefined) {
        storage.local.get(defaultConfig, ({moduleConfigurations, logPluginApiCalls}) => {
          pluginPromise =
              pluginPromise.then(unregisterPlugin).then(() => registerPlugin(moduleConfigurations, logPluginApiCalls));
        });
      }
    });
  });
}
