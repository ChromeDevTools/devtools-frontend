// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {
  getMainFrame,
} from '../../testing/ResourceTreeHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Main from './main.js';

describeWithMockConnection('ExecutionContextSelector', () => {
  it('switches to the default context once available', () => {
    new Main.ExecutionContextSelector.ExecutionContextSelector(
        SDK.TargetManager.TargetManager.instance(), UI.Context.Context.instance());

    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const mainFrameTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    const subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTarget});
    const prerenderTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget, subtype: 'prerender'});

    const contextSetFlavor = sinon.spy(UI.Context.Context.instance(), 'setFlavor');

    const sentExecutionContextCreated = (target: SDK.Target.Target) => {
      const frame = getMainFrame(target);

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      runtimeModel!.dispatchEventToListeners(
          SDK.RuntimeModel.Events.ExecutionContextCreated,
          {isDefault: true, frameId: frame.id, target: () => target} as SDK.RuntimeModel.ExecutionContext);
    };

    sentExecutionContextCreated(subframeTarget);
    assert.isTrue(contextSetFlavor.called);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(subframeTarget);
    assert.isTrue(contextSetFlavor.notCalled);

    sentExecutionContextCreated(mainFrameTarget);
    assert.isTrue(contextSetFlavor.called);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(prerenderTarget);
    assert.isFalse(contextSetFlavor.called);
  });
});
