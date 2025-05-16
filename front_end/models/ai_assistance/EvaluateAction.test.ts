// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import * as EvaluateAction from './EvaluateAction.js';

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
      return EvaluateAction.EvaluateAction.execute('', [], executionContextStub, {throwOnSideEffect: false});
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

    beforeEach(() => {
      sinon.restore();
    });

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
           assert.instanceOf(err, EvaluateAction.SideEffectError);
           assert.strictEqual(err.message, 'EvalError: Possible side-effect in debug-evaluate');
         }
       });
  });

  describe('serialization', () => {
    it('should serialize primitive values correctly', async () => {
      assert.strictEqual(
          await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject('string')), '\'string\'');
      assert.strictEqual(
          await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject(999n)), '999n');
      assert.strictEqual(
          await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject(true)), 'true');
      assert.strictEqual(
          await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject(undefined)), 'undefined');
      assert.strictEqual(await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject(42)), '42');
      assert.strictEqual(
          await EvaluateAction.stringifyRemoteObject(new SDK.RemoteObject.LocalJSONObject(Symbol('sym'))),
          'Symbol(sym)');
    });

    it('runs stringification on the page for objects', async () => {
      const object = new SDK.RemoteObject.LocalJSONObject({});
      const callFunctionStub = sinon.stub(object, 'callFunction');
      callFunctionStub.resolves({object: new SDK.RemoteObject.LocalJSONObject('result')});
      const result = await EvaluateAction.stringifyRemoteObject(object);
      assert.strictEqual(result, 'result');
      sinon.assert.calledOnceWithExactly(callFunctionStub, EvaluateAction.stringifyObjectOnThePage);
    });

    describe('HTMLElement', () => {
      it('should work with plain nodes', async () => {
        const el = document.createElement('div');
        assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div></div>"');
      });

      it('should serialize node with classes', async () => {
        const el = document.createElement('div');
        el.classList.add('section');
        el.classList.add('section-main');
        assert.strictEqual(
            EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div class=\\"section section-main\\"></div>"');
      });

      it('should serialize node with id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        assert.strictEqual(
            EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div id=\\"promotion-section\\"></div>"');
      });
      it('should serialize node with class and id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        el.classList.add('section');
        assert.strictEqual(
            EvaluateAction.stringifyObjectOnThePage.apply(el),
            '"<div id=\\"promotion-section\\" class=\\"section\\"></div>"');
      });
      it('should serialize node with children', async () => {
        const el = document.createElement('div');
        const p = document.createElement('p');
        el.appendChild(p);
        assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply(el), '"<div>...</div>"');
      });
    });

    it('should serialize arrays correctly', async () => {
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply([]), '[]');
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply([1]), '[1]');
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply([1, 2]), '[1,2]');
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply([{key: 1}]), '[{"key":1}]');
    });

    it('should serialize objects correctly', async () => {
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply({key: 'str'}), '{"key":"str"}');
      assert.strictEqual(
          EvaluateAction.stringifyObjectOnThePage.apply({key: 'str', secondKey: 'str2'}),
          '{"key":"str","secondKey":"str2"}');
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply({key: 1}), '{"key":1}');
    });

    it('should not continue serializing cycles', async () => {
      const obj: {a: number, itself?: object} = {a: 1};
      obj.itself = obj;
      assert.strictEqual(EvaluateAction.stringifyObjectOnThePage.apply(obj), '{"a":1,"itself":"(cycle)"}');
    });

    it('should not include number keys for CSSStyleDeclaration', async () => {
      const result = EvaluateAction.stringifyObjectOnThePage.apply(getComputedStyle(document.body));
      const parsedResult = JSON.parse(result);
      assert.isUndefined(parsedResult[0]);
    });
  });
});
