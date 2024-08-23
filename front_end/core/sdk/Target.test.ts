// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

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

    subframeTarget.setInspectedURL('https://example.com/' as Platform.DevToolsPath.UrlString);
    assert.isTrue(inspectedURLChanged.calledOnce);

    mainFrameTargetUnderTab.setInspectedURL('https://example.com/' as Platform.DevToolsPath.UrlString);
    assert.isTrue(inspectedURLChanged.calledTwice);
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
});
