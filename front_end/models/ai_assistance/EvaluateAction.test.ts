// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

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
        const exampleError: AiAssistance.DOMHelpers.GetErrorStackOutput = {
          message: 'Error Message',
        };
        const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

        assert.strictEqual(result, `Error: Error Message`);
      });

      it('should serialize error containing the stack when stack exists', () => {
        const exampleError: AiAssistance.DOMHelpers.GetErrorStackOutput = {
          message: 'Cannot read properties of undefined (reading \'bar\')',
          stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)',
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
        const exampleError: AiAssistance.DOMHelpers.GetErrorStackOutput = {
          message: 'Error Message',
          stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)',
        };

        const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

        assert.strictEqual(result, `Error: Error Message`);
      });

      it('should serialize only the message if the line number provided is out of the scope of the executed function',
         () => {
           const getExecutedLineFromStackStub =
               sinon.stub(AiAssistance.EvaluateAction.EvaluateAction, 'getExecutedLineFromStack');
           getExecutedLineFromStackStub.returns(30);
           const exampleError: AiAssistance.DOMHelpers.GetErrorStackOutput = {
             message: 'Error Message',
             stack: 'Cannot read properties of undefined (reading \'bar\')\n    at myTestFunction (myScript.js:3:10)',
           };

           const result = AiAssistance.EvaluateAction.EvaluateAction.stringifyError(exampleError, exampleCode);

           assert.strictEqual(result, `Error: Error Message`);
         });
    });

    describe('stringifyRemoteObject', () => {
      function createStubbedObjectSetup() {
        const universe = new TestUniverse();
        const target = universe.createTarget();
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        assert.exists(runtimeModel);
        const object = new SDK.RemoteObject.RemoteObjectImpl(
            runtimeModel,
            'target-object' as Protocol.Runtime.RemoteObjectId,
            Protocol.Runtime.RemoteObjectType.Object,
            undefined,
            undefined,
            undefined,
            'Object',
        );
        const runtimeAgent = target.runtimeAgent();
        const callFunctionOnStub = sinon.stub(runtimeAgent, 'invoke_callFunctionOn');
        const getPropertiesStub = sinon.stub(runtimeAgent, 'invoke_getProperties');
        const releaseObjectStub = sinon.stub(runtimeAgent, 'invoke_releaseObject').resolves({
          getError: () => undefined,
        });
        const describeNodeStub = sinon.stub(target.domAgent(), 'invoke_describeNode');

        function stubElementArrayResponse(elementIds: string[], includeProto = true): void {
          callFunctionOnStub.onFirstCall().resolves({
            result: {
              objectId: 'result-array' as Protocol.Runtime.RemoteObjectId,
              type: Protocol.Runtime.RemoteObjectType.Object,
              subtype: Protocol.Runtime.RemoteObjectSubtype.Array,
              description: `Array(${elementIds.length})`,
            },
            getError: () => undefined,
          });
          const properties: Protocol.Runtime.PropertyDescriptor[] = [
            ...elementIds.map((elementId, index) => ({
                                name: String(index),
                                configurable: true,
                                enumerable: true,
                                value: {
                                  objectId: elementId as Protocol.Runtime.RemoteObjectId,
                                  type: Protocol.Runtime.RemoteObjectType.Object,
                                  subtype: Protocol.Runtime.RemoteObjectSubtype.Node,
                                },
                              })),
            {
              name: 'length',
              configurable: false,
              enumerable: false,
              value: {
                type: Protocol.Runtime.RemoteObjectType.Number,
                value: elementIds.length,
              },
            },
          ];
          getPropertiesStub.resolves({
            result: properties,
            internalProperties: includeProto ? [{
              name: '[[Prototype]]',
              value: {
                objectId: 'proto-1' as Protocol.Runtime.RemoteObjectId,
                type: Protocol.Runtime.RemoteObjectType.Object,
                description: 'Array(0)',
              },
            }] :
                                               undefined,
            getError: () => undefined,
          });
        }

        return {
          object,
          callFunctionOnStub,
          getPropertiesStub,
          releaseObjectStub,
          describeNodeStub,
          stubElementArrayResponse,
        };
      }

      function describeNodeSuccess(backendNodeId: number): Protocol.DOM.DescribeNodeResponse&
          Protocol.ProtocolResponseWithError {
        return {
          node: {
            nodeId: 0 as Protocol.DOM.NodeId,
            backendNodeId: backendNodeId as Protocol.DOM.BackendNodeId,
            nodeType: 1,
            nodeName: 'DIV',
            localName: 'div',
            nodeValue: '',
          },
          getError: () => undefined,
        };
      }

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

      it('skips DOM.describeNode when collectElementsOnThePage returns an empty array', async () => {
        const {
          object,
          callFunctionOnStub,
          getPropertiesStub,
          releaseObjectStub,
          describeNodeStub,
          stubElementArrayResponse,
        } = createStubbedObjectSetup();
        stubElementArrayResponse([], false);
        callFunctionOnStub.onSecondCall().resolves({
          result: {
            type: Protocol.Runtime.RemoteObjectType.String,
            value: 'result',
          },
          getError: () => undefined,
        });

        const result = await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);

        assert.strictEqual(result, 'result');
        assert.strictEqual(AiAssistance.EvaluateAction.MAX_SERIALIZED_ELEMENT_UIDS, 50);
        sinon.assert.calledTwice(callFunctionOnStub);
        assert.strictEqual(
            callFunctionOnStub.firstCall.args[0].functionDeclaration,
            AiAssistance.DOMHelpers.collectElementsOnThePage.toString(),
        );
        assert.deepEqual(callFunctionOnStub.firstCall.args[0].arguments, [{value: 50}]);
        assert.isTrue(callFunctionOnStub.firstCall.args[0].throwOnSideEffect);
        assert.strictEqual(
            callFunctionOnStub.secondCall.args[0].functionDeclaration,
            AiAssistance.DOMHelpers.stringifyObjectOnThePage.toString(),
        );
        assert.isUndefined(callFunctionOnStub.secondCall.args[0].arguments);
        assert.isTrue(callFunctionOnStub.secondCall.args[0].throwOnSideEffect);
        sinon.assert.notCalled(getPropertiesStub);
        sinon.assert.notCalled(describeNodeStub);
        assert.sameMembers(
            releaseObjectStub.args.map(([arg]) => arg.objectId),
            ['result-array' as Protocol.Runtime.RemoteObjectId],
        );
      });

      it('resolves element backendNodeIds across collection and serialization and releases all handles', async () => {
        const {object, callFunctionOnStub, releaseObjectStub, describeNodeStub, stubElementArrayResponse} =
            createStubbedObjectSetup();
        stubElementArrayResponse(['el-1', 'el-2']);
        describeNodeStub.withArgs({objectId: 'el-1' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves(describeNodeSuccess(15));
        describeNodeStub.withArgs({objectId: 'el-2' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves(describeNodeSuccess(42));
        const finalJson = JSON.stringify({
          first: '(uid=15) <div id="hero">...</div>',
          second: '(uid=42) <svg></svg>',
        });
        callFunctionOnStub.onSecondCall().resolves({
          result: {
            type: Protocol.Runtime.RemoteObjectType.String,
            value: finalJson,
          },
          getError: () => undefined,
        });

        const result = await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);

        assert.deepEqual(JSON.parse(result), {
          first: '(uid=15) <div id="hero">...</div>',
          second: '(uid=42) <svg></svg>',
        });
        sinon.assert.calledTwice(callFunctionOnStub);
        assert.strictEqual(
            callFunctionOnStub.firstCall.args[0].functionDeclaration,
            AiAssistance.DOMHelpers.collectElementsOnThePage.toString(),
        );
        assert.deepEqual(callFunctionOnStub.firstCall.args[0].arguments, [{value: 50}]);
        assert.isTrue(callFunctionOnStub.firstCall.args[0].throwOnSideEffect);
        assert.strictEqual(
            callFunctionOnStub.secondCall.args[0].functionDeclaration,
            AiAssistance.DOMHelpers.stringifyObjectOnThePage.toString(),
        );
        assert.deepEqual(callFunctionOnStub.secondCall.args[0].arguments, [{value: [15, 42]}]);
        assert.isTrue(callFunctionOnStub.secondCall.args[0].throwOnSideEffect);
        sinon.assert.calledTwice(describeNodeStub);
        sinon.assert.calledWithExactly(describeNodeStub.firstCall,
                                       {objectId: 'el-1' as Protocol.Runtime.RemoteObjectId, depth: 0});
        sinon.assert.calledWithExactly(describeNodeStub.secondCall,
                                       {objectId: 'el-2' as Protocol.Runtime.RemoteObjectId, depth: 0});
        assert.sameMembers(
            releaseObjectStub.args.map(([arg]) => arg.objectId),
            [
              'el-1' as Protocol.Runtime.RemoteObjectId,
              'el-2' as Protocol.Runtime.RemoteObjectId,
              'proto-1' as Protocol.Runtime.RemoteObjectId,
              'result-array' as Protocol.Runtime.RemoteObjectId,
            ],
        );
      });

      it('passes null in resolvedUids when DOM.describeNode fails or returns zero backendNodeId', async () => {
        const {object, callFunctionOnStub, releaseObjectStub, describeNodeStub, stubElementArrayResponse} =
            createStubbedObjectSetup();
        stubElementArrayResponse(['el-1', 'el-2', 'el-3'], false);
        describeNodeStub.withArgs({objectId: 'el-1' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves(describeNodeSuccess(15));
        describeNodeStub.withArgs({objectId: 'el-2' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves({...describeNodeSuccess(999), getError: () => 'Node not found'});
        describeNodeStub.withArgs({objectId: 'el-3' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves(describeNodeSuccess(0));
        const finalJson = JSON.stringify(['(uid=15) <div></div>', '<span class="x"></span>', '<p></p>']);
        callFunctionOnStub.onSecondCall().resolves({
          result: {
            type: Protocol.Runtime.RemoteObjectType.String,
            value: finalJson,
          },
          getError: () => undefined,
        });

        const result = await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);

        assert.deepEqual(JSON.parse(result), [
          '(uid=15) <div></div>',
          '<span class="x"></span>',
          '<p></p>',
        ]);
        assert.deepEqual(
            callFunctionOnStub.secondCall.args[0].arguments,
            [{value: [15, null, null]}],
        );
        assert.sameMembers(
            releaseObjectStub.args.map(([arg]) => arg.objectId),
            [
              'el-1' as Protocol.Runtime.RemoteObjectId,
              'el-2' as Protocol.Runtime.RemoteObjectId,
              'el-3' as Protocol.Runtime.RemoteObjectId,
              'result-array' as Protocol.Runtime.RemoteObjectId,
            ],
        );
      });

      it('throws and releases result object when collectElementsOnThePage reports an exception', async () => {
        const {object, callFunctionOnStub, releaseObjectStub} = createStubbedObjectSetup();
        callFunctionOnStub.onFirstCall().resolves({
          result: {
            objectId: 'err-1' as Protocol.Runtime.RemoteObjectId,
            type: Protocol.Runtime.RemoteObjectType.Object,
            subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
            description: 'SideEffectError: Possible side-effect',
          },
          exceptionDetails: {
            exceptionId: 1,
            text: 'Uncaught',
            lineNumber: 0,
            columnNumber: 0,
          },
          getError: () => undefined,
        });

        let caughtError: unknown;
        try {
          await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);
        } catch (err) {
          caughtError = err;
        }
        if (!(caughtError instanceof Error)) {
          assert.fail('Expected Error to be thrown');
        }
        assert.strictEqual(caughtError.message,
                           'Could not stringify the object: SideEffectError: Possible side-effect');
        assert.sameMembers(
            releaseObjectStub.args.map(([arg]) => arg.objectId),
            ['err-1' as Protocol.Runtime.RemoteObjectId],
        );
      });

      it('throws and releases both handles when stringifyObjectOnThePage reports an exception', async () => {
        const {object, callFunctionOnStub, releaseObjectStub, describeNodeStub, stubElementArrayResponse} =
            createStubbedObjectSetup();
        stubElementArrayResponse(['el-1']);
        describeNodeStub.withArgs({objectId: 'el-1' as Protocol.Runtime.RemoteObjectId, depth: 0})
            .resolves(describeNodeSuccess(15));
        callFunctionOnStub.onSecondCall().resolves({
          result: {
            objectId: 'err-2' as Protocol.Runtime.RemoteObjectId,
            type: Protocol.Runtime.RemoteObjectType.Object,
            subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
            description: 'SideEffectError: Possible side-effect in stringifyObjectOnThePage',
          },
          exceptionDetails: {
            exceptionId: 2,
            text: 'Uncaught',
            lineNumber: 0,
            columnNumber: 0,
          },
          getError: () => undefined,
        });

        let caughtError: unknown;
        try {
          await AiAssistance.EvaluateAction.stringifyRemoteObject(object, exampleCode);
        } catch (err) {
          caughtError = err;
        }
        if (!(caughtError instanceof Error)) {
          assert.fail('Expected Error to be thrown');
        }
        assert.strictEqual(
            caughtError.message,
            'Could not stringify the object: SideEffectError: Possible side-effect in stringifyObjectOnThePage',
        );
        assert.sameMembers(
            releaseObjectStub.args.map(([arg]) => arg.objectId),
            [
              'el-1' as Protocol.Runtime.RemoteObjectId,
              'proto-1' as Protocol.Runtime.RemoteObjectId,
              'result-array' as Protocol.Runtime.RemoteObjectId,
              'err-2' as Protocol.Runtime.RemoteObjectId,
            ],
        );
      });
    });
  });
});
