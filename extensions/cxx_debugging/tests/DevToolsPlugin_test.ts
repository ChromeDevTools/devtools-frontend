// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createPlugin} from '../src/DWARFSymbols.js';
import {ResourceLoader} from '../src/MEMFSResourceLoader.js';
import {type WasmValue} from '../src/WasmTypes.js';
import {type AsyncHostInterface, WorkerRPC} from '../src/WorkerRPC.js';

import {type TestWorkerInterface} from './DevToolsPluginTestWorker.js';
import {makeURL, TestHostInterface} from './TestUtils.js';

describe('DevToolsPlugin', () => {
  describe('addRawModule', () => {
    const expectedSources = [makeURL('/build/tests/inputs/hello.c'), makeURL('/build/tests/inputs/printf.h')];
    it('does not race with removeRawModule', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources1Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const sources1 = await sources1Promise;
      expect(sources1).to.deep.equal(expectedSources);

      const remove1Promise = plugin.removeRawModule('0');
      const sources2Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const [, sources2] = await Promise.all([remove1Promise, sources2Promise]);
      expect(sources2).to.deep.equal(expectedSources);
    });

    it('does not try to create module file names that contain /', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('?ü', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      expect(sources).to.deep.equal(expectedSources);
    });
  });

  describe('rawLocationToSourceLocation', () => {
    it('maps bytecode addresses correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'hello.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/hello.c');
      const header = makeURL('/build/tests/inputs/printf.h');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      expect(sources).to.deep.equal([sourceFileURL, header]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x02, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 2, columnNumber: -1}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x5, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL: header, rawModuleId, lineNumber: 0, columnNumber: -1}]);
    });
  });

  describe('sourceLocationToRawLocation', () => {
    it('maps source locations to ranges correctly in the presence of inlining', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'inline.s.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/inline.c');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      expect(sources).to.deep.equal([sourceFileURL]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 0, columnNumber: -1}))
          .to.deep.equal([{rawModuleId, startOffset: 0x2, endOffset: 0x5}]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 9, columnNumber: -1}))
          .to.deep.equal([{rawModuleId, startOffset: 0x5, endOffset: 0x6}]);
    });

    it('returns only raw locations for the same line', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'hello.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/hello.c');
      const header = makeURL('/build/tests/inputs/printf.h');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});
      expect(sources).to.deep.equal([sourceFileURL, header]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 5, columnNumber: -1}))
          .to.deep.equal([]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 10, columnNumber: -1}))
          .to.deep.equal([]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 16, columnNumber: -1}))
          .to.deep.equal([]);
    });
  });

  describe('getScopeInfo', () => {
    it('handles globals, locals, and parameters', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      expect(await plugin.getScopeInfo('GLOBAL')).to.include({type: 'GLOBAL', typeName: 'Global'});
      expect(await plugin.getScopeInfo('LOCAL')).to.include({type: 'LOCAL', typeName: 'Local'});
      expect(await plugin.getScopeInfo('PARAMETER')).to.include({type: 'PARAMETER', typeName: 'Parameter'});
    });
  });

  describe('getInlinedCalleeRanges', () => {
    it('gets inlined callee PC ranges correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      expect(sources).to.deep.equal([makeURL('/build/tests/inputs/inline.c')]);

      const ranges = await plugin.getInlinedCalleesRanges({rawModuleId: '0', codeOffset: 0x2, inlineFrameIndex: 0});
      expect(ranges).to.deep.equal([{rawModuleId: '0', startOffset: 0x5, endOffset: 0x6}]);
    });
  });

  describe('getInlinedFunctionRanges', () => {
    it('gets inlined function PC ranges correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      expect(sources).to.deep.equal([makeURL('/build/tests/inputs/inline.c')]);

      const ranges = await plugin.getInlinedFunctionRanges({rawModuleId: '0', codeOffset: 0x5, inlineFrameIndex: 0});
      expect(ranges).to.deep.equal([{rawModuleId: '0', startOffset: 0x5, endOffset: 0x6}]);
    });
  });

  describe('getFunctionInfo', () => {
    it('gets inlined function infos correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.s.wasm')});
      expect(sources).to.eql([makeURL('/build/tests/inputs/inline.c')]);

      const functions = await plugin.getFunctionInfo({rawModuleId: '0', codeOffset: 0x5, inlineFrameIndex: 0});
      expect(functions).to.deep.equal({frames: [{name: 'callee'}, {name: 'caller'}], missingSymbolFiles: []});
    });
  });

  describe('listVariablesInScope', () => {
    it('lists parameter variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/shadowing.s.wasm')});

      {
        const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x2, inlineFrameIndex: 0});
        expect(variables.map(v => v.scope)).to.eql(['PARAMETER']);
      }
      {
        const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x3, inlineFrameIndex: 0});
        expect(variables.map(v => v.scope)).to.eql(['LOCAL']);
      }
    });

    it('lists global variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/globals.s.wasm')});

      const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 0x6, inlineFrameIndex: 0});
      expect(variables.map(v => v.name)).to.deep.equal(['::var_separate_cu']);
    });
  });

  describe('getMappedLines', () => {
    it('computes mapped lines correctly.', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('hello', '', {url: makeURL('/build/tests/inputs/hello.s.wasm')});

      const mappedLines = await plugin.getMappedLines('hello', makeURL('/build/tests/inputs/hello.c'));
      expect(mappedLines).to.eql([2]);
    });
  });

  describe('HostInterface', () => {
    it('provides access to wasm state', async () => {
      class TestAsyncHostInterface implements AsyncHostInterface {
        readonly memory = {offset: 1026, length: 5, stopId: 9, result: new Uint8Array([5, 6, 7, 8, 9]).buffer};
        readonly local = {local: 9, stopId: 10, result: {type: 'i32', value: 5} as WasmValue};
        readonly global = {global: 10, stopId: 11, result: {type: 'i32', value: 6} as WasmValue};
        readonly op = {op: 11, stopId: 12, result: {type: 'i32', value: 7} as WasmValue};
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
        expect(callResult).to.deep.equal(result);
      }
      {
        const {local, stopId, result} = hostInterface.local;
        const callResult = await rpc.sendMessage('getWasmLocalForTest', local, stopId);
        expect(callResult).to.deep.equal(result);
      }
      {
        const {global, stopId, result} = hostInterface.global;
        const callResult = await rpc.sendMessage('getWasmGlobalForTest', global, stopId);
        expect(callResult).to.deep.equal(result);
      }
      {
        const {op, stopId, result} = hostInterface.op;
        const callResult = await rpc.sendMessage('getWasmOpForTest', op, stopId);
        expect(callResult).to.deep.equal(result);
      }
    });
  });
});
