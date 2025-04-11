// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('Target', () => {
  let tabTarget: SDK.Target.Target;
  let mainFrameTargetUnderTab: SDK.Target.Target;
  let subframeTarget: SDK.Target.Target;

  beforeEach(() => {
    tabTarget = createTarget({type: SDK.Target.Type.TAB});
    mainFrameTargetUnderTab = createTarget({type: SDK.Target.Type.FRAME, parentTarget: tabTarget});
    subframeTarget = createTarget({type: SDK.Target.Type.FRAME, parentTarget: mainFrameTargetUnderTab});
  });

  it('has capabilities based on the type', () => {
    assert.isTrue(tabTarget.hasAllCapabilities(SDK.Target.Capability.TARGET | SDK.Target.Capability.TRACING));
    assert.isFalse(tabTarget.hasAllCapabilities(SDK.Target.Capability.DOM));

    assert.isTrue(mainFrameTargetUnderTab.hasAllCapabilities(
        SDK.Target.Capability.TARGET | SDK.Target.Capability.DOM | SDK.Target.Capability.DEVICE_EMULATION));

    assert.isTrue(subframeTarget.hasAllCapabilities(SDK.Target.Capability.TARGET | SDK.Target.Capability.DOM));
    assert.isFalse(subframeTarget.hasAllCapabilities(SDK.Target.Capability.DEVICE_EMULATION));
  });

  it('notifies about inspected URL change', () => {
    const inspectedURLChanged = sinon.spy(SDK.TargetManager.TargetManager.instance(), 'onInspectedURLChange');

    subframeTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.assert.calledOnce(inspectedURLChanged);

    mainFrameTargetUnderTab.setInspectedURL(urlString`https://example.com/`);
    sinon.assert.calledTwice(inspectedURLChanged);
  });

  it('determines outermost target', () => {
    assert.isNull(tabTarget.outermostTarget());
    assert.strictEqual(mainFrameTargetUnderTab.outermostTarget(), mainFrameTargetUnderTab);
    assert.strictEqual(subframeTarget.outermostTarget(), mainFrameTargetUnderTab);
    assert.strictEqual(
        createTarget({type: SDK.Target.Type.Worker, parentTarget: subframeTarget}).outermostTarget(),
        mainFrameTargetUnderTab);
    const nodeTarget = createTarget({type: SDK.Target.Type.NODE});
    assert.strictEqual(nodeTarget.outermostTarget(), nodeTarget);
    const browserTarget = createTarget({type: SDK.Target.Type.BROWSER});
    assert.isNull(browserTarget.outermostTarget());
    const serviceWorkerTarget = createTarget({type: SDK.Target.Type.ServiceWorker, parentTarget: browserTarget});
    assert.strictEqual(serviceWorkerTarget.outermostTarget(), serviceWorkerTarget);
  });

  it('tries to resume itself if it was crashed and is then recovered', () => {
    const target = createTarget();
    target.setHasCrashed(true);
    const spy = sinon.spy(target, 'resume');
    target.setHasCrashed(false);
    sinon.assert.calledOnce(spy);
  });

  it('does not resume itself if it was not already crashed', async () => {
    const target = createTarget();
    target.setHasCrashed(true);
    const spy = sinon.spy(target, 'resume');
    // Call this twice, but ensure we only call the spy once.
    target.setHasCrashed(false);
    target.setHasCrashed(false);
    sinon.assert.callCount(spy, 1);
  });

  it('marks a crashed target as suspended', async () => {
    const target = createTarget();
    target.setHasCrashed(true);
    await target.suspend();
    assert.isTrue(target.suspended());
  });

  it('marks a crashed, suspended target as resumed', async () => {
    const target = createTarget();
    target.setHasCrashed(true);
    await target.suspend();
    assert.isTrue(target.suspended());
    await target.resume();
    assert.isFalse(target.suspended());
  });
});
