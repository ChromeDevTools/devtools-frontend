// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
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
          {name: 'baz', callsite: {sourceIndex: 0, line: 35, column: 0}},
          {name: 'bar', callsite: {sourceIndex: 0, line: 15, column: 0}},
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
});
