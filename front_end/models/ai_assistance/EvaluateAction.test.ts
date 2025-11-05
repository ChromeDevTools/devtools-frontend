// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import * as AiAssistance from './ai_assistance.js';

describe('FreestylerEvaluateAction', () => {
  describe('error handling', () => {
    function executeWithResult(
        mockResult: SDK.RuntimeModel.EvaluationResult, pausedOnBreakpoint = false): Promise<string> {
      const executionContextStub = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
      executionContextStub.debuggerModel = sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel);
      if (pausedOnBreakpoint) {
        executionContextStub.debuggerModel.selectedCallFrame = () => {
          return sinon.createStubInstance(SDK.DebuggerModel.CallFrame);
        };
      }
      executionContextStub.callFunctionOn.resolves(mockResult);
      executionContextStub.runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
      return AiAssistance.EvaluateAction.EvaluateAction.execute(
          '', [], executionContextStub, {throwOnSideEffect: false});
    }

    function mockRemoteObject(overrides: Partial<SDK.RemoteObject.RemoteObject> = {}): SDK.RemoteObject.RemoteObject {
      return sinon.createStubInstance(SDK.RemoteObject.RemoteObject, {
        ...(overrides.className ? {className: overrides.className} : null),
        ...(overrides.subtype ? {subtype: overrides.subtype} : null),
        ...(overrides.type ? {type: overrides.type} : null),
        ...(overrides.value ? {value: overrides.value} : null),
        ...(overrides.preview ? {preview: overrides.preview} : null),
      });
    }

    function mockExceptionDetails({description}: {description: string}): Protocol.Runtime.ExceptionDetails {
      return {
        exceptionId: 3,
        text: 'SyntaxError',
        lineNumber: 3,
        columnNumber: 3,
        exception: {type: Protocol.Runtime.RemoteObjectType.String, description},
      };
    }

    it('should serialize a CDP error as a string', async () => {
      assert.strictEqual(await executeWithResult({error: 'errorMessage'}), 'Error: errorMessage');
    });

    it('should throw an ExecutionError when the debugger is paused', async () => {
      assert.strictEqual(
          await executeWithResult({error: 'errorMessage'}, true),
          'Error: Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
    });

    it('should throw an ExecutionError with the description of the exception if response included exception details',
       async () => {
         assert.strictEqual(
             await executeWithResult({
               object: mockRemoteObject(),
               exceptionDetails: mockExceptionDetails({description: 'Error description'}),
             }),
             'Error: Error description');
       });

    it('should throw a SideEffectError when the resulted exception starts with possible side effect error',
       async () => {
         try {
           await executeWithResult({
             object: mockRemoteObject(),
             exceptionDetails: mockExceptionDetails({description: 'EvalError: Possible side-effect in debug-evaluate'}),
           });
           assert.fail('not reachable');
         } catch (err) {
           assert.instanceOf(err, AiAssistance.EvaluateAction.SideEffectError);
           assert.strictEqual(err.message, 'EvalError: Possible side-effect in debug-evaluate');
         }
       });
  });

  describe('serialization', () => {
    const exampleCode = `function myTestFunction() {
          const object = undefined;
          console.log(object.bar);
        }`;

    describe('getExecutedLineFromStack', () => {
      const PAGE_EXPOSED_FUNCTIONS = ['setElementStyles', 'myCustomBinding'];

      it('extracts the line number from the function call not in the page exposed functions', () => {
        const stack = `Error: Test
      at nonBindingFunc (http://localhost/file.js:12:34)
      at Object.anotherFunc (http://localhost/file2.js:56:78)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 11);
      });

      it('handles function names within object methods', () => {
        const stack = `Error: Test
      at async MyClass.myMethod (http://localhost/my_class.js:45:12)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 44);
      });

      it('handles line and column numbers with parentheses', () => {
        const stack = `Error: Test
      at foo (C:/path/to/file.ts:15:20)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 14);
      });

      it('handles line numbers without column numbers', () => {
        const stack = `Error: Test
      at bar (/path/to/another.js:22)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 21);
      });

      it('skips over the page exposed functions to find the first that is not in the page exposed functions', () => {
        const stack = `Error: Test
      at async setElementStyles (tslib_es6.js:113:24)
      at async myCustomBinding (runtime.js:312:22)
      at async MyApp.run (http://localhost/app.js:101:5)
      at async main (http://localhost/main.js:10:1)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 100);
      });

      it('returns null if all relevant lines are in the list of page exposed functions', () => {
        const stack = `Error: Test
      at async setElementStyles (tslib_es6.js:113:24)
      at async myCustomBinding (runtime.js:312:22)`;
        assert.isNull(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS));
      });

      it('returns null for an empty stack trace', () => {
        assert.isNull(AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack('', PAGE_EXPOSED_FUNCTIONS));
      });

      it('returns null if no lines start with "at "', () => {
        const stack = `Error: Test
      Some other information
      Another line`;
        assert.isNull(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS));
      });

      it('returns null if no line number is found in the selected frame', () => {
        const stack = `Error: Test
      at nonBindingFunc (http://localhost/file.js)`;
        assert.isNull(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS));
      });

      it('handles stack lines with <anonymous>', () => {
        const stack = `Error: Test
      at <anonymous> (http://localhost/file.js:20:10)`;
        assert.strictEqual(
            AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, PAGE_EXPOSED_FUNCTIONS), 19);
      });

      it('works when page exposed functions array is empty', () => {
        const stack = `Error: Test
      at async setElementStyles (tslib_es6.js:113:24)
      at async MyApp.run (http://localhost/app.js:101:5)`;
        assert.strictEqual(AiAssistance.EvaluateAction.EvaluateAction.getExecutedLineFromStack(stack, []), 112);
      });
    });

    describe('stringifyError', () => {
      it('should serialize error with just message when stack is missing', () => {
        const exampleError: AiAssistance.EvaluateAction.GetErrorStackOutput = {
          message: 'Error Message',
        };
        const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

        assert.strictEqual(result, `Error: Error Message`);
      });

      it('should serialize error containing the stack when stack exists', () => {
        const exampleError: AiAssistance.EvaluateAction.GetErrorStackOutput = {
          message: 'Cannot read properties of undefined (reading \'bar\')',
          stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)'
        };
        const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

        assert.strictEqual(
            result, `Error: executing the line \"console.log(object.bar);\" failed with the following error:
Cannot read properties of undefined (reading 'bar')`);
      });

      it('should serialize only the message if no line number is returned', () => {
        const getExecutedLineFromStackStub =
            sinon.stub(AiAssistance.EvaluateAction.EvaluateAction, 'getExecutedLineFromStack');
        getExecutedLineFromStackStub.returns(null);
        const exampleError: AiAssistance.EvaluateAction.GetErrorStackOutput = {
          message: 'Error Message',
          stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)'
        };

        const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

        assert.strictEqual(result, `Error: Error Message`);
      });

      it('should serialize only the message if the line number provided is out of the scope of the executed function',
         () => {
           const getExecutedLineFromStackStub =
               sinon.stub(AiAssistance.EvaluateAction.EvaluateAction, 'getExecutedLineFromStack');
           getExecutedLineFromStackStub.returns(30);
           const exampleError: AiAssistance.EvaluateAction.GetErrorStackOutput = {
             message: 'Error Message',
             stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)'
           };

           const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

           assert.strictEqual(result, `Error: Error Message`);
         });
    });

    describe('stringifyRemoteObject', () => {
      it('should serialize object when subtype is error', async () => {
        const error = new Error('Some error message');
        error.stack = 'some stack';
        const stringifyErrorStub = sinon.spy(AiAssistance.EvaluateAction.EvaluateAction, 'stringifyError');
        const object = new SDK.RemoteObject.LocalJSONObject(error);

        await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);

        sinon.assert.calledOnce(stringifyErrorStub);
      });

      it('should serialize primitive values correctly', async () => {
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject('string'), exampleCode),
            '\'string\'');
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject(999n), exampleCode),
            '999n');
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject(true), exampleCode),
            'true');
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject(undefined), exampleCode),
            'undefined');
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject(42), exampleCode),
            '42');
        assert.strictEqual(
            await AiAssistance.EvaluateAction.stringifyRemoteObject(
                new SDK.RemoteObject.LocalJSONObject(Symbol('sym')), exampleCode),
            'Symbol(sym)');
      });
    });

    it('runs stringification on the page for objects', async () => {
      const object = new SDK.RemoteObject.LocalJSONObject({});
      const callFunctionStub = sinon.stub(object, 'callFunction');
      callFunctionStub.resolves({object: new SDK.RemoteObject.LocalJSONObject('result')});
      const result = await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);
      assert.strictEqual(result, 'result');
      sinon.assert.calledOnceWithExactly(callFunctionStub, AiAssistance.EvaluateAction.stringifyObjectOnThePage);
    });

    describe('HTMLElement', () => {
      it('should work with plain nodes', async () => {
        const el = document.createElement('div');
        assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div></div>"');
      });

      it('should serialize node with classes', async () => {
        const el = document.createElement('div');
        el.classList.add('section');
        el.classList.add('section-main');
        assert.strictEqual(
            AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(el),
            '"<div class=\\"section section-main\\"></div>"');
      });

      it('should serialize node with id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        assert.strictEqual(
            AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div id=\\"promotion-section\\"></div>"');
      });
      it('should serialize node with class and id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        el.classList.add('section');
        assert.strictEqual(
            AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(el),
            '"<div id=\\"promotion-section\\" class=\\"section\\"></div>"');
      });
      it('should serialize node with children', async () => {
        const el = document.createElement('div');
        const p = document.createElement('p');
        el.appendChild(p);
        assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div>...</div>"');
      });
    });

    it('should serialize arrays correctly', async () => {
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply([]), '[]');
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply([1]), '[1]');
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply([1, 2]), '[1,2]');
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply([{key: 1}]), '[{"key":1}]');
    });

    it('should serialize objects correctly', async () => {
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply({key: 'str'}), '{"key":"str"}');
      assert.strictEqual(
          AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply({key: 'str', secondKey: 'str2'}),
          '{"key":"str","secondKey":"str2"}');
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply({key: 1}), '{"key":1}');
    });

    it('should not continue serializing cycles', async () => {
      const obj: {a: number, itself?: object} = {a: 1};
      obj.itself = obj;
      assert.strictEqual(AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(obj), '{"a":1,"itself":"(cycle)"}');
    });

    it('should not include number keys for CSSStyleDeclaration', async () => {
      const result = AiAssistance.EvaluateAction.stringifyObjectOnThePage.apply(getComputedStyle(document.body));
      const parsedResult = JSON.parse(result);
      assert.isUndefined(parsedResult[0]);
    });
  });
});
