// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createPlugin} from '../src/DWARFSymbols.js';
import {ResourceLoader} from '../src/MEMFSResourceLoader.js';

import {WorkerRPC, type AsyncHostInterface} from '../src/WorkerRPC.js';

import {type WasmValue} from '../src/WasmTypes.js';
import {type TestWorkerInterface} from './DevToolsPluginTestWorker.js';

import {makeURL, TestHostInterface} from './TestUtils.js';

describe('DevToolsPlugin', () => {
  describe('addRawModule', () => {
    it('does not race with removeRawModule', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources1Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.wasm')});

      const sources1 = await sources1Promise;
      expect(sources1).to.deep.equal([makeURL('/build/tests/inputs/inline.cc')]);

      const remove1Promise = plugin.removeRawModule('0');
      const sources2Promise = plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.wasm')});

      const [, sources2] = await Promise.all([remove1Promise, sources2Promise]);
      expect(sources2).to.deep.equal([makeURL('/build/tests/inputs/inline.cc')]);
    });

    it('does not try to create module file names that contain /', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('?ü', '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([makeURL('/build/tests/inputs/inline.cc')]);
    });
  });

  describe('rawLocationToSourceLocation', () => {
    it('maps bytecode addresses correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'inline.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/inline.cc');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([sourceFileURL]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x06, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 17, columnNumber: -1}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x45, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 12, columnNumber: 19}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x53, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 7, columnNumber: 15}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x5f, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 7, columnNumber: 19}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x67, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 7, columnNumber: 17}]);
      expect(await plugin.rawLocationToSourceLocation({rawModuleId, codeOffset: 0x68, inlineFrameIndex: 0}))
          .to.deep.equal([{sourceFileURL, rawModuleId, lineNumber: 7, columnNumber: 6}]);
    });
  });

  describe('sourceLocationToRawLocation', () => {
    it('maps source locations to ranges correctly in the presence of inlining', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'inline.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/inline.cc');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([sourceFileURL]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 7, columnNumber: -1}))
          .to.deep.equal([
            {rawModuleId, startOffset: 0x53, endOffset: 0x6f},
            {rawModuleId, startOffset: 0x8b, endOffset: 0xa7},
          ]);
      expect(await plugin.sourceLocationToRawLocation({rawModuleId, sourceFileURL, lineNumber: 19, columnNumber: 2}))
          .to.deep.equal([{rawModuleId, startOffset: 0xd8, endOffset: 0xe0}]);
    });

    it('returns only raw locations for the same line', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const rawModuleId = 'inline.wasm@123456';
      const sourceFileURL = makeURL('/build/tests/inputs/inline.cc');
      const sources = await plugin.addRawModule(rawModuleId, '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([sourceFileURL]);
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
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([makeURL('/build/tests/inputs/inline.cc')]);

      const ranges = await plugin.getInlinedCalleesRanges({rawModuleId: '0', codeOffset: 218, inlineFrameIndex: 0});
      expect(ranges).to.deep.equal([{rawModuleId: '0', startOffset: 69, endOffset: 202}]);
    });
  });

  describe('getInlinedFunctionRanges', () => {
    it('gets inlined function PC ranges correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.deep.equal([makeURL('/build/tests/inputs/inline.cc')]);

      const ranges = await plugin.getInlinedFunctionRanges({rawModuleId: '0', codeOffset: 101, inlineFrameIndex: 0});
      expect(ranges).to.deep.equal([{rawModuleId: '0', startOffset: 83, endOffset: 118}]);
    });
  });

  describe('getFunctionInfo', () => {
    it('gets inlined function infos correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/inline.wasm')});
      expect(sources).to.eql([makeURL('/build/tests/inputs/inline.cc')]);

      const functions = await plugin.getFunctionInfo({rawModuleId: '0', codeOffset: 101, inlineFrameIndex: 0});
      expect(functions).to.deep.equal(
          {frames: [{name: 'square(int)'}, {name: 'dsquare(int, int)'}, {name: 'main'}], missingSymbolFiles: []});
    });
  });

  describe('listVariablesInScope', () => {
    it('lists parameter variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/params.wasm')});
      expect(sources).to.eql([makeURL('/build/tests/inputs/params.c')]);

      const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 102, inlineFrameIndex: 0});
      expect(variables.map(v => v.scope)).to.eql(['GLOBAL', 'GLOBAL', 'PARAMETER', 'PARAMETER', 'PARAMETER']);
    });

    it('lists global variables correctly', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());

      const sources = await plugin.addRawModule('0', '', {url: makeURL('/build/tests/inputs/multiple_cu_global.wasm')});
      expect(sources).to.have.members(
          [makeURL('/build/tests/inputs/global.cc'), makeURL('/build/tests/inputs/standalone_global.cc')]);

      const variables = await plugin.listVariablesInScope({rawModuleId: '0', codeOffset: 80, inlineFrameIndex: 0});
      expect(variables.some(value => value.name === '::var_standalone_signed_char')).to.equal(false);
    });
  });

  describe('getMappedLines', () => {
    it('computes mapped lines correctly.', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      await plugin.addRawModule('c_string', '', {url: makeURL('/build/tests/inputs/string.wasm')});

      const mappedLines = await plugin.getMappedLines('c_string', makeURL('/build/tests/inputs/string.c'));
      expect(mappedLines).to.eql([8, 10, 11, 12, 13]);
    });

    it('also computes lines in headers.', async () => {
      const plugin = await createPlugin(new TestHostInterface(), new ResourceLoader());
      await plugin.addRawModule('hello', '', {url: makeURL('/build/tests/inputs/hello.wasm')});

      const mappedLines = await plugin.getMappedLines('hello', makeURL('/build/tests/inputs/printf.h'));
      expect(mappedLines).to.eql([8, 9, 10]);
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
