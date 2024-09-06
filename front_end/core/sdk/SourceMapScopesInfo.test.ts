// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {GeneratedRangeBuilder, OriginalScopeBuilder} from '../../testing/SourceMapEncoder.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {SourceMapScopesInfo} = SDK.SourceMapScopesInfo;

describe('SourceMapScopesInfo', () => {
  describe('findInlinedFunctions', () => {
    it('returns the single original function name if nothing was inlined', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(5, 0, 'function', 'foo')
                                  .end(10, 0)
                                  .end(20, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true})
                                  .end(0, 5)
                                  .end(0, 5)
                                  .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

      assert.deepEqual(info.findInlinedFunctions(0, 3), {originalFunctionName: 'foo', inlinedFunctions: []});
    });

    it('returns the names of the surrounding function plus all the inlined function names', () => {
      // 'foo' calls 'bar', 'bar' calls 'baz'. 'bar' and 'baz' are inlined into 'foo'.
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(10, 0, 'function', 'foo')
                                  .end(20, 0)
                                  .start(30, 0, 'function', 'bar')
                                  .end(40, 0)
                                  .start(50, 0, 'function', 'baz')
                                  .end(60, 0)
                                  .end(70, 0)
                                  .build()];

      const generatedRanges =
          new GeneratedRangeBuilder(names)
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true})
              .start(0, 5, {definition: {sourceIdx: 0, scopeIdx: 3}, callsite: {sourceIdx: 0, line: 15, column: 0}})
              .start(0, 5, {definition: {sourceIdx: 0, scopeIdx: 5}, callsite: {sourceIdx: 0, line: 35, column: 0}})
              .end(0, 10)
              .end(0, 10)
              .end(0, 10)
              .end(0, 10)
              .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(0, 14, 'function', 'inner')
                                  .end(2, 1)
                                  .start(4, 14, 'function', 'outer')
                                  .start(5, 12, 'block')
                                  .end(7, 3)
                                  .end(8, 1)
                                  .end(11, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 10, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true})
                                  .end(0, 28)
                                  .start(1, 10, {definition: {sourceIdx: 0, scopeIdx: 3}, isFunctionScope: true})
                                  .start(1, 21, {definition: {sourceIdx: 0, scopeIdx: 4}})
                                  .end(1, 26)
                                  .end(1, 27)
                                  .end(3, 0)
                                  .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(0, 14, 'function', 'inner')
                                  .end(2, 1)
                                  .start(4, 14, 'function', 'outer')
                                  .start(5, 12, 'block')
                                  .end(7, 3)
                                  .end(8, 1)
                                  .end(11, 0)
                                  .build()];

      const generatedRanges =
          new GeneratedRangeBuilder(names)
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
              .start(0, 10, {definition: {sourceIdx: 0, scopeIdx: 3}, isFunctionScope: true})
              .start(0, 21, {definition: {sourceIdx: 0, scopeIdx: 4}})
              .start(0, 22, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 6, column: 4}})
              .end(0, 36)
              .end(0, 37)
              .end(0, 38)
              .end(2, 0)
              .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(0, 14, 'function', 'inner')
                                  .end(2, 1)
                                  .start(4, 14, 'function', 'outer')
                                  .start(5, 12, 'block')
                                  .end(7, 3)
                                  .end(8, 1)
                                  .end(11, 0)
                                  .build()];

      const generatedRanges =
          new GeneratedRangeBuilder(names)
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 3}, callsite: {sourceIdx: 0, line: 10, column: 0}})
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 4}})
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 1}, callsite: {sourceIdx: 0, line: 6, column: 4}})
              .end(0, 14)
              .end(0, 14)
              .end(0, 14)
              .end(1, 0)
              .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

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
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(10, 0, 'function', 'foo')
                                  .end(20, 0)
                                  .end(30, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 10, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true})
                                  .end(0, 20)
                                  .end(0, 30)
                                  .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns false for scope info with variables but no bindings', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(10, 0, 'function', 'foo', ['variable1', 'variable2'])
                                  .end(20, 0)
                                  .end(30, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 10, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true})
                                  .end(0, 20)
                                  .end(0, 30)
                                  .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns true for scope info with variables and bindings', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(10, 0, 'function', 'foo', ['variable1', 'variable2'])
                                  .end(20, 0)
                                  .end(30, 0)
                                  .build()];

      const generatedRanges =
          new GeneratedRangeBuilder(names)
              .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
              .start(0, 10, {definition: {sourceIdx: 0, scopeIdx: 1}, isFunctionScope: true, bindings: ['a', 'b']})
              .end(0, 20)
              .end(0, 30)
              .build();

      const info = SourceMapScopesInfo.parseFromMap(
          sinon.createStubInstance(SDK.SourceMap.SourceMap), {names, originalScopes, generatedRanges});

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
          sourceURL: '' as Platform.DevToolsPath.UrlString,
          name: undefined,
        });
      } else {
        sourceMap.findEntry.returns(null);
      }

      return {sourceMap, callFrame};
    }

    it('returns null when the inner-most generated range doesn\'t have an original scope', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names).start(0, 0, 'global').end(20, 0).build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 10)  // Small range that doesn't map to anything.
                                  .end(0, 20)
                                  .end(0, 100)
                                  .build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({generatedPausedPosition: {line: 0, column: 15}});
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNull(scopeChain);
    });

    it('returns the original global scope when paused in the global scope', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names).start(0, 0, 'global').end(20, 0).build()];

      const generatedRanges =
          new GeneratedRangeBuilder(names).start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}}).end(0, 100).build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
      });
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 1);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Global);
    });

    it('returns the inner-most function scope as type "Local" and surrounding function scopes as type "Closure"',
       () => {
         const names: string[] = [];
         const originalScopes = [new OriginalScopeBuilder(names)
                                     .start(0, 0, 'function', 'outer')
                                     .start(5, 0, 'function', 'inner')
                                     .end(15, 0)
                                     .end(20, 0)
                                     .build()];

         const generatedRanges = new GeneratedRangeBuilder(names)
                                     .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                     .start(0, 25, {definition: {sourceIdx: 0, scopeIdx: 1}})
                                     .end(0, 75)
                                     .end(0, 100)
                                     .build();

         const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
           generatedPausedPosition: {line: 0, column: 50},
           mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
         });
         const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

         const scopeChain = info.resolveMappedScopeChain(callFrame);

         assert.isNotNull(scopeChain);
         assert.lengthOf(scopeChain, 2);
         assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
         assert.strictEqual(scopeChain[0].name(), 'inner');
         assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Closure);
         assert.strictEqual(scopeChain[1].name(), 'outer');
       });

    it('drops inner block scopes if a return value is present to account for V8 oddity', () => {
      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'function', 'someFn')
                                  .start(5, 0, 'block')
                                  .end(15, 0)
                                  .end(20, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 25, {definition: {sourceIdx: 0, scopeIdx: 1}})
                                  .end(0, 75)
                                  .end(0, 100)
                                  .build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
        returnValue: new SDK.RemoteObject.LocalJSONObject(42),
      });
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global')
                                  .start(10, 0, 'function', 'someFn', ['fooVariable', 'barVariable'])
                                  .end(20, 0)
                                  .end(30, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 20, {definition: {sourceIdx: 0, scopeIdx: 1}, bindings: [undefined, 'b']})
                                  .start(0, 40, {definition: {sourceIdx: 0, scopeIdx: 1}, bindings: ['f', undefined]})
                                  .end(0, 60)
                                  .end(0, 80)
                                  .end(0, 100)
                                  .build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 15, column: 0},
      });
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

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

      assert.isTrue(callFrame.evaluate.calledOnce);
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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global', undefined, ['fooConstant', 'barVariable'])
                                  .start(10, 0, 'function', 'someFn')
                                  .end(20, 0)
                                  .end(30, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}, bindings: ['42', '"n"']})
                                  .start(0, 20, {definition: {sourceIdx: 0, scopeIdx: 1}})
                                  .start(0, 40, {definition: {sourceIdx: 0, scopeIdx: 0}, bindings: ['42', undefined]})
                                  .end(0, 60)
                                  .end(0, 80)
                                  .end(0, 100)
                                  .build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 5, column: 0},
      });
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

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

      const names: string[] = [];
      const originalScopes = [new OriginalScopeBuilder(names)
                                  .start(0, 0, 'global', undefined, ['inner', 'outer'])
                                  .start(0, 14, 'function', 'inner', ['x'])
                                  .end(3, 1)
                                  .start(5, 14, 'function', 'outer', ['y'])
                                  .start(6, 9, 'block')
                                  .end(8, 3)
                                  .end(9, 1)
                                  .end(12, 0)
                                  .build()];

      const generatedRanges = new GeneratedRangeBuilder(names)
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 0}})
                                  .start(0, 0, {
                                    definition: {sourceIdx: 0, scopeIdx: 3},
                                    callsite: {sourceIdx: 0, line: 11, column: 0},
                                    bindings: ['42'],
                                  })
                                  .start(0, 0, {definition: {sourceIdx: 0, scopeIdx: 4}})
                                  .start(0, 0, {
                                    definition: {sourceIdx: 0, scopeIdx: 1},
                                    callsite: {sourceIdx: 0, line: 7, column: 4},
                                    bindings: ['42'],
                                  })
                                  .end(0, 19)
                                  .end(0, 19)
                                  .end(0, 19)
                                  .end(0, 19)
                                  .build();

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 10},
        mappedPausedPosition: {sourceIndex: 0, line: 3, column: 2},
      });
      const info = SourceMapScopesInfo.parseFromMap(sourceMap, {names, originalScopes, generatedRanges});

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
});
