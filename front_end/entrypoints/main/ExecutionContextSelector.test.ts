// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {
  getMainFrame,
} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Main from './main.js';

describeWithEnvironment('ExecutionContextSelector', () => {
  it('switches to the default context once available', () => {
    new Main.ExecutionContextSelector.ExecutionContextSelector(
        SDK.TargetManager.TargetManager.instance(), UI.Context.Context.instance());

    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    const prerenderTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget, subtype: 'prerender'});
    const serviceWorkerTarget = createTarget({type: SDK.Target.Type.ServiceWorker});
    const workerTarget = createTarget({type: SDK.Target.Type.Worker});

    const contextSetFlavor = sinon.spy(UI.Context.Context.instance(), 'setFlavor');

    const sentExecutionContextCreated = (target: SDK.Target.Target, includeFrameId = true) => {
      const frameId = includeFrameId ? getMainFrame(target).id : undefined;

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      runtimeModel!.dispatchEventToListeners(
          SDK.RuntimeModel.Events.ExecutionContextCreated,
          {isDefault: true, frameId, target: () => target} as SDK.RuntimeModel.ExecutionContext);
    };

    sentExecutionContextCreated(subframeTarget);
    sinon.assert.called(contextSetFlavor);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(subframeTarget);
    sinon.assert.notCalled(contextSetFlavor);

    sentExecutionContextCreated(mainFrameTarget);
    sinon.assert.called(contextSetFlavor);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(prerenderTarget);
    sinon.assert.notCalled(contextSetFlavor);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(serviceWorkerTarget, /* includeFrameId */ false);
    sinon.assert.notCalled(contextSetFlavor);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(workerTarget, /* includeFrameId */ false);
    sinon.assert.notCalled(contextSetFlavor);
  });

  it('does not select a prerender target (e.g. warmup.html) when created before the primary frame target or during navigation',
     async () => {
       UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, null);
       UI.Context.Context.instance().setFlavor(SDK.Target.Target, null);

       new Main.ExecutionContextSelector.ExecutionContextSelector(SDK.TargetManager.TargetManager.instance(),
                                                                  UI.Context.Context.instance());

       const tabTarget = createTarget({type: SDK.Target.Type.TAB});
       const prerenderTarget =
           createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget, subtype: 'prerender'});
       await new Promise<void>(resolve => queueMicrotask(resolve));

       // Prerender target should not become the default Target flavor even when flavor is initially null.
       assert.isNull(UI.Context.Context.instance().flavor(SDK.Target.Target));

       const prerenderFrameId = getMainFrame(prerenderTarget).id;
       const prerenderRuntimeModel = prerenderTarget.model(SDK.RuntimeModel.RuntimeModel)!;
       const prerenderContext = {
         isDefault: true,
         frameId: prerenderFrameId,
         runtimeModel: prerenderRuntimeModel,
         target: () => prerenderTarget,
       } as SDK.RuntimeModel.ExecutionContext;
       sinon.stub(prerenderRuntimeModel, 'executionContexts').returns([prerenderContext]);
       prerenderRuntimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextCreated,
                                                      prerenderContext);

       // Prerender execution context should not be selected even when ExecutionContext flavor is null.
       assert.isNull(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext));
       assert.isNull(UI.Context.Context.instance().flavor(SDK.Target.Target));

       // Now the primary main frame target attaches and creates its execution context.
       const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
       await new Promise<void>(resolve => queueMicrotask(resolve));
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), mainFrameTarget);

       const mainFrameId = getMainFrame(mainFrameTarget).id;
       const mainRuntimeModel = mainFrameTarget.model(SDK.RuntimeModel.RuntimeModel)!;
       const mainContext = {
         isDefault: true,
         frameId: mainFrameId,
         runtimeModel: mainRuntimeModel,
         target: () => mainFrameTarget,
       } as SDK.RuntimeModel.ExecutionContext;
       sinon.stub(mainRuntimeModel, 'executionContexts').returns([mainContext]);
       mainRuntimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextCreated, mainContext);

       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), mainContext);
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), mainFrameTarget);

       // Manually switching to the prerender target (e.g. via OutermostTargetSelector or Preloading view)
       // must select the prerender target and its default execution context.
       UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), prerenderTarget);
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), prerenderContext);

       // Manually switching back to the primary main frame target restores mainFrameTarget and mainContext.
       UI.Context.Context.instance().setFlavor(SDK.Target.Target, mainFrameTarget);
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), mainFrameTarget);
       assert.strictEqual(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), mainContext);

       // When the primary frame target is disposed during navigation while prerenderTarget is still alive,
       // ExecutionContextSelector must not fall back to prerenderTarget.
       mainRuntimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextDestroyed, mainContext);
       mainFrameTarget.dispose('navigation');

       assert.isNull(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext));
       assert.notStrictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), prerenderTarget);
     });
});
