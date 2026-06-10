// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {WorkerPlugin} from '../src/DevToolsPluginHost.js';
import {createPlugin} from '../src/DWARFSymbols.js';
import {ResourceLoader} from '../src/MEMFSResourceLoader.js';
import {DEFAULT_MODULE_CONFIGURATIONS} from '../src/ModuleConfiguration.js';
import type {WasmValue} from '../src/WasmTypes.js';
import {type AsyncHostInterface, WorkerRPC} from '../src/WorkerRPC.js';

import type {TestWorkerInterface} from './DevToolsPluginTestWorker.js';
import {makeURL, TestHostInterface} from './TestUtils.js';

describe('DevToolsPlugin', () => {
  describe('addRawModule', () => {
    const expectedSources = [makeURL('/build/tests/inputs/hello.c'), makeURL('/build/tests/inputs/printf.h')];
    it('does not race with removeRawModule', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources1Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const sources1 = await sources1Promise;
      assert.deepEqual(sources1, expectedSources);

      const remove1Promise = plugin.removeRawModule('0');
      const sources2Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const [, sources2] = await Promise.all([remove1Promise, sources2Promise]);
      assert.deepEqual(sources2, expectedSources);
    });

    it('does not try to create module file names that contain /', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('?ü', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      assert.deepEqual(sources, expectedSources);
    });

    it('reports missing module', async () => {
      const hostInterface = new TestHostInterface();
      const spy = sinon.spy(hostInterface, 'reportResourceLoad');

      const url = makeURL('/build/tests/inputs/notExistent.s.wasm');
      const plugin = await createPlugin(hostInterface, new ResourceLoader());
      try {
        await plugin.addRawModule('0', '', {url});
      } catch {
      }
      sinon.assert.calledOnceWithExactly(
          spy, url,
          {success: false, errorMessage: `NotFoundError: Unable to load debug symbols from \'${url}\' (Not Found)`});
    });

    it('reports loaded module and potentially missing dwp', async () => {
      const hostInterface = new TestHostInterface();
      const spy = sinon.spy(hostInterface, 'reportResourceLoad');

      const url = makeURL('/build/tests/inputs/hello.s.wasm');
      const plugin = await createPlugin(hostInterface, new ResourceLoader());
      await plugin.addRawModule('0', '', {url});

      const dwpUrl = makeURL('/build/tests/inputs/hello.s.wasm.dwp');
      sinon.assert.calledTwice(spy);
      sinon.assert.calledWith(spy, url, {success: true, size: 401});
      sinon.assert.calledWith(spy, dwpUrl, {success: false, errorMessage: 'Failed to fetch dwp file: Not Found'});
    });

    it('reports loaded dwos', async () => {
      const url = makeURL('/build/tests/inputs/hello-split.wasm');
      const defaultConfig = {
        moduleConfigurations: DEFAULT_MODULE_CONFIGURATIONS,
        logPluginApiCalls: false,
      };

      const plugin = await WorkerPlugin.create(defaultConfig.moduleConfigurations, defaultConfig.logPluginApiCalls);
      const spy = sinon.spy(plugin, 'reportResourceLoad');

      const rawModuleId = 'hello-split.wasm@123456';
      const helloFileURL = makeURL('/build/tests/inputs/hello-split.c');
      const helperFileURL = makeURL('/build/tests/inputs/helper.c');

      const sources = await plugin.addRawModule(rawModuleId, '', {url});
      assert.deepEqual(sources, [helloFileURL, helperFileURL]);

      // Request raw location to trigger access to DWO files.
      await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x9, inlineFrameIndex: 0});
      await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x5, inlineFrameIndex: 0});

      const helloDwoURL = makeURL('/build/tests/inputs/hello-split.dwo');
      const helperDwoURL = makeURL('/build/tests/inputs/helper.dwo');

      // Loaded .wasm, missing .dwp, 2x missing .dwo.
      assert.lengthOf(spy.args, 4);
      sinon.assert.calledWith(spy, helloDwoURL, {success: true, size: 217});
      sinon.assert.calledWith(spy, helperDwoURL, {success: true, size: 207});
    });

    it('reports missing dwos', async () => {
      const url = makeURL('/build/tests/inputs/hello-split-missing-dwo.wasm');
      const defaultConfig = {
        moduleConfigurations: DEFAULT_MODULE_CONFIGURATIONS,
        logPluginApiCalls: false,
      };

      const plugin = await WorkerPlugin.create(defaultConfig.moduleConfigurations, defaultConfig.logPluginApiCalls);
      const spy = sinon.spy(plugin, 'reportResourceLoad');

      const rawModuleId = 'hello-split-missing-dwo.wasm@123456';
      const helloFileURL = makeURL('/build/tests/inputs/hello-split-missing-dwo.c');

      const sources = await plugin.addRawModule(rawModuleId, '', {url});
      assert.deepEqual(sources, [helloFileURL]);

      // Request raw location to trigger access to DWO files.
      await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x5, inlineFrameIndex: 0});

      const helloDwoURL = makeURL('/build/tests/inputs/hello-split-missing-dwo.dwo');

      // Loaded .wasm, missing .dwp, missing .dwo is reported twice, since we try to load
      // the .dwo twice.
      assert.lengthOf(spy.args, 4);
      sinon.assert.calledWith(spy, helloDwoURL,
                              {success: false, errorMessage: `Couldn't load ${helloDwoURL}. Status: 404`});
    });
  });

  describe('rawLocationToSourceLocation', () => {
    it('maps bytecode addresses correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'hello.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/hello.c');
      const header = makeURL('/build/tests/inputs/printf.h');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      assert.deepEqual(sources, [sourceFileURL, header]);
      assert.deepEqual(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x02, inlineFrameIndex: 0}),
                       [{sourceFileURL, rawModuleId, lineNumber: 2, columnNumber: -1}]);
      assert.deepEqual(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x5, inlineFrameIndex: 0}),
                       [{sourceFileURL: header, rawModuleId, lineNumber: 0, columnNumber: -1}]);
    });
  });

  describe('sourceLocationToRawLocation', () => {
    it('maps source locations to ranges correctly in the presence of inlining', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'inline.s.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/inline.c');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      assert.deepEqual(sources, [sourceFileURL]);
      assert.deepEqual(
          await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 0, columnNumber: -1}),
          [{rawModuleId, startOffset: 0x2, endOffset: 0x5}]);
      assert.deepEqual(
          await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 9, columnNumber: -1}),
          [{rawModuleId, startOffset: 0x5, endOffset: 0x6}]);
    });

    it('returns only raw locations for the same line', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'hello.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/hello.c');
      const header = makeURL('/build/tests/inputs/printf.h');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      assert.deepEqual(sources, [sourceFileURL, header]);
      assert.deepEqual(
          await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: -1}), []);
      assert.deepEqual(
          await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 10, columnNumber: -1}), []);
      assert.deepEqual(
          await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 16, columnNumber: -1}), []);
    });
  });

  describe('getScopeInfo', () => {
    it('handles globals, locals, and parameters', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      assert.include(await plugin.getScopeInfo('GLOBAL'), {type: 'GLOBAL', typeName: 'Global'});
      assert.include(await plugin.getScopeInfo('LOCAL'), {type: 'LOCAL', typeName: 'Local'});
      assert.include(await plugin.getScopeInfo('PARAMETER'), {type: 'PARAMETER', typeName: 'Parameter'});
    });
  });

  describe('getInlinedCalleeRanges', () => {
    it('gets inlined callee PC ranges correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      assert.deepEqual(sources, [makeURL('/build/tests/inputs/inline.c')]);

      const ranges = await plugin.getInlinedCalleesRanges({rawModuleId: '0', codeOffset: 0x2, inlineFrameIndex: 0});
      assert.deepEqual(ranges, [{rawModuleId: '0', startOffset: 0x5, endOffset: 0x6}]);
    });
  });

  describe('getInlinedFunctionRanges', () => {
    it('gets inlined function PC ranges correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      assert.deepEqual(sources, [makeURL('/build/tests/inputs/inline.c')]);

      const ranges = await plugin.getInlinedFunctionRanges({rawModuleId: '0', codeOffset: 0x5, inlineFrameIndex: 0});
      assert.deepEqual(ranges, [{rawModuleId: '0', startOffset: 0x5, endOffset: 0x6}]);
    });
  });

  describe('getFunctionInfo', () => {
    it('gets inlined function infos correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      assert.deepEqual(sources, [makeURL('/build/tests/inputs/inline.c')]);

      const functions = await plugin.getFunctionInfo({rawModuleId: '0', codeOffset: 0x5, inlineFrameIndex: 0});
      assert.deepEqual(functions, {frames: [{name: 'callee'}, {name: 'caller'}], missingSymbolFiles: []});
    });
  });

  describe('listVariablesInScope', () => {
    it('lists parameter variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/shadowing.s.wasm')});

      {
        const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x2, inlineFrameIndex: 0});
        assert.deepEqual(variables.map(v => v.scope), ['PARAMETER']);
      }
      {
        const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x3, inlineFrameIndex: 0});
        assert.deepEqual(variables.map(v => v.scope), ['LOCAL']);
      }
    });

    it('lists global variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/globals.s.wasm')});

      const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x6, inlineFrameIndex: 0});
      assert.deepEqual(variables.map(v => v.name), ['::var_separate_cu']);
    });
  });

  describe('getMappedLines', () => {
    it('computes mapped lines correctly.', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      await plugin.addRawModule('hello', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const mappedLines = await plugin.getMappedLines('hello', makeURL('/build/tests/inputs/hello.c'));
      assert.deepEqual(mappedLines, [2]);
    });
  });

  describe('HostInterface', () => {
    it('provides access to wasm state', async () => {
      class TestAsyncHostInterface implements AsyncHostInterface {
        readonly memory = {offset: 1026, length: 5, stopId: 9, result: new Uint8Array([5, 6, 7, 8, 9]).buffer};
        readonly local = {local: 9, stopId: 10, result: {type: 'i32', value: 5} as const};
        readonly global = {global: 10, stopId: 11, result: {type: 'i32', value: 6} as const};
        readonly op = {op: 11, stopId: 12, result: {type: 'i32', value: 7} as const};
        async getWasmLinearMemory(offset: number, length: number, stopId: unknown): Promise<ArrayBuffer> {
          if (offset === this.memory.offset && length === this.memory.length && stopId === this.memory.stopId) {
            return this.memory.result;
          }
          throw new Error('Unexpected arguments to call');
        }
        async getWasmLocal(local: number, stopId: unknown): Promise<WasmValue> {
          if (local === this.local.local && stopId === this.local.stopId) {
            return this.local.result;
          }
          throw new Error('Unexpected arguments to call');
        }
        async getWasmGlobal(global: number, stopId: unknown): Promise<WasmValue> {
          if (global === this.global.global && stopId === this.global.stopId) {
            return this.global.result;
          }
          throw new Error('Unexpected arguments to call');
        }
        async getWasmOp(op: number, stopId: unknown): Promise<WasmValue> {
          if (op === this.op.op && stopId === this.op.stopId) {
            return this.op.result;
          }
          throw new Error('Unexpected arguments to call');
        }
        reportResourceLoad(_resourceUrl: string, _status: {success: boolean, errorMessage?: string, size?: number}):
            Promise<void> {
          throw new Error('Method not implemented.');
        }
      }

      // To be able to test the synchronous API calls we need a worker. In order to test the wasm state APIs explicitely
      // we wrap real RPCInterface that's running on the plugin worker in a test-specific interface that just
      // round-trips the wasm state access calls to here:
      const hostInterface = new TestAsyncHostInterface();
      const worker = new Worker('/build/tests/DevToolsPluginTestWorker.js', {type: 'module'});
      const rpc = new WorkerRPC<AsyncHostInterface, TestWorkerInterface>(worker, hostInterface);

      {
        const {offset, length, stopId, result} = hostInterface.memory;
        const callResult = await rpc.sendMessage('getWasmMemoryForTest', offset, length, stopId);
        assert.deepEqual(callResult, result);
      }
      {
        const {local, stopId, result} = hostInterface.local;
        const callResult = await rpc.sendMessage('getWasmLocalForTest', local, stopId);
        assert.deepEqual(callResult, result);
      }
      {
        const {global, stopId, result} = hostInterface.global;
        const callResult = await rpc.sendMessage('getWasmGlobalForTest', global, stopId);
        assert.deepEqual(callResult, result);
      }
      {
        const {op, stopId, result} = hostInterface.op;
        const callResult = await rpc.sendMessage('getWasmOpForTest', op, stopId);
        assert.deepEqual(callResult, result);
      }
    });
  });

  it('provides a method to report resource loads', async () => {
    class TestAsyncHostInterface implements AsyncHostInterface {
      async getWasmLinearMemory(_offset: number, _length: number, _stopId: unknown): Promise<ArrayBuffer> {
        throw new Error('Method not implemented.');
      }
      async getWasmLocal(_local: number, _stopId: unknown): Promise<WasmValue> {
        throw new Error('Method not implemented.');
      }
      async getWasmGlobal(_global: number, _stopId: unknown): Promise<WasmValue> {
        throw new Error('Method not implemented.');
      }
      async getWasmOp(_op: number, _stopId: unknown): Promise<WasmValue> {
        throw new Error('Method not implemented.');
      }
      reportResourceLoad(_resourceUrl: string, _status: {success: boolean, errorMessage?: string, size?: number}):
          Promise<void> {
        return Promise.resolve();
      }
    }

    const hostInterface = new TestAsyncHostInterface();
    const worker = new Worker('/build/tests/DevToolsPluginTestWorker.js', {type: 'module'});
    const rpc = new WorkerRPC<AsyncHostInterface, TestWorkerInterface>(worker, hostInterface);

    const resourceUrl = 'test.dwo';
    const status = {success: true};
    const spy = sinon.spy(hostInterface, 'reportResourceLoad');
    await rpc.sendMessage('reportResourceLoadForTest', resourceUrl, status);
    sinon.assert.calledOnceWithExactly(spy, resourceUrl, status);
  });
});
