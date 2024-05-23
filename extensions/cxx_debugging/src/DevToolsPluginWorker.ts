// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';

import {createPlugin, type ResourceLoader} from './DWARFSymbols.js';
import {type ModuleConfigurations} from './ModuleConfiguration.js';

import {deserializeWasmMemory, deserializeWasmValue, kMaxWasmValueSize, type WasmValue} from './WasmTypes.js';

import {SynchronousIOMessage} from './WorkerRPC.js';
import {WorkerRPC, type Channel, type HostInterface, type WorkerInterface} from './WorkerRPC.js';

class SynchronousLinearMemoryMessage extends SynchronousIOMessage<ArrayBuffer> {
  deserialize(length: number): ArrayBuffer {
    if (length !== this.buffer.byteLength) {
      throw new Error('Expected length to match the internal buffer size');
    }
    return deserializeWasmMemory(this.buffer);
  }
}

class SynchronousWasmValueMessage extends SynchronousIOMessage<WasmValue> {
  deserialize(type: number): WasmValue {
    return deserializeWasmValue(this.buffer, type);
  }
}

export class RPCInterface implements WorkerInterface, HostInterface {
  private readonly rpc: WorkerRPC<WorkerInterface, HostInterface>;
  #plugin?: Chrome.DevTools.LanguageExtensionPlugin;
  private readonly resourceLoader: ResourceLoader;

  get plugin(): Chrome.DevTools.LanguageExtensionPlugin {
    if (!this.#plugin) {
      throw new Error('Worker is not yet initialized');
    }
    return this.#plugin;
  }

  constructor(port: Channel<WorkerInterface, HostInterface>, resourceLoader: ResourceLoader) {
    this.rpc = new WorkerRPC<WorkerInterface, HostInterface>(port, this);
    this.resourceLoader = resourceLoader;
  }

  getWasmLinearMemory(offset: number, length: number, stopId: unknown): ArrayBuffer {
    return this.rpc.sendMessageSync(
        new SynchronousLinearMemoryMessage(length), 'getWasmLinearMemory', offset, length, stopId);
  }
  getWasmLocal(local: number, stopId: unknown): WasmValue {
    return this.rpc.sendMessageSync(new SynchronousWasmValueMessage(kMaxWasmValueSize), 'getWasmLocal', local, stopId);
  }
  getWasmGlobal(global: number, stopId: unknown): WasmValue {
    return this.rpc.sendMessageSync(
        new SynchronousWasmValueMessage(kMaxWasmValueSize), 'getWasmGlobal', global, stopId);
  }
  getWasmOp(op: number, stopId: unknown): WasmValue {
    return this.rpc.sendMessageSync(new SynchronousWasmValueMessage(kMaxWasmValueSize), 'getWasmOp', op, stopId);
  }
  reportResourceLoad(resourceUrl: string, status: {success: boolean, errorMessage?: string, size?: number}):
      Promise<void> {
    return this.rpc.sendMessage('reportResourceLoad', resourceUrl, status);
  }

  evaluate(expression: string, context: Chrome.DevTools.RawLocation, stopId: unknown):
      Promise<Chrome.DevTools.RemoteObject|Chrome.DevTools.ForeignObject|null> {
    if (this.plugin.evaluate) {
      return this.plugin.evaluate(expression, context, stopId);
    }
    return Promise.resolve(null);
  }
  getProperties(objectId: string): Promise<Chrome.DevTools.PropertyDescriptor[]> {
    if (this.plugin.getProperties) {
      return this.plugin.getProperties(objectId);
    }
    return Promise.resolve([]);
  }
  releaseObject(objectId: string): Promise<void> {
    if (this.plugin.releaseObject) {
      return this.plugin.releaseObject(objectId);
    }
    return Promise.resolve();
  }

  addRawModule(rawModuleId: string, symbolsURL: string|undefined, rawModule: Chrome.DevTools.RawModule):
      Promise<string[]|{missingSymbolFiles: string[]}> {
    return this.plugin.addRawModule(rawModuleId, symbolsURL, rawModule);
  }
  sourceLocationToRawLocation(sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.plugin.sourceLocationToRawLocation(sourceLocation);
  }
  rawLocationToSourceLocation(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.SourceLocation[]> {
    return this.plugin.rawLocationToSourceLocation(rawLocation);
  }
  getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo> {
    return this.plugin.getScopeInfo(type);
  }
  listVariablesInScope(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    return this.plugin.listVariablesInScope(rawLocation);
  }
  removeRawModule(rawModuleId: string): Promise<void> {
    return this.plugin.removeRawModule(rawModuleId);
  }
  getFunctionInfo(rawLocation: Chrome.DevTools.RawLocation):
      Promise<{frames: Chrome.DevTools.FunctionInfo[], missingSymbolFiles: string[]}|
              {frames: Chrome.DevTools.FunctionInfo[]}|{missingSymbolFiles: string[]}> {
    return this.plugin.getFunctionInfo(rawLocation);
  }
  getInlinedFunctionRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.plugin.getInlinedFunctionRanges(rawLocation);
  }
  getInlinedCalleesRanges(rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.RawLocationRange[]> {
    return this.plugin.getInlinedCalleesRanges(rawLocation);
  }
  getMappedLines(rawModuleId: string, sourceFileURL: string): Promise<number[]|undefined> {
    return this.plugin.getMappedLines(rawModuleId, sourceFileURL);
  }
  async hello(moduleConfigurations: ModuleConfigurations, logPluginApiCalls: boolean): Promise<void> {
    this.#plugin = await createPlugin(this, this.resourceLoader, moduleConfigurations, logPluginApiCalls);
  }
}
