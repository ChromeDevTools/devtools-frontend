// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';

import * as SDK from './sdk.js';

describe('ScopeRemoteObject API Test', () => {
  it('modifies local variables of a paused call frame', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);

    await inspectedPage.goToHtml('<!DOCTYPE html><html><body></body></html>');
    const paused = debuggerModel.once(SDK.DebuggerModel.Events.DebuggerPaused);
    void inspectedPage.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = `
        function callee(x) {
          var y = 20;
          debugger;
        }

        function testFunction() {
          var localObject1 = {a: 310};
          var localObject2 = 42;
          callee(4000);
        }
        setTimeout(testFunction, 0);`;
      document.body.appendChild(script);
    });
    await paused;

    try {
      // The variables live in the caller of the function we are paused in.
      const callerFrame = debuggerModel.debuggerPausedDetails()?.callFrames[1];
      assert.exists(callerFrame);
      debuggerModel.setSelectedCallFrame(callerFrame);
      const evaluate = async(expression: string): Promise<unknown> => {
        const result = await debuggerModel.evaluateOnSelectedCallFrame({expression});
        assert.notProperty(result, 'error');
        assert.property(result, 'object');
        return 'object' in result ? result.object.value : undefined;
      };
      assert.strictEqual(await evaluate('localObject1.a'), 310);
      assert.strictEqual(await evaluate('localObject2'), 42);

      const localScopeObject = (await callerFrame.scopeChain())[0].object();
      assert.isUndefined(await localScopeObject.setPropertyValue('localObject1', '({a: -290})'));
      assert.isUndefined(await localScopeObject.setPropertyValue({value: 'localObject2'}, '123'));

      assert.strictEqual(await evaluate('localObject1.a'), -290);
      assert.strictEqual(await evaluate('localObject2'), 123);
    } finally {
      if (debuggerModel.isPaused()) {
        await debuggerModel.resume();
      }
    }
  });
});
