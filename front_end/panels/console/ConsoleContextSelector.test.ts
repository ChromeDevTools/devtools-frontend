// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';

describeWithMockConnection('ConsoleContextSelector', () => {
  let target: SDK.Target.Target;
  let subtarget: SDK.Target.Target;
  let targetContext: SDK.RuntimeModel.ExecutionContext;
  let subtargetContext: SDK.RuntimeModel.ExecutionContext;
  let selector: Console.ConsoleContextSelector.ConsoleContextSelector;

  beforeEach(() => {
    selector = new Console.ConsoleContextSelector.ConsoleContextSelector();
    target = createTarget();
    subtarget = createTarget({parentTarget: target});
    targetContext = createExecutionContext(target);
    subtargetContext = createExecutionContext(subtarget);
  });

  let id = 0;

  function createExecutionContext(target: SDK.Target.Target): SDK.RuntimeModel.ExecutionContext {
    ++id;
    dispatchEvent(target, 'Runtime.executionContextCreated', {
      context: {
        id,
        origin: 'http://example.com',
        name: `c${id}`,
        uniqueId: `c${id}`,
        auxData: {
          frameId: 'f2',
        },
      },
    });
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const executionContext = runtimeModel.executionContext(id);
    assert.exists(executionContext);
    return executionContext;
  }

  const tests = (inScope: boolean) => () => {
    beforeEach(() => {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    });

    it('creates drop-down with console context', () => {
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext] : []);

      const subtarget2 = createTarget({parentTarget: target});
      const subtarget2Context = createExecutionContext(subtarget2);
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext, subtarget2Context] : []);

      const subtarget2Context2 = createExecutionContext(subtarget2);
      assert.deepEqual(
          [...selector.items], inScope ? [targetContext, subtargetContext, subtarget2Context, subtarget2Context2] : []);

      subtarget2.dispose('');
      assert.deepEqual([...selector.items], inScope ? [targetContext, subtargetContext] : []);
    });

    it('updates selected target when UI context flavor changes', () => {
      assert.strictEqual(selector.toolbarItem().element.title, 'JavaScript context: Not selected');
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, targetContext);
      assert.strictEqual(
          selector.toolbarItem().element.title,
          `JavaScript context: ${inScope ? 'c' + targetContext.id : 'Not selected'}`);
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, subtargetContext);
      assert.strictEqual(
          selector.toolbarItem().element.title,
          `JavaScript context: ${inScope ? 'c' + subtargetContext.id : 'Not selected'}`);
    });
  };

  describe('in scope', tests(true));
  describe('out of scope', tests(false));

  it('updates UI context flavor on selection', () => {
    selector.itemSelected(targetContext);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), targetContext);
    selector.itemSelected(subtargetContext);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), subtargetContext);
  });
});
