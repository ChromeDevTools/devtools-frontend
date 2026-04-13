// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

// eslint-disable-next-line @devtools/es-modules-import
import * as StackTraceImpl from './stack_trace_impl.js';

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

      assert.lengthOf(frames, 5);
      assert.deepEqual(frames[0], {
        url: 'http://www.example.org/script.js',
        functionName: 'functionName',
        lineNumber: 9,
        columnNumber: 4,
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          isWasm: false,
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
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          isWasm: false,
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
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: true,
          isEval: false,
          isWasm: false,
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
        parsedFrameInfo: {
          isAsync: true,
          isConstructor: false,
          isEval: false,
          isWasm: false,
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
        parsedFrameInfo: {
          isAsync: false,
          isConstructor: false,
          isEval: false,
          isWasm: false,
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

      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].parsedFrameInfo?.typeName, 'Type');
      assert.strictEqual(frames[0].parsedFrameInfo?.methodName, 'alias');
    });

    it('parses wasm frames', () => {
      const stack = `Error: foo
          at wasmModule.wasmFunc (http://www.example.org/script.js:wasm-function[123]:0xabc)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.lengthOf(frames, 1);
      assert.isTrue(frames[0].parsedFrameInfo?.isWasm);
      assert.strictEqual(frames[0].url, 'http://www.example.org/script.js');
      assert.strictEqual(frames[0].parsedFrameInfo?.wasmModuleName, 'wasmModule');
      assert.strictEqual(frames[0].parsedFrameInfo?.wasmFunctionIndex, 123);
      assert.strictEqual(frames[0].columnNumber, 0xabc);
    });

    it('parses promise.all index', () => {
      const stack = `Error: foo
          at Promise.all (index 2)`;
      const frames = StackTraceImpl.DetailedErrorStackParser.parseRawFramesFromErrorStack(stack);

      assert.lengthOf(frames, 1);
      assert.strictEqual(frames[0].parsedFrameInfo?.promiseIndex, 2);
      assert.strictEqual(frames[0].url, '');
      assert.strictEqual(frames[0].functionName, 'Promise.all');
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
  });
});
