// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Formatter from '../../entrypoints/formatter_worker/formatter_worker.js';
import * as Protocol from '../../generated/protocol.js';
import type * as FormatterModels from '../../models/formatter/formatter.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import {stringifyFrame} from '../../testing/StackTraceHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as ScopesCodec from '../../third_party/source-map-scopes-codec/source-map-scopes-codec.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;
const {SourceMapScopesInfo} = SDK.SourceMapScopesInfo;
const {ScopeInfoBuilder} = ScopesCodec;

const SCRIPT_ID = '0' as Protocol.Runtime.ScriptId;

function scopePayload(type: Protocol.Debugger.ScopeType, start?: {line: number, column: number},
                      end?: {line: number, column: number}): Protocol.Debugger.Scope {
  return {
    type,
    object: {type: Protocol.Runtime.RemoteObjectType.Object} as Protocol.Runtime.RemoteObject,
    startLocation: start ? {scriptId: SCRIPT_ID, lineNumber: start.line, columnNumber: start.column} : undefined,
    endLocation: end ? {scriptId: SCRIPT_ID, lineNumber: end.line, columnNumber: end.column} : undefined,
  };
}

/** Makes `callFrame.scopeChain()` return real `Scope` instances built from `payloads`. */
function stubScopeChain(callFrame: sinon.SinonStubbedInstance<SDK.DebuggerModel.CallFrame>,
                        payloads: Protocol.Debugger.Scope[]): void {
  callFrame.getPayload.returns({scopeChain: payloads} as Protocol.Debugger.CallFrame);
  callFrame.scopeChain.returns(payloads.map((_, ordinal) => new SDK.DebuggerModel.Scope(callFrame, ordinal)));
}

/** Like {@link stringifyFrame}, but renders frames at unmapped generated positions as `url:unmapped`. */
function stringifyTranslatedFrame(frame: SDK.SourceMapScopesInfo.TranslatedFrame): string {
  if (frame.line === undefined || frame.column === undefined) {
    return `at ${frame.name ?? '<anonymous>'} (${frame.url}:unmapped)`;
  }
  return stringifyFrame({...frame, line: frame.line, column: frame.column});
}

describe('SourceMapScopesInfo', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  describe('translateRawFrame', () => {
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
                                                    ]),
                                                    new Common.Console.Console());

      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', key: 'inner', name: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', key: 'outer', name: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0)
          .endSource();

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
        const translatedFrames = info.translateRawFrame(0, 18).frames;  // Pause on 'print'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyTranslatedFrame(translatedFrames[0]), 'at inner (index.ts:1:7)');
      }

      {
        const translatedFrames = info.translateRawFrame(1, 23).frames;  // Pause on 'n()'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyTranslatedFrame(translatedFrames[0]), 'at outer (index.ts:6:9)');
      }

      {
        const translatedFrames = info.translateRawFrame(2, 1).frames;  // Pause on 'm()'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyTranslatedFrame(translatedFrames[0]), 'at <anonymous> (index.ts:10:5)');
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
                                                    ]),
                                                    new Common.Console.Console());

      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0)
          .endSource();

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
        const translatedFrames = info.translateRawFrame(0, 26).frames;  // Pause on 'print'.

        assert.lengthOf(translatedFrames, 2);
        assert.deepEqual(translatedFrames.map(stringifyTranslatedFrame),
                         ['at inner (index.ts:1:7)', 'at outer (index.ts:6:8)']);
      }

      {
        const translatedFrames = info.translateRawFrame(0, 14).frames;  // Pause on 'if'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyTranslatedFrame(translatedFrames[0]), 'at outer (index.ts:5:5)');
      }

      {
        const translatedFrames = info.translateRawFrame(1, 1).frames;  // Pause on 'm'.

        assert.lengthOf(translatedFrames, 1);
        assert.strictEqual(stringifyTranslatedFrame(translatedFrames[0]), 'at <anonymous> (index.ts:10:5)');
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
                                                    ]),
                                                    new Common.Console.Console());

      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', name: 'inner', key: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(4, 14, {kind: 'function', name: 'outer', key: 'outer', isStackFrame: true})
          .startScope(5, 12, {kind: 'block', key: 'block'})
          .endScope(7, 3)
          .endScope(8, 1)
          .endScope(11, 0)
          .endSource();

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
        const translatedFrames = info.translateRawFrame(0, 5).frames;  // Pause on 'print'.

        assert.deepEqual(translatedFrames.map(stringifyTranslatedFrame), [
          'at inner (index.ts:1:7)',
          'at outer (index.ts:6:9)',
          'at <anonymous> (index.ts:10:5)',
        ]);
      }
    });

    function stringify(translation: SDK.SourceMapScopesInfo.RawFrameTranslation):
        {kind: SDK.SourceMapScopesInfo.GeneratedFrameKind, frames: string[]} {
      return {kind: translation.kind, frames: translation.frames.map(stringifyTranslatedFrame)};
    }

    //
    //    orig. code                         gen. code
    //             10        20                       10        20
    //    012345678901234567890              012345678901234567890123456
    //
    // 0: function outer() {                 function outer(){_loop();}
    // 1:   {                                function _loop(){log(x)}
    // 2:     log(x);                        function _helper(){}
    // 3:   }                                function _hidden(){}
    // 4: }
    //
    // `_loop` is the outlined block scope, `_helper` has no definition, and `_hidden`
    // is marked hidden but has no definition either.
    function createOutliningScopesInfo(): SDK.SourceMapScopesInfo.SourceMapScopesInfo {
      const sourceMap = new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`, encodeSourceMap([
                                                      '0:17 => index.ts:1:2',
                                                      '1:17 => index.ts:2:4',
                                                      '2:18 => index.ts:4:0',
                                                      '3:18 => index.ts:4:0',
                                                    ]),
                                                    new Common.Console.Console());

      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', key: 'outer', name: 'outer', isStackFrame: true})
          .startScope(1, 2, {kind: 'block', key: 'block'})
          .endScope(3, 3)
          .endScope(4, 1)
          .endScope(5, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 14, {scopeKey: 'outer', isStackFrame: true})
          .endRange(0, 26)
          .startRange(1, 14, {scopeKey: 'block', isStackFrame: true, isHidden: true})
          .endRange(1, 24)
          .startRange(2, 16, {isStackFrame: true})
          .endRange(2, 20)
          .startRange(3, 16, {isStackFrame: true, isHidden: true})
          .endRange(3, 20)
          .endRange(4, 0);

      return new SourceMapScopesInfo(sourceMap, builder.build());
    }

    it('translates a regular function as VISIBLE', () => {
      const info = createOutliningScopesInfo();

      assert.deepEqual(stringify(info.translateRawFrame(0, 17)), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE,
        frames: ['at outer (index.ts:1:2)'],
      });
    });

    it('translates a hidden function with a definition as OUTLINED using the authored function name', () => {
      const info = createOutliningScopesInfo();

      assert.deepEqual(stringify(info.translateRawFrame(1, 17)), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.OUTLINED,
        frames: ['at outer (index.ts:2:4)'],
      });
    });

    it('translates a function without a definition as HIDDEN without frames, even if it\'s not marked hidden', () => {
      const info = createOutliningScopesInfo();

      assert.deepEqual(stringify(info.translateRawFrame(2, 18)), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.HIDDEN,
        frames: [],
      });
    });

    it('translates a function marked hidden without a definition as HIDDEN without frames', () => {
      const info = createOutliningScopesInfo();

      assert.deepEqual(stringify(info.translateRawFrame(3, 18)), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.HIDDEN,
        frames: [],
      });
    });

    it('classifies a position by its inner-most generated function', () => {
      const scopeInfo = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap),
                                                new ScopeInfoBuilder()
                                                    .startSource()
                                                    .startScope(0, 0, {isStackFrame: true, key: 'fn'})
                                                    .endScope(10, 0)
                                                    .endSource()
                                                    .startRange(0, 0)
                                                    .startRange(0, 10, {isStackFrame: true, isHidden: true})
                                                    .startRange(0, 20, {isStackFrame: true, scopeKey: 'fn'})
                                                    .endRange(0, 30)
                                                    .endRange(0, 40)
                                                    .endRange(0, 50)
                                                    .build());

      assert.strictEqual(scopeInfo.translateRawFrame(0, 25).kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE);
      assert.strictEqual(scopeInfo.translateRawFrame(0, 35).kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.HIDDEN);
    });

    //
    //    orig. code                         gen. code
    //             10        20                       10        20
    //    012345678901234567890              012345678901234567890123456
    //
    // 0: function inner() {                 function outer(){_loop();}
    // 1:   log();                           function _loop(){log()}
    // 2: }
    // 3: function outer() {
    // 4:   {
    // 5:     inner();
    // 6:   }
    // 7: }
    //
    // The block in `outer` is outlined into `_loop` and `inner` is inlined into `_loop`.
    function createInlinedIntoOutlinedScopesInfo(mappings: string[]): SDK.SourceMapScopesInfo.SourceMapScopesInfo {
      const sourceMap = new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`,
                                                    encodeSourceMap(mappings), new Common.Console.Console());

      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 14, {kind: 'function', key: 'inner', name: 'inner', isStackFrame: true})
          .endScope(2, 1)
          .startScope(3, 14, {kind: 'function', key: 'outer', name: 'outer', isStackFrame: true})
          .startScope(4, 2, {kind: 'block', key: 'block'})
          .endScope(6, 3)
          .endScope(7, 1)
          .endScope(8, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 14, {scopeKey: 'outer', isStackFrame: true})
          .endRange(0, 26)
          .startRange(1, 14, {scopeKey: 'block', isStackFrame: true, isHidden: true})
          .startRange(1, 17, {scopeKey: 'inner', callSite: {sourceIndex: 0, line: 5, column: 4}})
          .endRange(1, 22)
          .endRange(1, 23)
          .endRange(2, 0);

      return new SourceMapScopesInfo(sourceMap, builder.build());
    }

    it('expands inlined functions inside an OUTLINED function', () => {
      const info = createInlinedIntoOutlinedScopesInfo(['0:17 => index.ts:4:2', '1:17 => index.ts:1:2']);

      assert.deepEqual(stringify(info.translateRawFrame(1, 17)), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.OUTLINED,
        frames: ['at inner (index.ts:1:2)', 'at outer (index.ts:5:4)'],
      });
    });

    it('identifies the authored function of an unmapped position via the generated ranges', () => {
      const info = createInlinedIntoOutlinedScopesInfo(['0:17 => index.ts:4:2', '1:14']);

      const translation = info.translateRawFrame(1, 17);

      assert.deepEqual(stringify(translation), {
        kind: SDK.SourceMapScopesInfo.GeneratedFrameKind.OUTLINED,
        frames: ['at inner (index.ts:unmapped)', 'at outer (index.ts:5:4)'],
      });
      assert.deepEqual(translation.frames[0].functionStart, {line: 0, column: 14});
    });

    it('identifies the file of unmapped top-level code via the generated ranges', () => {
      // `index.ts` is only known through the first mapping. The position under test is covered by the second one.
      const sourceMap =
          new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`,
                                      encodeSourceMap(['0:0 => index.ts:0:0', '0:5']), new Common.Console.Console());
      const builder = new ScopeInfoBuilder();
      builder.startSource().startScope(0, 0, {kind: 'global', key: 'global'}).endScope(1, 0).endSource();
      builder.startRange(0, 0, {scopeKey: 'global'}).endRange(1, 0);
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const {kind, frames} = info.translateRawFrame(0, 7);

      assert.strictEqual(kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE);
      assert.deepEqual(frames, [{name: undefined, url: urlString`index.ts`, functionStart: undefined}]);
    });

    it('returns no frames for an unmapped position without an original scope', () => {
      const scopeInfo = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap),
                                                new ScopeInfoBuilder()
                                                    .startSource()
                                                    .startScope(0, 0, {isStackFrame: true, key: 'fn'})
                                                    .endScope(10, 0)
                                                    .endSource()
                                                    .startRange(0, 0)
                                                    .startRange(0, 20, {isStackFrame: true, scopeKey: 'fn'})
                                                    .endRange(0, 30)
                                                    .endRange(0, 50)
                                                    .build());

      // Inside `fn` the function is known, outside of it nothing is.
      assert.deepEqual(scopeInfo.translateRawFrame(0, 25).frames,
                       [{name: '', url: undefined, functionStart: {line: 0, column: 0}}]);
      assert.deepEqual(scopeInfo.translateRawFrame(0, 5).frames, []);
    });

    it('returns the start of the original function for the top frame and each inlined caller', () => {
      const info = createInlinedIntoOutlinedScopesInfo(['0:17 => index.ts:4:2', '1:17 => index.ts:1:2']);

      const {frames} = info.translateRawFrame(1, 17);

      assert.deepEqual(frames.map(f => f.functionStart), [{line: 0, column: 14}, {line: 3, column: 14}]);
      assert.deepEqual(info.translateRawFrame(0, 17).frames[0]?.functionStart, {line: 3, column: 14});
    });

    it('returns no function start for top-level code', () => {
      const sourceMap =
          new SDK.SourceMap.SourceMap(urlString`index.js`, urlString`index.js.map`,
                                      encodeSourceMap(['0:0 => index.ts:0:0']), new Common.Console.Console());
      const builder = new ScopeInfoBuilder();
      builder.startSource().startScope(0, 0, {kind: 'global', key: 'global'}).endScope(1, 0).endSource();
      builder.startRange(0, 0, {scopeKey: 'global'}).endRange(1, 0);
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const {kind, frames: [frame]} = info.translateRawFrame(0, 0);

      assert.strictEqual(kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE);
      assert.exists(frame);
      assert.isUndefined(frame.name);
      assert.isUndefined(frame.functionStart);
    });
  });

  describe('stepping queries', () => {
    //  0: function F(){         F, with inlined callees:
    //  1:   ...                   I (1:0-3:0), which itself inlines J (2:0-2:5)
    //  4:   ...                   K (4:0-4:5)
    //  5:   function n(){...}     nested function n (5:2-5:16), with an inlined callee (5:5-5:8)
    //  6: }
    //  7: function o(){}        outlined part of F (hidden)
    //  8: function h(){}        helper without original scope (hidden)
    //  9: function G(){}        G
    // 10: function p(){}        outlined part of G (hidden, unless `outlined` is false)
    function createInfo({outlined = true}: {outlined?: boolean} = {}): SDK.SourceMapScopesInfo.SourceMapScopesInfo {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(0, 10, {kind: 'function', name: 'F', key: 'F', isStackFrame: true})
          .startScope(2, 2, {kind: 'block', key: 'block'})
          .endScope(3, 3)
          .endScope(10, 1)
          .startScope(12, 10, {kind: 'function', name: 'G', key: 'G', isStackFrame: true})
          .startScope(13, 2, {kind: 'block', key: 'blockG'})
          .endScope(14, 3)
          .endScope(15, 1)
          .endScope(20, 0)
          .endSource();
      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 0, {scopeKey: 'F', isStackFrame: true})
          .startRange(1, 0, {callSite: {sourceIndex: 0, line: 1, column: 2}})
          .startRange(2, 0, {callSite: {sourceIndex: 0, line: 5, column: 2}})
          .endRange(2, 5)
          .endRange(3, 0)
          .startRange(4, 0, {callSite: {sourceIndex: 0, line: 2, column: 2}})
          .endRange(4, 5)
          .startRange(5, 2, {isStackFrame: true})
          .startRange(5, 5, {callSite: {sourceIndex: 0, line: 7, column: 2}})
          .endRange(5, 8)
          .endRange(5, 16)
          .endRange(6, 1)
          .startRange(7, 0, {scopeKey: 'block', isStackFrame: true, isHidden: outlined})
          .endRange(7, 14)
          .startRange(8, 0, {isStackFrame: true, isHidden: true})
          .endRange(8, 14)
          .startRange(9, 0, {scopeKey: 'G', isStackFrame: true})
          .endRange(9, 14)
          .startRange(10, 0, {scopeKey: 'blockG', isStackFrame: true, isHidden: outlined})
          .endRange(10, 14)
          .endRange(11, 0);
      return new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
    }

    function range(startLine: number, startColumn: number, endLine: number,
                   endColumn: number): SDK.SourceMapScopesInfo.PositionRange {
      return {start: {line: startLine, column: startColumn}, end: {line: endLine, column: endColumn}};
    }

    it('inlinedFunctionRange returns the innermost inlined function body', () => {
      const info = createInfo();
      assert.deepEqual(info.inlinedFunctionRange(1, 1), range(1, 0, 3, 0));
      assert.deepEqual(info.inlinedFunctionRange(2, 1), range(2, 0, 2, 5));
      assert.deepEqual(info.inlinedFunctionRange(5, 6), range(5, 5, 5, 8));
    });

    it('inlinedFunctionRange returns null outside of inlined functions', () => {
      const info = createInfo();
      assert.isNull(info.inlinedFunctionRange(0, 5));
      assert.isNull(info.inlinedFunctionRange(5, 3));
      assert.isNull(info.inlinedFunctionRange(7, 3));
    });

    it('inlinedCalleeRanges returns the callees inlined directly into the current logical function', () => {
      const info = createInfo();
      assert.deepEqual(info.inlinedCalleeRanges(0, 5), [range(1, 0, 3, 0), range(4, 0, 4, 5)]);
      assert.deepEqual(info.inlinedCalleeRanges(1, 1), [range(2, 0, 2, 5)]);
      assert.deepEqual(info.inlinedCalleeRanges(5, 3), [range(5, 5, 5, 8)]);
      assert.deepEqual(info.inlinedCalleeRanges(7, 3), []);
    });

    it('outlinedFunctionRanges returns the outlined parts of the current function', () => {
      const info = createInfo();
      assert.deepEqual(info.outlinedFunctionRanges(0, 5), [range(7, 0, 7, 14)]);
      // From within the outlined part itself.
      assert.deepEqual(info.outlinedFunctionRanges(7, 3), [range(7, 0, 7, 14)]);
      assert.deepEqual(info.outlinedFunctionRanges(9, 3), [range(10, 0, 10, 14)]);
    });

    it('outlinedFunctionRanges is empty without outlined parts or outside of authored functions', () => {
      assert.deepEqual(createInfo({outlined: false}).outlinedFunctionRanges(0, 5), []);
      // The nested function `n` and the helper `h` have no original scope.
      assert.deepEqual(createInfo().outlinedFunctionRanges(5, 3), []);
      assert.deepEqual(createInfo().outlinedFunctionRanges(8, 3), []);
    });

    it('artificialFunctionRanges returns generated functions without any original scope', () => {
      assert.deepEqual(createInfo().artificialFunctionRanges(), [range(5, 2, 5, 16), range(8, 0, 8, 14)]);
    });
  });

  describe('hasVariablesAndBindings', () => {
    it('returns false for scope info without variables or bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {kind: 'function', isStackFrame: true, name: 'foo', key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns false for scope info with variables but no bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(
              10, 0,
              {kind: 'function', isStackFrame: true, name: 'foo', variables: ['variable1', 'variable2'], key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isFalse(info.hasVariablesAndBindings());
    });

    it('returns true for scope info with variables and bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(
              10, 0,
              {kind: 'function', isStackFrame: true, name: 'foo', variables: ['variable1', 'variable2'], key: 'foo'})
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10, {scopeKey: 'foo', isStackFrame: true, values: ['a', 'b']})
          .endRange(0, 20)
          .endRange(0, 30);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isTrue(info.hasVariablesAndBindings());
    });
  });

  describe('findMatchingScopeNumber', () => {
    function callFrameWithScopes(payloads: Protocol.Debugger.Scope[]) {
      const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
      callFrame.debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      callFrame.location.returns(new SDK.DebuggerModel.Location(callFrame.debuggerModel, SCRIPT_ID, 0, 0));
      stubScopeChain(callFrame, payloads);
      return callFrame;
    }

    function range(start: {line: number, column: number}, end: {line: number, column: number},
                   isStackFrame = false): ScopesCodec.GeneratedRange {
      return {start, end, isStackFrame, isHidden: false, values: [], children: []};
    }

    it('prefers a V8 scope whose range matches exactly', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #1:              |-------------------------------- Closure (#1) ---------------------------------|
      // V8 #0:                        |----------------------- Local (#0) ------------------------|
      // Range:              |-------------------------- matches V8 #1 exactly ------------------------------|
      //                                                             x (paused)
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 20}, {line: 0, column: 80}),
        scopePayload(Protocol.Debugger.ScopeType.Closure, {line: 0, column: 10}, {line: 0, column: 90}),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 10}, {line: 0, column: 90}));

      assert.strictEqual(scopeNumber, 1);
    });

    it('returns the outer-most V8 scope contained in the range', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #3:    |-------------------------------- Script (#3) ----------------------------------------> 200
      // V8 #2:                        |---------------------- Closure (#2) -----------------------|
      // V8 #1:                                  |------------- Block (#1) --------------|
      // V8 #0:                                            |--- Local (#0) ----|
      // Range:              |---------------------------------- picks #2 -----------------------------------|
      //                                                             x (paused)
      //
      // A generated range for the outer function spans the whole function text, so it contains every
      // scope nested inside it. We want the outer function's own scope, not an inner one.
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 40}, {line: 0, column: 60}),
        scopePayload(Protocol.Debugger.ScopeType.Block, {line: 0, column: 30}, {line: 0, column: 70}),
        scopePayload(Protocol.Debugger.ScopeType.Closure, {line: 0, column: 20}, {line: 0, column: 80}),
        scopePayload(Protocol.Debugger.ScopeType.Script, {line: 0, column: 0}, {line: 0, column: 200}),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 10}, {line: 0, column: 90}));

      assert.strictEqual(scopeNumber, 2);
    });

    it('returns the inner-most V8 scope containing the range when no scope is contained in it', () => {
      //           0         10        20        30        40   45   50   55   60        70        80        90
      // V8 #1:                        |---------------------- Closure (#1) -----------------------|
      // V8 #0:                                            |--- Local (#0) ----|
      // Range:                                                 |-- #0 ---|
      //                                                             x (paused)
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 40}, {line: 0, column: 60}),
        scopePayload(Protocol.Debugger.ScopeType.Closure, {line: 0, column: 20}, {line: 0, column: 80}),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 45}, {line: 0, column: 55}));

      assert.strictEqual(scopeNumber, 0);
    });

    it('returns the inner-most V8 scope containing the range when sharing an end boundary', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #0:                        |----------------------- Local (#0) ------------------------|
      // Range:                                  |------------------- picks #0 --------------------|
      //                                                             x (paused)
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 20}, {line: 0, column: 80}),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 30}, {line: 0, column: 80}));

      assert.strictEqual(scopeNumber, 0);
    });

    it('returns the inner-most V8 scope containing the range when sharing a start boundary', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #0:                        |----------------------- Local (#0) ------------------------|
      // Range:                        |------------------- picks #0 --------------------|
      //                                                             x (paused)
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 20}, {line: 0, column: 80}),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 20}, {line: 0, column: 70}));

      assert.strictEqual(scopeNumber, 0);
    });

    it('ignores scopes from a different script', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #0:              |----------------------- Closure (#0, script: 'other') -----------------------|
      // Range:              |---------------------------------- no match -----------------------------------|
      //                                                             x (paused on script: '0')
      const OTHER_SCRIPT = 'other-script-id' as Protocol.Runtime.ScriptId;
      const otherScriptScope: Protocol.Debugger.Scope = {
        type: Protocol.Debugger.ScopeType.Closure,
        object: {type: Protocol.Runtime.RemoteObjectType.Object} as Protocol.Runtime.RemoteObject,
        startLocation: {scriptId: OTHER_SCRIPT, lineNumber: 0, columnNumber: 10},
        endLocation: {scriptId: OTHER_SCRIPT, lineNumber: 0, columnNumber: 90},
      };
      const callFrame = callFrameWithScopes([otherScriptScope]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 10}, {line: 0, column: 90}));

      assert.isUndefined(scopeNumber);
    });

    it('prefers function scopes for stack frame ranges', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #2:    |-------------------------------- Script (#2) ----------------------------------------> 200
      // V8 #1:                                  |------------- Block (#1) --------------|
      // V8 #0:                                            |- Local (#0, fn) --|
      // Range:                        |-----------------------------------------------------------|
      //                                                             x (paused)
      // Range (stack frame): picks #0 (function scope)
      // Range (plain):       picks #1 (outer-most contained scope: Block)
      //
      // The block scope is the outer-most scope contained in the range, but since the range is a stack
      // frame it must map onto a function scope.
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 40}, {line: 0, column: 60}),
        scopePayload(Protocol.Debugger.ScopeType.Block, {line: 0, column: 30}, {line: 0, column: 70}),
        scopePayload(Protocol.Debugger.ScopeType.Script, {line: 0, column: 0}, {line: 0, column: 200}),
      ]);

      const asStackFrame = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 20}, {line: 0, column: 80}, /* isStackFrame */ true));
      const asPlainRange = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 20}, {line: 0, column: 80}));

      assert.strictEqual(asStackFrame, 0);
      assert.strictEqual(asPlainRange, 1);
    });

    it('ignores scopes without a location range', () => {
      //           0         10        20        30        40        50        60        70        80        90
      // V8 #2:    (no location - Global)
      // V8 #1:                        |---------------------- Closure (#1) -----------------------|
      // V8 #0:    (no location - Local)
      // Range:              |---------------------------------- picks #1 -----------------------------------|
      //                                                             x (paused)
      const callFrame = callFrameWithScopes([
        scopePayload(Protocol.Debugger.ScopeType.Local),
        scopePayload(Protocol.Debugger.ScopeType.Closure, {line: 0, column: 20}, {line: 0, column: 80}),
        scopePayload(Protocol.Debugger.ScopeType.Global),
      ]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 10}, {line: 0, column: 90}));

      assert.strictEqual(scopeNumber, 1);
    });

    it('returns undefined when no V8 scope overlaps the range', () => {
      //           0    5    10        20
      // V8 #0:    |---------| Local (#0) [0..10)
      // Range:         |--------------| [5..20) (overlap, but neither contains the other)
      //           x (paused)
      const callFrame = callFrameWithScopes(
          [scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 0}, {line: 0, column: 10})]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 5}, {line: 0, column: 20}));

      assert.isUndefined(scopeNumber);
    });

    it('returns undefined for an empty scope chain', () => {
      //           0         10
      // V8:       (empty scope chain)
      // Range:    |---------| [0..10) -> undefined
      const callFrame = callFrameWithScopes([]);

      const scopeNumber = SDK.SourceMapScopesInfo.findMatchingScopeNumber(
          callFrame, range({line: 0, column: 0}, {line: 0, column: 10}));

      assert.isUndefined(scopeNumber);
    });
  });

  describe('resolveMappedScopeChain', () => {
    function setUpCallFrameAndSourceMap(options: {
      generatedPausedPosition: {line: number, column: number},
      mappedPausedPosition?: {sourceIndex: number, line: number, column: number},
      returnValue?: SDK.RemoteObject.RemoteObject,
      scopeChain?: Protocol.Debugger.Scope[],
    }) {
      const callFrame = sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
      const target = universe.createTarget();
      callFrame.debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel)!;

      const {generatedPausedPosition, mappedPausedPosition, returnValue} = options;

      callFrame.location.returns(new SDK.DebuggerModel.Location(
          callFrame.debuggerModel, '0' as Protocol.Runtime.ScriptId, generatedPausedPosition.line,
          generatedPausedPosition.column));
      callFrame.returnValue.returns(returnValue ?? null);
      stubScopeChain(callFrame, options.scopeChain ?? []);

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
          isRangeMapping: false,
        });
      } else {
        sourceMap.findEntry.returns(null);
      }

      return {sourceMap, callFrame};
    }

    it('returns null when the inner-most generated range doesn\'t have an original scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource().startScope(0, 0, {kind: 'global', key: 'global'}).endScope(20, 0).endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 10)  // Small range that doesn't map to anything.
          .endRange(0, 20)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({generatedPausedPosition: {line: 0, column: 15}});
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNull(scopeChain);
    });

    it('evaluates each scope\'s bindings in the matching V8 scope', async () => {
      //           0         10        20        30        40        50        60        70        80        90       100
      // V8 #2:    (Global)
      // V8 #1:                        |---------------------- Closure (#1) -----------------------|
      // V8 #0:                                            |--- Local (#0) ----|
      // SM outer:                     |----------------------- eval in #1 ------------------------|
      // SM inner:                                         |--- eval in #0 ----|
      // SM global:|---------------------------------------------------------------------------------------------------|
      //                                                             x (paused: col 50)
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(5, 0,
                      {kind: 'function', isStackFrame: true, name: 'outer', variables: ['outerVar'], key: 'outer'})
          .startScope(10, 0,
                      {kind: 'function', isStackFrame: true, name: 'inner', variables: ['innerVar'], key: 'inner'})
          .endScope(15, 0)
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'outer', isStackFrame: true, values: ['o']})
          .startRange(0, 40, {scopeKey: 'inner', isStackFrame: true, values: ['i']})
          .endRange(0, 60)
          .endRange(0, 80)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 12, column: 0},
        scopeChain: [
          scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 40}, {line: 0, column: 60}),
          scopePayload(Protocol.Debugger.ScopeType.Closure, {line: 0, column: 20}, {line: 0, column: 80}),
          scopePayload(Protocol.Debugger.ScopeType.Global),
        ],
      });
      callFrame.evaluate.resolves({object: new SDK.RemoteObject.LocalJSONObject({0: 42})});
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 4);
      await scopeChain[0].object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ false);
      await scopeChain[1].object().getAllProperties(/* accessorPropertiesOnly */ false, /* generatePreview */ false);

      sinon.assert.calledWithMatch(callFrame.evaluate, {
        expression: '({__proto__: null, ...(() => { try { return {0: (i)}; } catch {} })()})',
        scopeNumber: 0,
      });
      sinon.assert.calledWithMatch(callFrame.evaluate, {
        expression: '({__proto__: null, ...(() => { try { return {0: (o)}; } catch {} })()})',
        scopeNumber: 1,
      });
    });

    it('returns the original global scope when paused in the global scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource().startScope(0, 0, {kind: 'global', key: 'global'}).endScope(20, 0).endSource();
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
         builder.startSource()
             .startScope(0, 0, {kind: 'function', isStackFrame: true, name: 'outer', key: 'outer'})
             .startScope(5, 0, {kind: 'function', isStackFrame: true, name: 'inner', key: 'inner'})
             .endScope(15, 0)
             .endScope(20, 0)
             .endSource();

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
      builder.startSource()
          .startScope(0, 0, {kind: 'function', isStackFrame: true, name: 'someFn', key: 'func'})
          .startScope(5, 0, {kind: 'block', key: 'block'})
          .endScope(15, 0)
          .endScope(20, 0)
          .endSource();

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

    it('identifies function scopes via isStackFrame regardless of the kind label', () => {
      // `kind` is a free-form UI label with no semantic significance, and the spec encourages
      // capitalized values. Only `isStackFrame` decides whether a scope is a function scope.
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'Global', key: 'global'})
          .startScope(5, 0, {kind: 'Function', isStackFrame: true, name: 'outer', key: 'outer'})
          .startScope(10, 0, {isStackFrame: true, name: 'inner', key: 'inner'})  // No `kind` at all.
          .endScope(15, 0)
          .endScope(18, 0)
          .endScope(20, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'outer'})
          .startRange(0, 40, {scopeKey: 'inner'})
          .endRange(0, 60)
          .endRange(0, 80)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 12, column: 0},
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 3);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
      assert.strictEqual(scopeChain[0].name(), 'inner');
      assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Closure);
      assert.strictEqual(scopeChain[1].name(), 'outer');
      assert.strictEqual(scopeChain[2].type(), Protocol.Debugger.ScopeType.Global);
    });

    it('keeps the local scope on a return statement when the kind label is capitalized', () => {
      // Regression test: the trimming in resolveMappedScopeChain drops everything before the 'Local'
      // scope. When function scopes were identified by `kind === 'function'`, a capitalized 'Function'
      // produced no 'Local' scope and the loop shifted the entire chain off, leaving an empty view.
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'Function', isStackFrame: true, name: 'someFn', key: 'func'})
          .startScope(5, 0, {kind: 'Block', key: 'block'})
          .endScope(15, 0)
          .endScope(20, 0)
          .endSource();

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
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(10, 0, {
            kind: 'function',
            isStackFrame: true,
            name: 'someFn',
            variables: ['fooVariable', 'barVariable'],
            key: 'func',
          })
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

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
        assert.strictEqual(expression, '({__proto__: null, ...(() => { try { return {0: (f)}; } catch {} })()})');
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject({0: 42})});
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
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['fooConstant', 'barVariable'], key: 'global'})
          .startScope(10, 0, {kind: 'function', isStackFrame: true, name: 'someFn', key: 'func'})
          .endScope(20, 0)
          .endScope(30, 0)
          .endSource();

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
        assert.strictEqual(expression, '({__proto__: null, ...(() => { try { return {0: (42)}; } catch {} })()})');
        return Promise.resolve({object: new SDK.RemoteObject.LocalJSONObject({0: 42})});
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
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['inner', 'outer'], key: 'global'})
          .startScope(0, 14, {kind: 'function', isStackFrame: true, name: 'inner', variables: ['x'], key: 'inner'})
          .endScope(3, 1)
          .startScope(5, 14, {kind: 'function', isStackFrame: true, name: 'outer', variables: ['y'], key: 'outer'})
          .startScope(6, 9, {kind: 'block', key: 'block'})
          .endScope(8, 3)
          .endScope(9, 1)
          .endScope(12, 0)
          .endSource();

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

    it('retains both authored global scope and V8 global scope when V8 global scope is present', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['authoredGlobal'], key: 'global'})
          .startScope(5, 0, {kind: 'function', isStackFrame: true, name: 'fn', variables: ['localVar'], key: 'fn'})
          .endScope(15, 0)
          .endScope(20, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global', values: ['"authored"']})
          .startRange(0, 20, {scopeKey: 'fn', isStackFrame: true, values: ['"local"']})
          .endRange(0, 80)
          .endRange(0, 100);

      const {sourceMap, callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
        scopeChain: [
          scopePayload(Protocol.Debugger.ScopeType.Local, {line: 0, column: 20}, {line: 0, column: 80}),
          scopePayload(Protocol.Debugger.ScopeType.Global),
        ],
      });
      const info = new SourceMapScopesInfo(sourceMap, builder.build());

      const scopeChain = info.resolveMappedScopeChain(callFrame);

      assert.isNotNull(scopeChain);
      assert.lengthOf(scopeChain, 3);
      assert.strictEqual(scopeChain[0].type(), Protocol.Debugger.ScopeType.Local);
      assert.instanceOf(scopeChain[0], SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry);
      assert.strictEqual(scopeChain[1].type(), Protocol.Debugger.ScopeType.Global);
      assert.instanceOf(scopeChain[1], SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry);
      assert.strictEqual(scopeChain[2].type(), Protocol.Debugger.ScopeType.Global);
      assert.notInstanceOf(scopeChain[2], SDK.SourceMapScopeChainEntry.SourceMapScopeChainEntry);
    });

    it('builds scope chain for outlined functions (isHidden: true) if and only if they have an associated original scope',
       () => {
         const builder = new ScopeInfoBuilder();
         builder.startSource()
             .startScope(0, 0, {kind: 'global', key: 'global'})
             .startScope(
                 5, 0,
                 {kind: 'function', isStackFrame: true, name: 'outlinedWithScope', variables: ['v'], key: 'outlined'})
             .endScope(15, 0)
             .endScope(20, 0)
             .endSource();

         builder.startRange(0, 0, {scopeKey: 'global'})
             .startRange(0, 20, {scopeKey: 'outlined', isStackFrame: true, isHidden: true, values: ['"val"']})
             .endRange(0, 50)
             .startRange(0, 60, {isStackFrame: true, isHidden: true})
             .endRange(0, 90)
             .endRange(0, 100);

         // Case 1: Outlined function WITH linked OriginalScope via definition -> returns scope chain.
         const setup1 = setUpCallFrameAndSourceMap({
           generatedPausedPosition: {line: 0, column: 30},
           mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
         });
         const info1 = new SourceMapScopesInfo(setup1.sourceMap, builder.build());
         const scopeChain1 = info1.resolveMappedScopeChain(setup1.callFrame);
         assert.isNotNull(scopeChain1);
         assert.lengthOf(scopeChain1, 2);
         assert.strictEqual(scopeChain1[0].type(), Protocol.Debugger.ScopeType.Local);
         assert.strictEqual(scopeChain1[0].name(), 'outlinedWithScope');

         // Case 2: Outlined function WITHOUT linked OriginalScope -> returns null.
         const setup2 = setUpCallFrameAndSourceMap({
           generatedPausedPosition: {line: 0, column: 75},
         });
         const info2 = new SourceMapScopesInfo(setup2.sourceMap, builder.build());
         const scopeChain2 = info2.resolveMappedScopeChain(setup2.callFrame);
         assert.isNull(scopeChain2);
       });

    it('disallows resolveScopeChain for user-attached source maps while keeping other source map features working',
       () => {
         const builder = new ScopeInfoBuilder();
         builder.startSource()
             .startScope(0, 0, {kind: 'global', key: 'global'})
             .startScope(5, 0, {kind: 'function', isStackFrame: true, name: 'authoredFn', variables: ['x'], key: 'fn'})
             .endScope(15, 0)
             .endScope(20, 0)
             .endSource();
         builder.startRange(0, 0, {scopeKey: 'global'})
             .startRange(0, 20, {scopeKey: 'fn', isStackFrame: true, values: ['"val"']})
             .endRange(0, 80)
             .endRange(0, 100);

         const {callFrame} = setUpCallFrameAndSourceMap({
           generatedPausedPosition: {line: 0, column: 50},
           mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
         });
         const payload = ScopesCodec.encode(builder.build(), {version: 3, sources: ['foo.ts'], mappings: ''}) as
             SDK.SourceMap.SourceMapV3;

         const userMap = new SDK.SourceMap.SourceMap(
             urlString`http://example.com/bundle.js`, urlString`http://example.com/bundle.js.map`, payload,
             universe.console, undefined, SDK.SourceMap.SourceMapProvenance.USER);
         assert.strictEqual(userMap.provenance(), SDK.SourceMap.SourceMapProvenance.USER);
         assert.isNull(userMap.resolveScopeChain(callFrame));
         assert.strictEqual(userMap.findOriginalFunctionName({line: 0, column: 50}), 'authoredFn');

         const cdpMap = new SDK.SourceMap.SourceMap(urlString`http://example.com/bundle.js`,
                                                    urlString`http://example.com/bundle.js.map`, payload,
                                                    universe.console, undefined, SDK.SourceMap.SourceMapProvenance.CDP);
         assert.strictEqual(cdpMap.provenance(), SDK.SourceMap.SourceMapProvenance.CDP);
         assert.isNotNull(cdpMap.resolveScopeChain(callFrame));

         const extMap = new SDK.SourceMap.SourceMap(
             urlString`http://example.com/bundle.js`, urlString`http://example.com/bundle.js.map`, payload,
             universe.console, undefined, SDK.SourceMap.SourceMapProvenance.EXTENSION);
         assert.strictEqual(extMap.provenance(), SDK.SourceMap.SourceMapProvenance.EXTENSION);
         assert.isNotNull(extMap.resolveScopeChain(callFrame));
       });

    it('returns null from SourceMap.resolveScopeChain when scopes do not contain variables or bindings', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', key: 'global'})
          .startScope(5, 0, {kind: 'function', isStackFrame: true, name: 'fnNoVars', key: 'fn'})
          .endScope(15, 0)
          .endScope(20, 0)
          .endSource();
      builder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'fn', isStackFrame: true})
          .endRange(0, 80)
          .endRange(0, 100);

      const {callFrame} = setUpCallFrameAndSourceMap({
        generatedPausedPosition: {line: 0, column: 50},
        mappedPausedPosition: {sourceIndex: 0, line: 10, column: 0},
      });
      const sourceMap = new SDK.SourceMap.SourceMap(
          urlString`http://example.com/bundle.js`, urlString`http://example.com/bundle.js.map`,
          ScopesCodec.encode(builder.build(), {version: 3, sources: ['foo.ts'], mappings: ''}) as
              SDK.SourceMap.SourceMapV3,
          universe.console);

      assert.isTrue(sourceMap.hasScopeInfo());
      assert.isNull(sourceMap.resolveScopeChain(callFrame));
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
          case 190:
            return new SDK.SourceMap.SourceMapEntry(line, column, /* sourceIndex */ 0, /* sourceUrl */ undefined,
                                                    /* sourceLine */ 85,
                                                    /* sourceColumn */ 2);
        }
        return null;
      });

      const addScopes = (builder: ScopesCodec.ScopeInfoBuilder) => {
        builder.startSource()
            .startScope(0, 0, {kind: 'global', key: 'global'})
            .startScope(10, 10, {kind: 'function', name: 'myAuthoredFunction', isStackFrame: true, key: 'authored'})
            .startScope(20, 15, {kind: 'block', key: 'block'})
            .endScope(30, 3)
            .endScope(40, 1)
            .startScope(50, 10, {kind: 'function', isStackFrame: true, key: 'unnamed'})
            .endScope(60, 1)
            .endScope(70, 0)
            .startScope(80, 0, {kind: 'function', name: 'secondRootFunction', isStackFrame: true, key: 'secondRoot'})
            .endScope(90, 0)
            .endSource();
      };

      const mappingsBuilder = new ScopeInfoBuilder();
      addScopes(mappingsBuilder);
      const scopeInfoWithMappings = new SourceMapScopesInfo(sourceMap, mappingsBuilder.build());

      const rangesBuilder = new ScopeInfoBuilder();
      addScopes(rangesBuilder);
      rangesBuilder.startRange(0, 0, {scopeKey: 'global'})
          .startRange(0, 20, {scopeKey: 'authored'})
          .startRange(0, 40, {scopeKey: 'block'})
          .endRange(0, 60)
          .endRange(0, 80)
          .startRange(0, 100, {scopeKey: 'unnamed'})
          .endRange(0, 120)
          .startRange(0, 140)
          .endRange(0, 160)
          .endRange(0, 180)
          .startRange(0, 180, {scopeKey: 'secondRoot'})
          .endRange(0, 200);
      const scopeInfoWithRanges = new SourceMapScopesInfo(sourceMap, rangesBuilder.build());
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

        it('provides the original name for a function in a second root scope of the same source', () => {
          assert.strictEqual(scopeInfo.findOriginalFunctionName({line: 0, column: 190}), 'secondRootFunction');
        });
      });
    });
  });

  describe('createFromAst', () => {
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
      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());

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

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());
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

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());
      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast!, new TextUtils.Text.Text(generatedCode));

      // Although the AST found a function, the source map is invalid.
      for (let i = 0; i < 20; i++) {
        const result = info.findOriginalFunctionScope({line: 0, column: i});
        assert.isNull(result, 'Should not return a scope when source files mismatch');
      }
    });

    it('does not treat functions it can\'t map as hidden compiler helpers', () => {
      const generatedCode = `function bad() { }`;
      const ast = Formatter.ScopeParser.parseScopes(generatedCode)?.export();

      const sourceMapJSON = encodeSourceMap([
        '0:12 => fileA.js:0:12@bad',
        '0:18 => fileB.js:0:0',
      ]);

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());
      const info = SourceMapScopesInfo.createFromAst(sourceMap, ast!, new TextUtils.Text.Text(generatedCode));

      assert.strictEqual(info.translateRawFrame(0, 15).kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE);
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

      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());
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

    it('does not throw RangeError for deep nesting in createFromAst', () => {
      const depth = 5000;
      const root = new Formatter.ScopeParser.Scope(0, depth * 2, null, 1 /* BLOCK */);
      let current = root;
      for (let i = 1; i < depth; i++) {
        current = new Formatter.ScopeParser.Scope(i, depth * 2 - i, current, 1 /* BLOCK */);
      }

      const mappings: string[] = [];
      for (let i = 0; i < depth; i++) {
        mappings.push(`0:${i} => original.js:${i}:0`);
      }

      const sourceMapJSON = encodeSourceMap(mappings);
      const sourceMap = new SDK.SourceMap.SourceMap(urlString`compiled.js`, urlString`compiled.js.map`, sourceMapJSON,
                                                    new Common.Console.Console());

      const info = SourceMapScopesInfo.createFromAst(
          sourceMap, root as unknown as FormatterModels.FormatterWorkerPool.ScopeTreeNode,
          new TextUtils.Text.Text(' '.repeat(depth * 2)));
      assert.isOk(info);
    });
  });

  describe('translateRawFrame kind', () => {
    it('is VISIBLE for top-level code', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo =
          new SourceMapScopesInfo(sourceMap, new ScopeInfoBuilder().startRange(0, 0).endRange(0, 20).build());

      assert.strictEqual(scopeInfo.translateRawFrame(0, 10).kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.VISIBLE);
    });

    it('is OUTLINED for a block scope in a hidden function with a definition', () => {
      const sourceMap = sinon.createStubInstance(SDK.SourceMap.SourceMap);
      const scopeInfo =
          new SourceMapScopesInfo(sourceMap,
                                  new ScopeInfoBuilder()
                                      .startSource()
                                      .startScope(0, 0, {isStackFrame: true, key: 'fn'})
                                      .endScope(10, 0)
                                      .endSource()
                                      .startRange(0, 0)
                                      .startRange(0, 10, {isStackFrame: true, isHidden: true, scopeKey: 'fn'})
                                      .startRange(0, 20)
                                      .endRange(0, 30)
                                      .endRange(0, 40)
                                      .endRange(0, 50)
                                      .build());

      assert.strictEqual(scopeInfo.translateRawFrame(0, 25).kind, SDK.SourceMapScopesInfo.GeneratedFrameKind.OUTLINED);
    });
  });

  describe('isEmpty', () => {
    it('returns true if all original scopes are null', () => {
      const scopeInfo =
          new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), {scopes: [], ranges: []});
      scopeInfo.addOriginalScopes([null, null]);

      assert.isTrue(scopeInfo.isEmpty());
    });
  });

  describe('resolveMappedVariablesAtPosition', () => {
    it('returns null when the inner-most generated range has no original scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['g'], key: 'global'})
          .endScope(20, 0)
          .endSource();
      builder.startRange(0, 0, {scopeKey: 'global', values: ['g_gen']})
          .startRange(0, 10)
          .endRange(0, 20)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      assert.isNull(info.resolveMappedVariablesAtPosition(0, 15));
    });

    it('resolves variables across nested original scopes from inner-most to outer-most', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['globalVar'], key: 'global'})
          .startScope(2, 0, {
            kind: 'function',
            isStackFrame: true,
            name: 'outer',
            variables: ['this', 'outerParam', 'memberVar'],
            key: 'outer',
          })
          .startScope(4, 0, {kind: 'block', variables: ['blockVar', 'computedVar'], key: 'block'})
          .endScope(8, 0)
          .endScope(10, 0)
          .endScope(12, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'global', values: ['_global']})
          .startRange(0, 10, {scopeKey: 'outer', isStackFrame: true, values: ['_this', 'n', '_module.prop']})
          .startRange(0, 30, {scopeKey: 'block', values: ['b', 'n + 1']})
          .endRange(0, 60)
          .endRange(0, 80)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
      const scopes = info.resolveMappedVariablesAtPosition(0, 45);

      assert.deepEqual(scopes, [
        new Map<string, string|null>([
          ['blockVar', 'b'],
          ['computedVar', 'n + 1'],
        ]),
        new Map<string, string|null>([
          ['this', '_this'],
          ['outerParam', 'n'],
          ['memberVar', '_module.prop'],
        ]),
        new Map<string, string|null>([
          ['globalVar', '_global'],
        ]),
      ]);
    });

    it('preserves per-scope entries when inner and outer original scopes declare the same variable name', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {
            kind: 'function',
            isStackFrame: true,
            variables: ['shadowedAvailable', 'shadowedUnavailable', 'outerOnly'],
            key: 'fn',
          })
          .startScope(2, 0, {
            kind: 'block',
            variables: ['shadowedAvailable', 'shadowedUnavailable'],
            key: 'block',
          })
          .endScope(6, 0)
          .endScope(10, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['outer_a', 'outer_u', 'outer_o']})
          .startRange(0, 20, {scopeKey: 'block', values: ['inner_a', null]})
          .endRange(0, 50)
          .endRange(0, 80);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
      const scopes = info.resolveMappedVariablesAtPosition(0, 30);

      assert.deepEqual(scopes, [
        new Map<string, string|null>([
          ['shadowedAvailable', 'inner_a'],
          ['shadowedUnavailable', null],
        ]),
        new Map<string, string|null>([
          ['shadowedAvailable', 'outer_a'],
          ['shadowedUnavailable', 'outer_u'],
          ['outerOnly', 'outer_o'],
        ]),
      ]);
    });

    it('resolves sub-range bindings based on the position', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'function', isStackFrame: true, variables: ['x'], key: 'fn'})
          .endScope(10, 0)
          .endSource();
      builder
          .startRange(0, 0, {
            scopeKey: 'fn',
            isStackFrame: true,
            values: [[
              {from: {line: 0, column: 0}, to: {line: 0, column: 20}, value: undefined},
              {from: {line: 0, column: 20}, to: {line: 0, column: 50}, value: 'r1'},
              {from: {line: 0, column: 50}, to: {line: 0, column: 80}, value: 'r2.val'},
            ]],
          })
          .endRange(0, 80);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      const scopesTdz = info.resolveMappedVariablesAtPosition(0, 10);
      assert.deepEqual(scopesTdz, [new Map<string, string|null>([['x', null]])]);

      const scopesFirst = info.resolveMappedVariablesAtPosition(0, 35);
      assert.deepEqual(scopesFirst, [new Map<string, string|null>([['x', 'r1']])]);

      const scopesSecond = info.resolveMappedVariablesAtPosition(0, 65);
      assert.deepEqual(scopesSecond, [new Map<string, string|null>([['x', 'r2.val']])]);
    });

    it('marks variables as null when an enclosing original scope has no generated range in the chain', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['g'], key: 'global'})
          .startScope(2, 0, {kind: 'function', isStackFrame: true, variables: ['outerVar'], key: 'outer'})
          .startScope(4, 0, {kind: 'function', isStackFrame: true, variables: ['innerVar'], key: 'inner'})
          .endScope(6, 0)
          .endScope(8, 0)
          .endScope(10, 0)
          .endSource();

      // `inner` is outlined directly inside `global`, so `outer` has no range containing column 50.
      builder.startRange(0, 0, {scopeKey: 'global', values: ['g_val']})
          .startRange(0, 40, {scopeKey: 'inner', isStackFrame: true, values: ['i_val']})
          .endRange(0, 60)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
      const scopes = info.resolveMappedVariablesAtPosition(0, 50);

      assert.deepEqual(scopes, [
        new Map<string, string|null>([['innerVar', 'i_val']]),
        new Map<string, string|null>([['outerVar', null]]),
        new Map<string, string|null>([['g', 'g_val']]),
      ]);
    });

    it('prefers the inner-most generated range when multiple ranges map to the same original scope', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'function', isStackFrame: true, variables: ['a', 'b'], key: 'fn'})
          .endScope(10, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'fn', values: [null, 'outer_b']})
          .startRange(0, 20, {scopeKey: 'fn', values: ['inner_a', null]})
          .endRange(0, 60)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
      const scopes = info.resolveMappedVariablesAtPosition(0, 40);

      assert.deepEqual(scopes, [
        new Map<string, string|null>([['a', 'inner_a'], ['b', null]]),
      ]);
    });

    it('drops inner block scopes when ignoreInnerBlockScopes is true (e.g. paused on a return statement)', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'function', isStackFrame: true, variables: ['x', 'fnVar'], key: 'fn'})
          .startScope(2, 0, {kind: 'block', variables: ['x', 'blockVar'], key: 'block'})
          .endScope(6, 0)
          .endScope(10, 0)
          .endSource();

      builder.startRange(0, 0, {scopeKey: 'fn', isStackFrame: true, values: ['fn_x', 'fn_v']})
          .startRange(0, 20, {scopeKey: 'block', values: ['block_x', 'block_v']})
          .endRange(0, 60)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());
      const scopesOnReturn = info.resolveMappedVariablesAtPosition(0, 40, /* ignoreInnerBlockScopes=*/ true);

      assert.deepEqual(scopesOnReturn, [
        new Map<string, string|null>([['x', 'fn_x'], ['fnVar', 'fn_v']]),
      ]);
    });

    it('resolves lexical scopes for inlined function bodies both with and without inner scopes of their own', () => {
      const builder = new ScopeInfoBuilder();
      builder.startSource()
          .startScope(0, 0, {kind: 'global', variables: ['globalVar'], key: 'global'})
          .startScope(1, 0, {kind: 'function', isStackFrame: true, variables: ['inlinedParam'], key: 'inlinedFn'})
          .startScope(2, 0, {kind: 'block', variables: ['inlinedBlockVar'], key: 'inlinedBlock'})
          .endScope(4, 0)
          .endScope(5, 0)
          .startScope(7, 0, {kind: 'function', isStackFrame: true, variables: ['callerParam'], key: 'callerFn'})
          .startScope(8, 0, {kind: 'block', variables: ['callerBlockVar'], key: 'callerBlock'})
          .endScope(10, 0)
          .endScope(11, 0)
          .endScope(12, 0)
          .endSource();

      // Generated code range hierarchy:
      // global [0..100] -> callerFn [10..90] -> callerBlock [20..80] -> inlinedFn [30..70] -> inlinedBlock [45..65]
      builder.startRange(0, 0, {scopeKey: 'global', values: ['g_val']})
          .startRange(0, 10, {scopeKey: 'callerFn', isStackFrame: true, values: ['c_param']})
          .startRange(0, 20, {scopeKey: 'callerBlock', values: ['c_block']})
          .startRange(0, 30, {
            scopeKey: 'inlinedFn',
            callSite: {sourceIndex: 0, line: 9, column: 4},
            values: ['i_param'],
          })
          .startRange(0, 45, {scopeKey: 'inlinedBlock', values: ['i_block']})
          .endRange(0, 65)
          .endRange(0, 70)
          .endRange(0, 80)
          .endRange(0, 90)
          .endRange(0, 100);

      const info = new SourceMapScopesInfo(sinon.createStubInstance(SDK.SourceMap.SourceMap), builder.build());

      // 1. Inlined function body WITHOUT inner scopes of its own (column 35):
      // Walks inlinedFn -> global, excluding callerBlock and callerFn.
      assert.deepEqual(info.resolveMappedVariablesAtPosition(0, 35), [
        new Map<string, string|null>([['inlinedParam', 'i_param']]),
        new Map<string, string|null>([['globalVar', 'g_val']]),
      ]);

      // 2. Inlined function body WITH an inner block scope of its own (column 50):
      // Walks inlinedBlock -> inlinedFn -> global, excluding callerBlock and callerFn.
      assert.deepEqual(info.resolveMappedVariablesAtPosition(0, 50), [
        new Map<string, string|null>([['inlinedBlockVar', 'i_block']]),
        new Map<string, string|null>([['inlinedParam', 'i_param']]),
        new Map<string, string|null>([['globalVar', 'g_val']]),
      ]);

      // 3. With ignoreInnerBlockScopes = true at column 50:
      // Drops inlinedBlock and starts at inlinedFn -> global.
      assert.deepEqual(info.resolveMappedVariablesAtPosition(0, 50, /* ignoreInnerBlockScopes=*/ true), [
        new Map<string, string|null>([['inlinedParam', 'i_param']]),
        new Map<string, string|null>([['globalVar', 'g_val']]),
      ]);

      // 4. Selecting the caller frame (inlineFrameIndex = 1) at column 50:
      // Drops inlinedBlock and inlinedFn, walking callerBlock -> callerFn -> global.
      assert.deepEqual(
          info.resolveMappedVariablesAtPosition(0, 50, /* ignoreInnerBlockScopes=*/ false, /* inlineFrameIndex=*/ 1), [
            new Map<string, string|null>([['callerBlockVar', 'c_block']]),
            new Map<string, string|null>([['callerParam', 'c_param']]),
            new Map<string, string|null>([['globalVar', 'g_val']]),
          ]);

      // 5. Out-of-bounds inlineFrameIndex returns null without hanging.
      assert.isNull(
          info.resolveMappedVariablesAtPosition(0, 50, /* ignoreInnerBlockScopes=*/ false, /* inlineFrameIndex=*/ 99));
    });
  });

  describe('scriptRelativePosition', () => {
    function createLocation(options: {lineOffset: number, columnOffset: number, hasSourceURL: boolean},
                            lineNumber: number, columnNumber: number): SDK.DebuggerModel.Location {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const script =
          new SDK.Script.Script(debuggerModel, SCRIPT_ID, urlString`http://example.com/index.html`, options.lineOffset,
                                options.columnOffset, options.lineOffset + 10, 0, 0, '', false, undefined,
                                options.hasSourceURL, 0, null, null, null, null, null, null, null);
      sinon.stub(debuggerModel, 'scriptForId').withArgs(SCRIPT_ID).returns(script);
      return new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, lineNumber, columnNumber);
    }

    it('subtracts the line and column offset of inline scripts on the first line', () => {
      const location = createLocation({lineOffset: 4, columnOffset: 10, hasSourceURL: false}, 4, 15);
      assert.deepEqual(SDK.SourceMapScopesInfo.scriptRelativePosition(location), {line: 0, column: 5});
    });

    it('only subtracts the line offset of inline scripts on subsequent lines', () => {
      const location = createLocation({lineOffset: 4, columnOffset: 10, hasSourceURL: false}, 6, 15);
      assert.deepEqual(SDK.SourceMapScopesInfo.scriptRelativePosition(location), {line: 2, column: 15});
    });

    it('keeps the raw position for inline scripts with a sourceURL', () => {
      const location = createLocation({lineOffset: 4, columnOffset: 10, hasSourceURL: true}, 6, 15);
      assert.deepEqual(SDK.SourceMapScopesInfo.scriptRelativePosition(location), {line: 6, column: 15});
    });

    it('keeps the raw position if the script is unknown', () => {
      const debuggerModel = universe.createTarget().model(SDK.DebuggerModel.DebuggerModel)!;
      const location = new SDK.DebuggerModel.Location(debuggerModel, SCRIPT_ID, 6, 15);
      assert.deepEqual(SDK.SourceMapScopesInfo.scriptRelativePosition(location), {line: 6, column: 15});
    });
  });
});
