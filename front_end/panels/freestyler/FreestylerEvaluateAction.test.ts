// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {describeWithRealConnection, getExecutionContext} from '../../testing/RealConnection.js';

import * as Freestyler from './FreestylerEvaluateAction.js';

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
      executionContextStub.evaluate.resolves(mockResult);
      executionContextStub.runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
      return Freestyler.FreestylerEvaluateAction.execute('', executionContextStub, {throwOnSideEffect: false});
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

    it('should throw an ExecutionError when the page returned with an error message', async () => {
      try {
        await executeWithResult({error: 'errorMessage'});
        assert.fail('not reachable');
      } catch (err) {
        assert.instanceOf(err, Freestyler.ExecutionError);
        assert.strictEqual(err.message, 'errorMessage');
      }
    });

    it('should throw an ExecutionError when the debugger is paused', async () => {
      try {
        await executeWithResult({error: 'errorMessage'}, true);
        assert.fail('not reachable');
      } catch (err) {
        assert.instanceOf(err, Freestyler.ExecutionError);
        assert.strictEqual(err.message, 'Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
      }
    });

    it('should throw an ExecutionError with the description of the exception if response included exception details',
       async () => {
         try {
           await executeWithResult({
             object: mockRemoteObject(),
             exceptionDetails: mockExceptionDetails({description: 'Error description'}),
           });
           assert.fail('not reachable');
         } catch (err) {
           assert.instanceOf(err, Freestyler.ExecutionError);
           assert.strictEqual(err.message, 'Error description');
         }
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
           assert.instanceOf(err, Freestyler.SideEffectError);
           assert.strictEqual(err.message, 'EvalError: Possible side-effect in debug-evaluate');
         }
       });
  });

  describeWithRealConnection('serialization', () => {
    async function executionContextForTest() {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const target = targetManager.rootTarget();
      const runtimeModel = target!.model(SDK.RuntimeModel.RuntimeModel);
      return getExecutionContext(runtimeModel!);
    }

    async function executeForTest(code: string) {
      const actionExpression = `const scope = {$0, $1, getEventListeners}; with (scope) {${code}}`;
      return Freestyler.FreestylerEvaluateAction.execute(
          actionExpression, await executionContextForTest(), {throwOnSideEffect: false});
    }

    it('should serialize primitive values correctly', async () => {
      assert.strictEqual(await executeForTest('"string"'), '\'string\'');
      assert.strictEqual(await executeForTest('999n'), '999n');
      assert.strictEqual(await executeForTest('true'), 'true');
      assert.strictEqual(await executeForTest('undefined'), 'undefined');
      assert.strictEqual(await executeForTest('42'), '42');
      assert.strictEqual(await executeForTest('Symbol("sym")'), 'Symbol(sym)');
    });

    describe('HTMLElement', () => {
      it('should work with plain nodes', async () => {
        const serializedElement = await executeForTest(`{
          const el = document.createElement('div');

          el;
        }`);
        assert.strictEqual(serializedElement, '"<div></div>"');
      });

      it('should serialize node with classes', async () => {
        const serializedElement = await executeForTest(`{
          const el = document.createElement('div');
          el.classList.add('section');
          el.classList.add('section-main');

          el;
        }`);
        assert.strictEqual(serializedElement, '"<div class=\\"section section-main\\"></div>"');
      });

      it('should serialize node with id', async () => {
        const serializedElement = await executeForTest(`{
          const el = document.createElement('div');
          el.id = 'promotion-section';

          el;
        }`);
        assert.strictEqual(serializedElement, '"<div id=\\"promotion-section\\"></div>"');
      });
      it('should serialize node with class and id', async () => {
        const serializedElement = await executeForTest(`{
          const el = document.createElement('div');
          el.id = 'promotion-section';
          el.classList.add('section');

          el;
        }`);
        assert.strictEqual(serializedElement, '"<div id=\\"promotion-section\\" class=\\"section\\"></div>"');
      });
      it('should serialize node with children', async () => {
        const serializedElement = await executeForTest(`{
          const el = document.createElement('div');
          const p = document.createElement('p');
          el.appendChild(p);

          el;
        }`);
        assert.strictEqual(serializedElement, '"<div>...</div>"');
      });
    });

    it('should serialize arrays correctly', async () => {
      assert.strictEqual(await executeForTest('[]'), '[]');
      assert.strictEqual(await executeForTest('[1]'), '[1]');
      assert.strictEqual(await executeForTest('[1, 2]'), '[1,2]');
      assert.strictEqual(await executeForTest('[{key: 1}]'), '[{"key":1}]');
    });

    it('should serialize objects correctly', async () => {
      assert.strictEqual(await executeForTest('const object = {key: "str"}; object;'), '{"key":"str"}');
      assert.strictEqual(
          await executeForTest('const object = {key: "str", secondKey: "str2"}; object;'),
          '{"key":"str","secondKey":"str2"}');
      assert.strictEqual(await executeForTest('const object = {key: 1}; object;'), '{"key":1}');
    });

    it('should not continue serializing cycles', async () => {
      assert.strictEqual(
          await executeForTest(`{
        const obj = { a: 1 };
        obj.itself = obj;
        obj;
      }`),
          '{"a":1,"itself":"(cycle)"}');
    });

    it('should not include number keys for CSSStyleDeclaration', async () => {
      const result = await executeForTest('getComputedStyle(document.body)');
      const parsedResult = JSON.parse(result);
      assert.isUndefined(parsedResult[0]);
    });
  });
});
