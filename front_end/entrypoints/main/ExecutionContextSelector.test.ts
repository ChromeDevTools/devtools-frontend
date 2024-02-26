// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../core/sdk/sdk.js';
import * as Main from './main.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../testing/MockConnection.js';

describeWithMockConnection('ExecutionContextSelector', () => {
  it('switches to the default context once available', () => {
    new Main.ExecutionContextSelector.ExecutionContextSelector(
        SDK.TargetManager.TargetManager.instance(), UI.Context.Context.instance());

    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameUnderTabTarget = createTarget({type: SDK.Target.Type.Frame, parentTarget: tabTarget});
    const mainFrameWithoutTabTarget = createTarget({type: SDK.Target.Type.Frame});
    const subframeTarget = createTarget({type: SDK.Target.Type.Frame, parentTarget: mainFrameWithoutTabTarget});
    const prerenderTarget = createTarget({type: SDK.Target.Type.Frame, parentTarget: tabTarget, subtype: 'prerender'});

    const contextSetFlavor = sinon.spy(UI.Context.Context.instance(), 'setFlavor');

    const sentExecutionContextCreated = (target: SDK.Target.Target) => {
      dispatchEvent(target, 'Page.frameNavigated', {
        frame: {
          id: 'testFrame',
          loaderId: 'test',
          url: 'http://example.com',
          securityOrigin: 'http://example.com',
          mimeType: 'text/html',
        },
      });

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      runtimeModel!.dispatchEventToListeners(
          SDK.RuntimeModel.Events.ExecutionContextCreated,
          {isDefault: true, frameId: 'testFrame' as Protocol.Page.FrameId, target: () => target} as
              SDK.RuntimeModel.ExecutionContext);
    };

    sentExecutionContextCreated(subframeTarget);
    assert.isTrue(contextSetFlavor.called);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(subframeTarget);
    assert.isTrue(contextSetFlavor.notCalled);

    sentExecutionContextCreated(mainFrameUnderTabTarget);
    assert.isTrue(contextSetFlavor.called);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(mainFrameWithoutTabTarget);
    assert.isTrue(contextSetFlavor.called);

    contextSetFlavor.resetHistory();
    sentExecutionContextCreated(prerenderTarget);
    assert.isFalse(contextSetFlavor.called);
  });
});
