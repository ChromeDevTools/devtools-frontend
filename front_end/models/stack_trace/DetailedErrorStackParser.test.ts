// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';

// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from './stack_trace_impl.js';

const {urlString} = Platform.DevToolsPath;

describe('DetailedErrorStackParser', () => {
  describe('parseRawFramesFromErrorStack', () => {
    it('parses standard V8 stack frames', () => {
      const stack = `Error: foo
          at functionName (http://www.example.org/script.js:10:5)
          at Class.methodName (http://www.example.org/script.js:20:1)
          at new Constructor (http://www.example.org/script.js:30:1)
          at async asyncFunction (http://www.example.org/script.js:40:1)
          at http://www.example.org/script.js:50:1`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 5);
      assert.deepEqual(frames[0], {
        url: 'http://www.example.org/script.js',
        functionName: 'functionName',
        lineNumber: 9,
        columnNumber: 4,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: undefined,
          methodName: undefined,
          promiseIndex: undefined,
          evalOrigin: undefined,
        },
      });
      assert.deepEqual(frames[1], {
        url: 'http://www.example.org/script.js',
        functionName: 'Class.methodName',
        lineNumber: 19,
        columnNumber: 0,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: 'Class',
          methodName: 'methodName',
          promiseIndex: undefined,
          evalOrigin: undefined,
        },
      });
      assert.deepEqual(frames[2], {
        url: 'http://www.example.org/script.js',
        functionName: 'Constructor',
        lineNumber: 29,
        columnNumber: 0,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: true,
          isEval: false,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: undefined,
          methodName: undefined,
          promiseIndex: undefined,
          evalOrigin: undefined,
        },
      });
      assert.deepEqual(frames[3], {
        url: 'http://www.example.org/script.js',
        functionName: 'asyncFunction',
        lineNumber: 39,
        columnNumber: 0,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: true,
          isConstructor: false,
          isEval: false,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: undefined,
          methodName: undefined,
          promiseIndex: undefined,
          evalOrigin: undefined,
        },
      });
      assert.deepEqual(frames[4], {
        url: 'http://www.example.org/script.js',
        functionName: '',
        lineNumber: 49,
        columnNumber: 0,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: undefined,
          methodName: undefined,
          promiseIndex: undefined,
          evalOrigin: undefined,
        },
      });
    });

    it('parses eval frames', () => {
      const stack = `Error: foo
          at eval (eval at <anonymous> (http://www.example.org/script.js:10:5), <anonymous>:1:1)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.isTrue(frames[0].parsedFrameInfo?.isEval);
      assert.strictEqual(frames[0].url, '<anonymous>');
      assert.strictEqual(frames[0].lineNumber, 0);
      assert.strictEqual(frames[0].columnNumber, 0);

      assert.exists(frames[0].parsedFrameInfo?.evalOrigin);
      assert.strictEqual(frames[0].parsedFrameInfo?.evalOrigin?.url, 'http://www.example.org/script.js');
      assert.strictEqual(frames[0].parsedFrameInfo?.evalOrigin?.lineNumber, 9);
      assert.strictEqual(frames[0].parsedFrameInfo?.evalOrigin?.columnNumber, 4);
      assert.strictEqual(frames[0].parsedFrameInfo?.evalOrigin?.functionName, '<anonymous>');
    });

    it('parses deeply nested eval frames with actual function names', () => {
      const stack = `Error: foo
          at innerEval (eval at outerEval (eval at topEval (http://www.example.org/script.js:10:5)), <anonymous>:1:1)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.isTrue(frames[0].parsedFrameInfo?.isEval);
      assert.strictEqual(frames[0].url, '<anonymous>');
      assert.strictEqual(frames[0].lineNumber, 0);
      assert.strictEqual(frames[0].columnNumber, 0);

      // Level 1: outerEval
      const outerEvalOrigin = frames[0].parsedFrameInfo?.evalOrigin;
      assert.exists(outerEvalOrigin);
      assert.isTrue(outerEvalOrigin?.parsedFrameInfo?.isEval);
      assert.strictEqual(outerEvalOrigin?.functionName, 'outerEval');
      assert.strictEqual(outerEvalOrigin?.url, '');  // no <anonymous> suffix
      assert.strictEqual(outerEvalOrigin?.lineNumber, -1);
      assert.strictEqual(outerEvalOrigin?.columnNumber, -1);

      // Level 2: topEval
      const topEvalOrigin = outerEvalOrigin?.parsedFrameInfo?.evalOrigin;
      assert.exists(topEvalOrigin);
      assert.isFalse(topEvalOrigin?.parsedFrameInfo?.isEval);
      assert.strictEqual(topEvalOrigin?.functionName, 'topEval');
      assert.strictEqual(topEvalOrigin?.url, 'http://www.example.org/script.js');
      assert.strictEqual(topEvalOrigin?.lineNumber, 9);
      assert.strictEqual(topEvalOrigin?.columnNumber, 4);
    });

    it('parses aliased method calls', () => {
      const stack = `Error: foo
          at Type.method [as alias] (http://www.example.org/script.js:10:5)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].parsedFrameInfo?.typeName, 'Type');
      assert.strictEqual(frames[0].parsedFrameInfo?.methodName, 'alias');
    });

    it('parses wasm frames with function names', () => {
      const stack = `Error: foo
          at wasmModule.wasmFunc (http://www.example.org/script.js:wasm-function[123]:0xabc)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.isTrue(frames[0].isWasm);
      assert.strictEqual(frames[0].url, 'http://www.example.org/script.js');
      assert.strictEqual(frames[0].parsedFrameInfo?.wasmModuleName, 'wasmModule');
      assert.strictEqual(frames[0].parsedFrameInfo?.wasmFunctionIndex, 123);
      assert.strictEqual(frames[0].columnNumber, 0xabc);
      assert.strictEqual(frames[0].lineNumber, 0);
    });

    it('parses wasm frames without function names', () => {
      const stack = `Error: foo
          at http://www.example.org/script.js:wasm-function[123]:0xabc`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.isTrue(frames[0].isWasm);
      assert.strictEqual(frames[0].url, 'http://www.example.org/script.js');
      assert.isUndefined(frames[0].parsedFrameInfo?.wasmModuleName);
      assert.strictEqual(frames[0].parsedFrameInfo?.wasmFunctionIndex, 123);
      assert.strictEqual(frames[0].columnNumber, 0xabc);
      assert.strictEqual(frames[0].lineNumber, 0);
    });

    it('matches wasm protocol frames accurately with multiple frames', () => {
      const stack = `Error: foo
          at $inner (http://example.com/unreachable.wasm:wasm-function[2]:0x21)
          at $outer (http://example.com/unreachable.wasm:wasm-function[1]:0x95)
          at go (http://example.com/unreachable.html:27:29)`;
      const rawFrames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);
      assert.exists(rawFrames);

      const protocolStackTrace: Protocol.Runtime.StackTrace = {
        callFrames: [
          {
            url: 'http://example.com/unreachable.wasm',
            functionName: 'inner',
            scriptId: '17' as Protocol.Runtime.ScriptId,
            lineNumber: 0,
            columnNumber: 33,  // 0x21
          },
          {
            url: 'http://example.com/unreachable.wasm',
            functionName: 'outer',
            scriptId: '17' as Protocol.Runtime.ScriptId,
            lineNumber: 0,
            columnNumber: 149,  // 0x95
          },
          {
            url: 'http://example.com/unreachable.html',
            functionName: 'go',
            scriptId: '16' as Protocol.Runtime.ScriptId,
            lineNumber: 26,
            columnNumber: 28,
          }
        ]
      };

      StackTraceImpl.DetailedErrorStackParser.augmentRawFramesWithScriptIds(rawFrames, protocolStackTrace);

      assert.strictEqual(rawFrames[0].scriptId, '17');
      assert.strictEqual(rawFrames[0].columnNumber, 33);
      assert.strictEqual(rawFrames[1].scriptId, '17');
      assert.strictEqual(rawFrames[1].columnNumber, 149);
      assert.strictEqual(rawFrames[2].scriptId, '16');
    });

    it('matches mixed JS and Wasm frames accurately', () => {
      const stack = `Error: mixed
          at jsFunc (http://example.com/script.js:10:5)
          at $wasmFunc (http://example.com/module.wasm:wasm-function[0]:0x21)`;
      const rawFrames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);
      assert.exists(rawFrames);

      const protocolStackTrace: Protocol.Runtime.StackTrace = {
        callFrames: [
          {
            url: 'http://example.com/script.js',
            functionName: 'jsFunc',
            scriptId: '10' as Protocol.Runtime.ScriptId,
            lineNumber: 9,
            columnNumber: 4,
          },
          {
            url: 'http://example.com/module.wasm',
            functionName: 'wasmFunc',
            scriptId: '20' as Protocol.Runtime.ScriptId,
            lineNumber: 0,
            columnNumber: 33,  // 0x21
          }
        ]
      };

      StackTraceImpl.DetailedErrorStackParser.augmentRawFramesWithScriptIds(rawFrames, protocolStackTrace);

      assert.strictEqual(rawFrames[0].scriptId, '10');
      assert.strictEqual(rawFrames[1].scriptId, '20');
    });

    it('parses promise.all index', () => {
      const stack = `Error: foo
          at Promise.all (index 2)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].parsedFrameInfo?.promiseIndex, 2);
      assert.strictEqual(frames[0].url, '');
      assert.strictEqual(frames[0].functionName, 'Promise.all');
    });

    it('parses builtin frames', () => {
      const stack = `Error: foo
          at Array.map (<anonymous>)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].url, '');
      assert.strictEqual(frames[0].functionName, 'Array.map');
      assert.strictEqual(frames[0].lineNumber, -1);
      assert.strictEqual(frames[0].columnNumber, -1);
      assert.isTrue(StackTraceImpl.Trie.isBuiltinFrame(frames[0]));
    });

    it('returns null if arbitrary text is interleaved between frames', () => {
      const stack = `Error: foo
          at functionName (http://www.example.org/script.js:10:5)
          injected arbitrary text
          at http://www.example.org/script.js:50:1`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.isNull(frames);
    });

    it('allows and skips empty or whitespace-only lines interleaved between frames', () => {
      const stack = `Error: foo
          at functionName (http://www.example.org/script.js:10:5)

          at http://www.example.org/script.js:50:1
          `;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 2);
      assert.strictEqual(frames[0].url, 'http://www.example.org/script.js');
      assert.strictEqual(frames[0].functionName, 'functionName');
      assert.strictEqual(frames[0].lineNumber, 9);
      assert.strictEqual(frames[0].columnNumber, 4);

      assert.strictEqual(frames[1].url, 'http://www.example.org/script.js');
      assert.strictEqual(frames[1].functionName, '');
      assert.strictEqual(frames[1].lineNumber, 49);
      assert.strictEqual(frames[1].columnNumber, 0);
    });

    it('parses a complex real-world stack trace', () => {
      const stack = `Error: V8-Stack
    at end (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45))), <anonymous>:1:23)
    at eval (eval at <anonymous> (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45))), <anonymous>:1:44)
    at eval (eval at <anonymous> (eval at evalCaller (http://example.com/index.html:11:45)), <anonymous>:1:1)
    at eval (eval at evalCaller (http://example.com/index.html:11:45), <anonymous>:1:1)
    at evalCaller (http://example.com/index.html:15:45)
    at new MyConstructor (http://example.com/index.html:16:43)
    at Object.originalName [as aliasedMethod] (http://example.com/index.html:12:33)
    at http://example.com/index.html:21:29
    at Array.map (<anonymous>)
    at get triggerGetter (http://example.com/index.html:9:35)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.exists(frames);
      assert.lengthOf(frames, 10);

      // Frame 0: end
      assert.deepEqual(frames[0], {
        url: '<anonymous>',
        functionName: 'end',
        lineNumber: 0,
        columnNumber: 22,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: true,
          wasmModuleName: undefined,
          wasmFunctionIndex: undefined,
          typeName: undefined,
          methodName: undefined,
          promiseIndex: undefined,
          evalOrigin: {
            url: '',
            functionName: '<anonymous>',
            lineNumber: -1,
            columnNumber: -1,
            isWasm: false,
            parsedFrameInfo: {
              isAsync: false,
              isConstructor: false,
              isEval: true,
              wasmModuleName: undefined,
              wasmFunctionIndex: undefined,
              typeName: undefined,
              methodName: undefined,
              promiseIndex: undefined,
              evalOrigin: {
                url: '',
                functionName: '<anonymous>',
                lineNumber: -1,
                columnNumber: -1,
                isWasm: false,
                parsedFrameInfo: {
                  isAsync: false,
                  isConstructor: false,
                  isEval: true,
                  wasmModuleName: undefined,
                  wasmFunctionIndex: undefined,
                  typeName: undefined,
                  methodName: undefined,
                  promiseIndex: undefined,
                  evalOrigin: {
                    url: 'http://example.com/index.html',
                    functionName: 'evalCaller',
                    lineNumber: 10,
                    columnNumber: 44,
                    isWasm: false,
                    parsedFrameInfo: {
                      isAsync: false,
                      isConstructor: false,
                      isEval: false,
                      wasmModuleName: undefined,
                      wasmFunctionIndex: undefined,
                      typeName: undefined,
                      methodName: undefined,
                      promiseIndex: undefined,
                      evalOrigin: undefined,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Frame 4: evalCaller
      assert.strictEqual(frames[4].functionName, 'evalCaller');
      assert.strictEqual(frames[4].url, 'http://example.com/index.html');
      assert.strictEqual(frames[4].lineNumber, 14);
      assert.strictEqual(frames[4].columnNumber, 44);

      // Frame 5: new MyConstructor
      assert.strictEqual(frames[5].functionName, 'MyConstructor');
      assert.isTrue(frames[5].parsedFrameInfo?.isConstructor);
      assert.strictEqual(frames[5].lineNumber, 15);
      assert.strictEqual(frames[5].columnNumber, 42);

      // Frame 6: Object.originalName [as aliasedMethod]
      assert.strictEqual(frames[6].functionName, 'Object.originalName');
      assert.strictEqual(frames[6].parsedFrameInfo?.methodName, 'aliasedMethod');
      assert.strictEqual(frames[6].lineNumber, 11);
      assert.strictEqual(frames[6].columnNumber, 32);

      // Frame 7: anonymous
      assert.strictEqual(frames[7].functionName, '');
      assert.strictEqual(frames[7].lineNumber, 20);
      assert.strictEqual(frames[7].columnNumber, 28);

      // Frame 8: Array.map
      assert.strictEqual(frames[8].functionName, 'Array.map');
      assert.isTrue(StackTraceImpl.Trie.isBuiltinFrame(frames[8]));

      // Frame 9: get triggerGetter
      assert.strictEqual(frames[9].functionName, 'get triggerGetter');
      assert.strictEqual(frames[9].lineNumber, 8);
      assert.strictEqual(frames[9].columnNumber, 34);
    });
  });

  describe('parseMessage', () => {
    it('extracts the message when stack frames are present', () => {
      const stack = `Error: foo
          at functionName (http://www.example.org/script.js:10:5)`;
      const message = StackTraceImpl.DetailedErrorStackParser.parseMessage(stack);
      assert.strictEqual(message, 'Error: foo');
    });

    it('returns the full string if no stack frames are present', () => {
      const stack = `Error: foo
          some other text`;
      const message = StackTraceImpl.DetailedErrorStackParser.parseMessage(stack);
      assert.strictEqual(message, stack);
    });

    it('extracts multi-line messages', () => {
      const stack = `Error: foo
more details
          at functionName (http://www.example.org/script.js:10:5)`;
      const message = StackTraceImpl.DetailedErrorStackParser.parseMessage(stack);
      assert.strictEqual(message, 'Error: foo\nmore details');
    });
  });

  describe('augmentRawFramesWithScriptIds', () => {
    it('augments raw frames with script IDs from Protocol.Runtime.StackTrace', () => {
      const frames: StackTraceImpl.Trie.RawFrame[] = [
        {
          url: 'http://www.example.org/script.js',
          functionName: 'foo',
          lineNumber: 9,
          columnNumber: 4,
        },
        {
          url: 'http://www.example.org/other.js',
          functionName: 'bar',
          lineNumber: 19,
          columnNumber: 0,
        },
      ];

      const protocolStackTrace: Protocol.Runtime.StackTrace = {
        callFrames: [
          {
            functionName: 'foo',
            scriptId: '123' as Protocol.Runtime.ScriptId,
            url: 'http://www.example.org/script.js',
            lineNumber: 9,
            columnNumber: 4,
          },
        ],
      };

      StackTraceImpl.DetailedErrorStackParser.augmentRawFramesWithScriptIds(frames, protocolStackTrace);

      assert.strictEqual(frames[0].scriptId, '123');
      assert.isUndefined(frames[1].scriptId);
    });

    it('recursively augments nested eval origin raw frames with script IDs', () => {
      const nestedEvalOrigin: StackTraceImpl.Trie.RawFrame = {
        url: urlString`http://www.example.org/base.js`,
        functionName: 'baseCaller',
        lineNumber: 9,
        columnNumber: 4,
      };

      const evalOrigin: StackTraceImpl.Trie.RawFrame = {
        url: urlString`http://www.example.org/inter.js`,
        functionName: 'intermediate',
        lineNumber: 19,
        columnNumber: 0,
        isWasm: false,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: true,
          evalOrigin: nestedEvalOrigin,
        },
      };

      const frames: StackTraceImpl.Trie.RawFrame[] = [
        {
          url: urlString`http://www.example.org/main.js`,
          functionName: 'eval',
          lineNumber: 0,
          columnNumber: 10,
          isWasm: false,
          parsedFrameInfo: {
            isAsync: false,
            isConstructor: false,
            isEval: true,
            evalOrigin,
          },
        },
      ];

      const protocolStackTrace: Protocol.Runtime.StackTrace = {
        callFrames: [
          {
            functionName: 'eval',
            scriptId: 'main-script-id' as Protocol.Runtime.ScriptId,
            url: 'http://www.example.org/main.js',
            lineNumber: 0,
            columnNumber: 10,
          },
          {
            functionName: 'intermediate',
            scriptId: 'inter-script-id' as Protocol.Runtime.ScriptId,
            url: 'http://www.example.org/inter.js',
            lineNumber: 19,
            columnNumber: 0,
          },
          {
            functionName: 'baseCaller',
            scriptId: 'base-script-id' as Protocol.Runtime.ScriptId,
            url: 'http://www.example.org/base.js',
            lineNumber: 9,
            columnNumber: 4,
          },
        ],
      };

      StackTraceImpl.DetailedErrorStackParser.augmentRawFramesWithScriptIds(frames, protocolStackTrace);

      assert.strictEqual(frames[0].scriptId, 'main-script-id');
      assert.strictEqual(frames[0].parsedFrameInfo?.evalOrigin?.scriptId, 'inter-script-id');
      assert.strictEqual(
          frames[0].parsedFrameInfo?.evalOrigin?.parsedFrameInfo?.evalOrigin?.scriptId, 'base-script-id');
    });
  });

});
