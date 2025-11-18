// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Formatter from '../../entrypoints/formatter_worker/formatter_worker.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import {stringifyFrame} from '../../testing/StackTraceHelpers.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;
const {SourceMapScopesInfo} = SDK.SourceMapScopesInfo;
const {ScopeInfoBuilder} = ScopesCodec;

describe('SourceMapScopesInfo', () => {
  describe('findInlinedFunctions', () => {
    it('returns the single original function name if nothing was inlined', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(5, 0, {kind: 'function', key: 'foo', name: 'foo'})
          .endScope(10, 0)
          .endScope(20, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'foo', isStackFrame: true})
          .endRange(0, 5)
          .endRange(0, 5);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.deepEqual(info.findInlinedFunctions(0, 3), {originalFunctionName: 'foo', inlinedFunctions: []});
    });

    it('returns the names of the surrounding function plus all the inlined function names', () => {
      // 'foo' calls 'bar', 'bar' calls 'baz'. 'bar' and 'baz' are inlined into 'foo'.
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', key: 'foo', name: 'foo'})
          .endScope(20, 0)
          .startScope(30, 0, {kind: 'function', key: 'bar', name: 'bar'})
          .endScope(40, 0)
          .startScope(50, 0, {kind: 'function', key: 'baz', name: 'baz'})
          .endScope(60, 0)
          .endScope(70, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'foo', isStackFrame: true})
          .startRange(0, 5, {scopeKey: 'bar', callSite: {sourceIndex: 0, line: 15, column: 0}})
          .startRange(0, 5, {scopeKey: 'baz', callSite: {sourceIndex: 0, line: 35, column: 0}})
          .endRange(0, 10)
          .endRange(0, 10)
          .endRange(0, 10)
          .endRange(0, 10);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.deepEqual(info.findInlinedFunctions(0, 4), {originalFunctionName: 'foo', inlinedFunctions: []});
      assert.deepEqual(info.findInlinedFunctions(0, 7), {
        originalFunctionName: 'foo',
        inlinedFunctions: [
          {name: 'baz', callsite: {sourceIndex: 0, line: 35, column: 0, sourceURL: undefined}},
          {name: 'bar', callsite: {sourceIndex: 0, line: 15, column: 0, sourceURL: undefined}},
        ],
      });
    });
  });

  describeWithMockConnection('expandCallFrame', () => {
    function setUpCallFrame(generatedPausedPosition: {line: number, column: number}, name: string) {
      const target = createTarget();
      const callFrame = new SDK.DebuggerModel.CallFrame(
          target.model(SDK.DebuggerModel.DebuggerModel)!, sinon.createStubInstance(SDK.Script.Script), {
            callFrameId: '0' as Protocol.Debugger.CallFrameId,
            location: {
              lineNumber: generatedPausedPosition.line,
              columnNumber: generatedPausedPosition.column,
              scriptId: '0' as Protocol.Runtime.ScriptId,
            },
            functionName: name,
            scopeChain: [],
            this: {type: Protocol.Runtime.RemoteObjectType.Undefined},
            url: '',
          },
          undefined, name);

      return callFrame;
    }

    it('does nothing for frames that don\'t contain inlined code', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20        30
      //    012345678901234567890              0123456789012345678901234567890
      //
      // 0: function inner() {                 function n(){print('hello')}
      // 1:   print('hello');                  function m(){if(true){n()}}
      // 2: }                                  m();
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', key: 'inner', name: 'inner'})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', key: 'outer', name: 'outer'})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'inner', isStackFrame: true})
          .endRange(0, 28)
          .startRange(1, 10, {scopeKey: 'outer', isStackFrame: true})
          .startRange(1, 21, {scopeKey: 'block'})
          .endRange(1, 26)
          .endRange(1, 27)
          .endRange(3, 0);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      {
        const callFrame = setUpCallFrame({line: 0, column: 13}, 'n');  // Pause on 'print'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 1);
        assert.strictEqual(expandedFrames[0].functionName, 'inner');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
      }

      {
        const callFrame = setUpCallFrame({line: 1, column: 22}, 'm');  // Pause on 'n()'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 1);
        assert.strictEqual(expandedFrames[0].functionName, 'outer');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
      }

      {
        const callFrame = setUpCallFrame({line: 2, column: 0}, '');  // Pause on 'm()'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 1);
        assert.strictEqual(expandedFrames[0].functionName, '');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
      }
    });

    it('returns two frames for a function inlined into another', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20        30        40
      //    012345678901234567890              01234567890123456789012345678901234567890
      //
      // 0: function inner() {                 function m(){if(true){print('hello')}}
      // 1:   print('hello');                  m();
      // 2: }
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner'})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer'})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'outer', isStackFrame: true})
          .startRange(0, 21, {scopeKey: 'block'})
          .startRange(0, 22, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 4}})
          .endRange(0, 36)
          .endRange(0, 37)
          .endRange(0, 38)
          .endRange(2, 0);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      {
        const callFrame = setUpCallFrame({line: 0, column: 22}, 'm');  // Pause on 'print'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 2);
        assert.strictEqual(expandedFrames[0].functionName, 'inner');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
        assert.strictEqual(expandedFrames[1].functionName, 'outer');
        assert.strictEqual(expandedFrames[1].inlineFrameIndex, 1);
      }

      {
        const callFrame = setUpCallFrame({line: 0, column: 13}, 'm');  // Pause on 'if'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 1);
        assert.strictEqual(expandedFrames[0].functionName, 'outer');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
      }

      {
        const callFrame = setUpCallFrame({line: 1, column: 0}, 'm');  // Pause on 'm'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 1);
        assert.strictEqual(expandedFrames[0].functionName, '');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
      }
    });

    it('returns three frames for two functions inlined into the global scope', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20
      //    012345678901234567890              012345678901234567890
      //
      // 0: function inner() {                 print('hello')
      // 1:   print('hello');
      // 2: }
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner'})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer'})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 10, column: 0}})
          .startRange(0, 0, {scopeKey: 'block'})
          .startRange(0, 0, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 4}})
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(1, 0);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      {
        const callFrame = setUpCallFrame({line: 0, column: 0}, '');  // Pause on 'print'.
        const expandedFrames = info.expandCallFrame(callFrame);

        assert.lengthOf(expandedFrames, 3);
        assert.strictEqual(expandedFrames[0].functionName, 'inner');
        assert.strictEqual(expandedFrames[0].inlineFrameIndex, 0);
        assert.strictEqual(expandedFrames[1].functionName, 'outer');
        assert.strictEqual(expandedFrames[1].inlineFrameIndex, 1);
        assert.strictEqual(expandedFrames[2].functionName, '');
        assert.strictEqual(expandedFrames[2].inlineFrameIndex, 2);
      }
    });
  });

  describeWithEnvironment('translateCallSite', () => {
    it('throws for an outlined frame', () => {
      const builder = new ScopeInfoBuilder().startRange(0, 0, {isStackFrame: true, isHidden: true}).endRange(0, 10);
      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.throws(() => info.translateCallSite(0, 5));
    });

    it('does nothing for frames that don\'t contain inlined code', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20        30
      //    012345678901234567890              0123456789012345678901234567890
      //
      // 0: function inner() {                 function n(){print('hello')}
      // 1:   print('hello');                  function m(){if(true){n()}}
      // 2: }                                  m();
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`, encodeSourceMap([
                                                      '0:18 => index.ts:1:7',
                                                      '1:23 => index.ts:6:9',
                                                      '2:1 => index.ts:10:5',
                                                    ]));

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', key: 'inner', name: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', key: 'outer', name: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'inner', isStackFrame: true})
          .endRange(0, 28)
          .startRange(1, 10, {scopeKey: 'outer', isStackFrame: true})
          .startRange(1, 21, {scopeKey: 'block'})
          .endRange(1, 26)
          .endRange(1, 27)
          .endRange(3, 0);

      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      {
        const translatedFrames = info.translateCallSite(0, 18);  // Pause on 'print'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyFrame(translatedFrames[0]), 'at inner (index.ts:1:7)');
      }

      {
        const translatedFrames = info.translateCallSite(1, 23);  // Pause on 'n()'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyFrame(translatedFrames[0]), 'at outer (index.ts:6:9)');
      }

      {
        const translatedFrames = info.translateCallSite(2, 1);  // Pause on 'm()'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyFrame(translatedFrames[0]), 'at <anonymous> (index.ts:10:5)');
      }
    });

    it('returns two frames for a function inlined into another', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20        30        40
      //    012345678901234567890              01234567890123456789012345678901234567890
      //
      // 0: function inner() {                 function m(){if(true){print('hello')}}
      // 1:   print('hello');                  m();
      // 2: }
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`, encodeSourceMap([
                                                      '0:14 => index.ts:5:5',
                                                      '0:26 => index.ts:1:7',
                                                      '1:1 => index.ts:10:5',
                                                    ]));

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'outer', isStackFrame: true})
          .startRange(0, 21, {scopeKey: 'block'})
          .startRange(0, 22, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 8}})
          .endRange(0, 36)
          .endRange(0, 37)
          .endRange(0, 38)
          .endRange(2, 0);

      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      {
        const translatedFrames = info.translateCallSite(0, 26);  // Pause on 'print'.

        assert.lengthOf(translatedFrames, 2);
        assert.deepEqual(translatedFrames.map(stringifyFrame), ['at inner (index.ts:1:7)', 'at outer (index.ts:6:8)']);
      }

      {
        const translatedFrames = info.translateCallSite(0, 14);  // Pause on 'if'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyFrame(translatedFrames[0]), 'at outer (index.ts:5:5)');
      }

      {
        const translatedFrames = info.translateCallSite(1, 1);  // Pause on 'm'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyFrame(translatedFrames[0]), 'at <anonymous> (index.ts:10:5)');
      }
    });

    it('returns three frames for two functions inlined into the global scope', () => {
      //
      //    orig. code                         gen. code
      //             10        20                       10        20
      //    012345678901234567890              012345678901234567890
      //
      // 0: function inner() {                 print('hello')
      // 1:   print('hello');
      // 2: }
      // 3:
      // 4: function outer() {
      // 5:   if (true) {
      // 6:     inner();
      // 7:   }
      // 8: }
      // 9:
      // 10: outer();

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`, encodeSourceMap([
                                                      '0:5 => index.ts:1:7',
                                                    ]));

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 10, column: 5}})
          .startRange(0, 0, {scopeKey: 'block'})
          .startRange(0, 0, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 6, column: 9}})
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(0, 14)
          .endRange(1, 0);

      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      {
        const translatedFrames = info.translateCallSite(0, 5);  // Pause on 'print'.

        assert.deepEqual(translatedFrames.map(stringifyFrame), [
          'at inner (index.ts:1:7)',
          'at outer (index.ts:6:9)',
          'at <anonymous> (index.ts:10:5)',
        ]);
      }
    });
  });

  describe('hasVariablesAndBindings', () => {
    it('returns false for scope info without variables or bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', name: 'foo', key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns false for scope info with variables but no bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', name: 'foo', variables: ['variable1', 'variable2'], key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns true for scope info with variables and bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', name: 'foo', variables: ['variable1', 'variable2'], key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true, values: ['a', 'b']})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isTrue(info.hasVariablesAndBindings());
    });
  });

  describeWithMockConnection('resolveMappedScopeChain', () => {
    function setUpCallFrameAndSourceMap(options: {
      generatedPausedPosition: {line: number, column: number},
      mappedPausedPosition?: {sourceIndex: number, line: number, column: number},
      returnValue?: SDK.RemoteObject.RemoteObject,
    }) {
      const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
      const target = createTarget();
      callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;

      const {generatedPausedPosition, mappedPausedPosition, returnValue} = options;

      callFrame.location.returns(new SDK.DebuggerModel.Location(
          callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, generatedPausedPosition.line,
          generatedPausedPosition.column));
      callFrame.returnValue.returns(returnValue ?? null);

      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      if (mappedPausedPosition) {
        sourceMap.findEntry.returns({
          lineNumber: generatedPausedPosition.line,
          columnNumber: generatedPausedPosition.column,
          sourceIndex: mappedPausedPosition.sourceIndex,
          sourceLineNumber: mappedPausedPosition.line,
          sourceColumnNumber: mappedPausedPosition.column,
          sourceURL: urlString``,
          name: undefined,
        });
      } else {
        sourceMap.findEntry.returns(null);
      }

      return {sourceMap, callFrame};
    }

    it('returns null when the inner-most generated range doesn\'t have an original scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'}).endScope(20, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10)  // Small range that doesn't map to anything.
          .endRange(0, 20)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({generatedPausedPosition: {line: 0, column: 15}});
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNull(scopeChain);
    });

    it('returns the original global scope when paused in the global scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'}).endScope(20, 0);
      builder.startRange(0, 0, {scopeKey: 'global'}).endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 1);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Global);
    });

    it('returns the inner-most function scope as type "Local" and surrounding function scopes as type "Closure"',
       () => {
         const builder = new ScopeInfoBuilder();
         builder.startScope(0, 0, {kind: 'function', name: 'outer', key: 'outer'})
             .startScope(5, 0, {kind: 'function', name: 'inner', key: 'inner'})
             .endScope(15, 0)
             .endScope(20, 0);

         builder.startRange(0, 0, {scopeKey: 'outer'})
             .startRange(0, 25, {scopeKey: 'inner'})
             .endRange(0, 75)
             .endRange(0, 100);

         const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
           generatedPausedPosition: {line: 0, column: 50},
           mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
         });
         const info = new SourceMapScopesInfo(sourceMap, builder.build());

         const scopeChain = info.resolveMappedScopeChain(callFrame);

         assert.isNotNull(scopeChain);
         assert.lengthOf(scopeChain, 2);
         assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
         assert.strictEqual(scopeChain[0].name(), 'inner');
         assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Closure);
         assert.strictEqual(scopeChain[1].name(), 'outer');
       });

    it('drops inner block scopes if a return value is present to account for V8 oddity', () => {
      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'function', name: 'someFn', key: 'func'})
          .startScope(5, 0, {kind: 'block', key: 'block'})
          .endScope(15, 0)
          .endScope(20, 0);

      builder.startRange(0, 0, {scopeKey: 'func'})
          .startRange(0, 25, {scopeKey: 'block'})
          .endRange(0, 75)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
        returnValue: new SDK.RemoteObject.LocalJSONObject(42),
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 1);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
    });

    it('prefers inner ranges when the range chain has multiple ranges for the same original scope', async () => {
      // This frequently happens when transpiling async/await or generators.
      //
      // orig. scope                        gen. ranges
      //
      // | global                            | global
      // |                                   |
      // |  | someFn                         |  | someFn
      // |  |                                |  |
      // |  x (mapped paused position)       |  |  | someFn
      // |  |                                |  |  |
      // |                                   |  |  x (V8 paused position)
      // |                                   |  |  |
      // |                                   |  |
      // |                                   |
      //
      // Expectation: Report global scope and function scope for 'someFn'. Use bindings from inner 'someFn' range.
      //
      // TODO(crbug.com/40277685): Combine the ranges as some variables might be available in one range, but
      //         not the other. This requires us to be able to evaluate binding expressions in arbitrary
      //         CDP scopes to work well.

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', name: 'someFn', variables: ['fooVariable', 'barVariable'], key: 'func'})
          .endScope(20, 0)
          .endScope(30, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'func', values: [null, 'b']})
          .startRange(0, 40, {scopeKey: 'func', values: ['f', null]})
          .endRange(0, 60)
          .endRange(0, 80)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 15, column: 0},
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 2);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
      assert.strictEqual(scopeChain[0].name(), 'someFn');
      assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Global);

      // Attempt to get `someFn`s  variables and check that we only call callFrame.evaluate once.
      callFrame.evaluate.callsFake(({expression}) => {
        assert.strictEqual(expression, 'f');
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject(42)});
      });
      const {properties} = await scopeChain[0].object().getAllProperties(
          /* accessorPropertiesOnly */ false, /* generatePreview */ true, /* nonIndexedPropertiesOnly */ false);
      assert.isNotNull(properties);
      assert.lengthOf(properties, 2);
      assert.strictEqual(properties[0].name, 'fooVariable');
      assert.strictEqual(properties[0].value?.value, 42);

      assert.strictEqual(properties[1].name, 'barVariable');
      assert.isUndefined(properties[1].value);
      assert.isUndefined(properties[1].getter);

      sinon.assert.calledOnce(callFrame.evaluate);
    });

    it('works when generated ranges from outer scopes overlay ranges from inner scopes', async () => {
      // This happens when expressions (but not full functions) are inlined.
      //
      // orig. scope                        gen. ranges
      //
      // | global                            | global
      // |                                   |
      // x (mapped paused position)          |  | someFn
      // |                                   |  |
      // |  | someFn                         |  |  | global
      // |  |                                |  |  |
      // |  |                                |  |  x (V8 paused position)
      // |                                   |  |  |
      // |                                   |  |
      // |                                   |
      //
      // Expectation: Report global scope and use bindings from the inner generated range for 'global'.

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', variables: ['fooConstant', 'barVariable'], key: 'global'})
          .startScope(10, 0, {kind: 'function', name: 'someFn', key: 'func'})
          .endScope(20, 0)
          .endScope(30, 0);

      builder.startRange(0, 0, {scopeKey: 'global', values: ['42', '"n"']})
          .startRange(0, 20, {scopeKey: 'func'})
          .startRange(0, 40, {scopeKey: 'global', values: ['42', null]})
          .endRange(0, 60)
          .endRange(0, 80)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 5, column: 0},
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 1);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Global);

      // Attempt to get the global scope's variables and check that we only call callFrame.evaluate once.
      callFrame.evaluate.callsFake(({expression}) => {
        assert.strictEqual(expression, '42');
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject(42)});
      });
      const {properties} = await scopeChain[0].object().getAllProperties(
          /* accessorPropertiesOnly */ false, /* generatePreview */ true, /* nonIndexedPropertiesOnly */ false);
      assert.isNotNull(properties);
      assert.lengthOf(properties, 2);
      assert.strictEqual(properties[0].name, 'fooConstant');
      assert.strictEqual(properties[0].value?.value, 42);

      assert.strictEqual(properties[1].name, 'barVariable');
      assert.isUndefined(properties[1].value);
      assert.isUndefined(properties[1].getter);
    });

    it('returns the correct scopes for inlined functions', async () => {
      //
      //     orig. code                       gen. code
      //              10        20                     10        20
      //     012345678901234567890            012345678901234567890
      //
      //  0: function inner(x) {              print(42);debugger;
      //  1:   print(x);
      //  2:   debugger;
      //  3: }
      //  4:
      //  5: function outer(y) {
      //  6:   if (y) {
      //  7:     inner(y);
      //  8:   }
      //  9: }
      // 10:
      // 11:  outer(42);
      //
      // Expectation: The scopes for the virtual call frame of outer are accurate.
      //              In particular we also add a block scope that must be there.

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', variables: ['inner', 'outer'], key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', variables: ['x'], key: 'inner'})
          .endScope(3, 1)
          .startScope(5, 14, {kind: 'function', name: 'outer', variables: ['y'], key: 'outer'})
          .startScope(6, 9, {kind: 'block', key: 'block'})
          .endScope(8, 3)
          .endScope(9, 1)
          .endScope(12, 0);

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'outer', callSite: {sourceIndex: 0, line: 11, column: 0}, values: ['42']})
          .startRange(0, 0, {scopeKey: 'block'})
          .startRange(0, 0, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 7, column: 4}, values: ['42']})
          .endRange(0, 19)
          .endRange(0, 19)
          .endRange(0, 19)
          .endRange(0, 19);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 10},
        mappedPausedPosition: {sourceIndex: 0, line: 3, column: 2},
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      {
        const scopeChain = info.resolveMappedScopeChain(callFrame);
        assert.isNotNull(scopeChain);
        assert.lengthOf(scopeChain, 2);
        assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
        assert.strictEqual(scopeChain[0].name(), 'inner');
      }

      // @ts-expect-error stubbing readonly property.
      callFrame['inlineFrameIndex'] = 1;

      {
        const scopeChain = info.resolveMappedScopeChain(callFrame);
        assert.isNotNull(scopeChain);
        assert.lengthOf(scopeChain, 3);
        assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Block);
        assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Local);
        assert.strictEqual(scopeChain[1].name(), 'outer');
      }

      // @ts-expect-error stubbing readonly property.
      callFrame['inlineFrameIndex'] = 2;

      {
        const scopeChain = info.resolveMappedScopeChain(callFrame);
        assert.isNotNull(scopeChain);
        assert.lengthOf(scopeChain, 1);
        assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Global);
      }
    });
  });

  describe('findOriginalFunctionName', () => {
    const [scopeInfoWithRanges, scopeInfoWithMappings] = (function() {
      // Separate sandbox, otherwise global beforeEach/afterAll will reset our source map.
      const sandbox = sinon.createSandbox();
      const sourceMap = sandbox.createStubInstance(SDK.SourceMap.SourceMap);
      sourceMap.findEntry.callsFake((line, column) => {
        assert.strictEqual(line, 0);
        switch (column) {
          case 10:
            return new SDK.SourceMap.SourceMapEntry(
                line, column, /* sourceIndex */ 0, /* sourceUrl */ undefined, /* sourceLine */ 5, /* sourceColumn */ 0);
          case 30:
            return new SDK.SourceMap.SourceMapEntry(
                line, column, /* sourceIndex */ 0, /* sourceUrl */ undefined, /* sourceLine */ 15,
                /* sourceColumn */ 2);
          case 50:
            return new SDK.SourceMap.SourceMapEntry(
                line, column, /* sourceIndex */ 0, /* sourceUrl */ undefined, /* sourceLine */ 25,
                /* sourceColumn */ 4);
          case 110:
            return new SDK.SourceMap.SourceMapEntry(
                line, column, /* sourceIndex */ 0, /* sourceUrl */ undefined, /* sourceLine */ 55,
                /* sourceColumn */ 2);
          case 150:
            return null;
        }
        return null;
      });

      const builder = new ScopeInfoBuilder();
      builder.startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 10, {kind: 'function', name: 'myAuthoredFunction', isStackFrame: true, key: 'authored'})
          .startScope(20, 15, {kind: 'block', key: 'block'})
          .endScope(30, 3)
          .endScope(40, 1)
          .startScope(50, 10, {kind: 'function', isStackFrame: true, key: 'unnamed'})
          .endScope(60, 1)
          .endScope(70, 0);

      const scopeInfoWithMappings = new SourceMapScopesInfo(sourceMap, builder.build());

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'authored'})
          .startRange(0, 40, {scopeKey: 'block'})
          .endRange(0, 60)
          .endRange(0, 80)
          .startRange(0, 100, {scopeKey: 'unnamed'})
          .endRange(0, 120)
          .startRange(0, 140)
          .endRange(0, 160)
          .endRange(0, 180);
      const scopeInfoWithRanges = new SourceMapScopesInfo(sourceMap, builder.build());
      return [scopeInfoWithRanges, scopeInfoWithMappings];
    })();

    [{name: 'with GeneratedRanges', scopeInfo: scopeInfoWithRanges},
     {name: 'with mappings', scopeInfo: scopeInfoWithMappings},
    ].forEach(({name, scopeInfo}) => {
      describe(name, () => {
        it('provides the original name for a position inside a function', () => {
          assert.strictEqual(scopeInfo.findOriginalFunctionName({line: 0, column: 30}), 'myAuthoredFunction');
        });

        it('provides the original name for a position inside a block scope of a function', () => {
          assert.strictEqual(scopeInfo.findOriginalFunctionName({line: 0, column: 50}), 'myAuthoredFunction');
        });

        it('returns null for a position inside the global scope', () => {
          assert.isNull(scopeInfo.findOriginalFunctionName({line: 0, column: 10}));
        });

        it('returns null for a position inside a range with no corresponding original scope', () => {
          assert.isNull(scopeInfo.findOriginalFunctionName({line: 0, column: 150}));
        });

        it('returns the empty string for an unnamed function (not null)', () => {
          assert.strictEqual(scopeInfo.findOriginalFunctionName({line: 0, column: 110}), '');
        });
      });
    });
  });

  describeWithMockConnection('createFromAst', () => {
    it('creates scope info from a JavaScript AST with named mappings', () => {
      const generatedCode = `function f(n) { console.log(n); } function b() { f(42); }`;

      const ast = Formatter.ScopeParser.parseScopes(generatedCode)?.export();
      assert.isDefined(ast);

      const sourceMapJSON = encodeSourceMap([
        '0:10 => original.js:0:10@foo',  // function f() => function foo()
        '0:33 => original.js:3:0',       // end of f
        '0:44 => original2.js:5:9@bar',  // function b() => function bar()
        '0:57 => original2.js:7:0',      // end of b
      ]);
      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON);

      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast, new TextUtils.Text.Text(generatedCode));

      // Check function name/scope for a position at the beginning of the function name mapping,
      // and for a position at the beginning of the function name mapping.
      for (const column of [10, 25]) {
        assert.strictEqual(info.findOriginalFunctionName({line: 0, column}), 'foo');

        const {scope, url} = info.findOriginalFunctionScope({line: 0, column}) ?? {};
        assert.strictEqual(url, 'original.js');
        assert.isOk(scope);
        assert.strictEqual(scope.name, 'foo');
        assert.strictEqual(scope.start.line, 0);
        assert.strictEqual(scope.start.column, 10);
        assert.strictEqual(scope.end.line, 3);
        assert.strictEqual(scope.end.column, 0);
      }

      // Check function name/scope for the second function.
      for (const column of [44, 52]) {
        assert.strictEqual(info.findOriginalFunctionName({line: 0, column}), 'bar');

        const {scope, url} = info.findOriginalFunctionScope({line: 0, column}) ?? {};
        assert.strictEqual(url, 'original2.js');
        assert.isOk(scope);
        assert.strictEqual(scope.name, 'bar');
        assert.strictEqual(scope.start.line, 5);
        assert.strictEqual(scope.start.column, 9);
        assert.strictEqual(scope.end.line, 7);
        assert.strictEqual(scope.end.column, 0);
      }

      // Check a position in the global scope.
      assert.isNull(info.findOriginalFunctionName({line: 0, column: 38}));  // Between the two functions
      assert.isNull(info.findOriginalFunctionScope({line: 0, column: 38}));
    });

    it('handles nested scopes across multiple original files', () => {
      // Generated:
      // main.js: function outer() { function inner() { console.log('hi'); } }
      // util.js: function util() {}
      const generatedCode = `function outer() { function inner() { console.log('hi'); } } function util() {}`;

      const ast = Formatter.ScopeParser.parseScopes(generatedCode)?.export();

      const sourceMapJSON = encodeSourceMap([
        // main.js
        '0:14 => main.js:0:14@outer',  // outer start
        '0:33 => main.js:0:33@inner',  // inner start (inside outer)
        '0:58 => main.js:0:58',        // inner end
        '0:60 => main.js:0:60',        // outer end

        // utils.js
        '0:74 => utils.js:0:14@util',  // util start
        '0:79 => utils.js:0:18',       // util end
      ]);

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON);
      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast!, new TextUtils.Text.Text(generatedCode));

      // Test inner scope.
      for (let i = 33; i < 58; i++) {
        const result = info.findOriginalFunctionScope({line: 0, column: i});
        assert.isOk(result);
        assert.strictEqual(result.url, 'main.js');
        assert.strictEqual(result.scope.name, 'inner');
        assert.strictEqual(result.scope.parent?.name, 'outer');
      }

      // Test scope from second file.
      for (let i = 74; i < 79; i++) {
        const result = info.findOriginalFunctionScope({line: 0, column: i});
        assert.isOk(result);
        assert.strictEqual(result.url, 'utils.js');
        assert.strictEqual(result.scope.name, 'util');
        assert.isUndefined(result.scope.parent?.name);
      }
    });

    it('discards scopes where start and end map to different source files', () => {
      const generatedCode = `function bad() { }`;
      const ast = Formatter.ScopeParser.parseScopes(generatedCode)?.export();

      const sourceMapJSON = encodeSourceMap([
        // The start maps to file A.
        '0:12 => fileA.js:0:12@bad',
        // The end maps to a different file.
        '0:18 => fileB.js:0:0',
      ]);

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON);
      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast!, new TextUtils.Text.Text(generatedCode));

      // Although the AST found a function, the source map is invalid.
      for (let i = 0; i < 20; i++) {
        const result = info.findOriginalFunctionScope({line: 0, column: i});
        assert.isNull(result, 'Should not return a scope when source files mismatch');
      }
    });

    it('inserts scopes correctly when an inner AST node maps to a larger scope than its parent', () => {
      // Scenario:
      //
      // AST: In the generated code, 'wrapper' encompasses 'big'
      // Original: According to the source map, 'big' actually encompasses 'wrapper'
      //
      // This may be a contrived and unlikely example, but the point is to ensure
      // that the children scopes are kept in the correct order no matter what the
      // mappings are.

      const generatedCode = `function wrapper() { function big() { } }`;
      const ast = Formatter.ScopeParser.parseScopes(generatedCode)?.export();

      const sourceMapJSON = encodeSourceMap([
        // 'wrapper' maps to a small range in original.js
        '0:16 => original.js:10:16@wrapper',

        // 'big' maps to a huge enclosing range in original.js
        '0:33 => original.js:0:0@big',
        '0:39 => original.js:100:0',  // big ends way later

        '0:41 => original.js:11:0',  // wrapper ends
      ]);

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON);
      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast!, new TextUtils.Text.Text(generatedCode));

      // Check 'big'.
      const big = info.findOriginalFunctionScope({line: 0, column: 33});
      assert.isOk(big);
      assert.strictEqual(big.url, 'original.js');
      assert.strictEqual(big.scope.name, 'big');
      assert.strictEqual(big.scope.start.line, 0);
      assert.strictEqual(big.scope.end.line, 100);
      assert.isNotEmpty(big.scope.children, 'The outer scope should have adopted the inner scope');
      assert.strictEqual(big.scope.children[0].name, 'wrapper');

      // Check 'wrapper'.
      const wrapper = info.findOriginalFunctionScope({line: 0, column: 16});
      assert.isOk(wrapper);
      assert.strictEqual(wrapper.url, 'original.js');
      assert.strictEqual(wrapper.scope.name, 'wrapper');
      assert.isEmpty(wrapper.scope.children);
    });
  });

  describe('isOutlinedFrame', () => {
    it('returns false for a global scope', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo =
          new SourceMapScopesInfo(sourceMap, new ScopeInfoBuilder().startRange(0, 0).endRange(0, 20).build());

      assert.isFalse(scopeInfo.isOutlinedFrame(0, 10));
    });

    it('returns false for a non-hidden function', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startRange(0, 0)
              .startRange(0, 10, {isStackFrame: true})
              .endRange(0, 20)
              .endRange(0, 30)
              .build());

      assert.isFalse(scopeInfo.isOutlinedFrame(0, 15));
    });

    it('returns true for a hidden function', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startRange(0, 0)
              .startRange(0, 10, {isStackFrame: true, isHidden: true})
              .endRange(0, 20)
              .endRange(0, 30)
              .build());

      assert.isTrue(scopeInfo.isOutlinedFrame(0, 15));
    });

    it('returns true for a block scope in a hidden function', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startRange(0, 0)
              .startRange(0, 10, {isStackFrame: true, isHidden: true})
              .startRange(0, 20)
              .endRange(0, 30)
              .endRange(0, 40)
              .endRange(0, 50)
              .build());

      assert.isTrue(scopeInfo.isOutlinedFrame(0, 25));
    });
  });

  describe('hasInlinedFrames', () => {
    it('returns false for a function scope', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startRange(0, 0)
              .startRange(0, 10, {isStackFrame: true})
              .endRange(0, 20)
              .endRange(0, 30)
              .build());

      assert.isFalse(scopeInfo.hasInlinedFrames(0, 15));
    });

    it('returns true for an inlined range', () => {
      // 'bar' gets inlined into 'foo'.
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startScope(0, 0, {isStackFrame: true, key: 'fn-foo', name: 'foo'})
              .endScope(9, 0)
              .startScope(10, 0, {isStackFrame: true, key: 'fn-bar', name: 'bar'})
              .endScope(19, 0)
              .startRange(0, 0, {isStackFrame: true, scopeKey: 'fn-foo'})
              .startRange(0, 10, {scopeKey: 'fn-bar', callSite: {sourceIndex: 0, line: 5, column: 2}})
              .endRange(0, 20)
              .endRange(0, 30)
              .build());

      assert.isTrue(scopeInfo.hasInlinedFrames(0, 15));
    });

    it('returns true for an inlined function with a block scope', () => {
      // 'bar' with a block scope gets inlined into 'foo'.
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo = new SourceMapScopesInfo(
          sourceMap,
          new ScopeInfoBuilder()
              .startScope(0, 0, {isStackFrame: true, key: 'fn-foo', name: 'foo'})
              .endScope(9, 0)
              .startScope(10, 0, {isStackFrame: true, key: 'fn-bar', name: 'bar'})
              .startScope(15, 10, {key: 'block-bar'})
              .endScope(18, 4)
              .endScope(19, 0)
              .startRange(0, 0, {isStackFrame: true, scopeKey: 'fn-foo'})
              .startRange(0, 10, {scopeKey: 'fn-bar', callSite: {sourceIndex: 0, line: 5, column: 2}})
              .startRange(0, 15, {scopeKey: 'block-bar'})
              .endRange(0, 19)
              .endRange(0, 20)
              .endRange(0, 30)
              .build());

      assert.isTrue(scopeInfo.hasInlinedFrames(0, 18));
    });
  });
});
