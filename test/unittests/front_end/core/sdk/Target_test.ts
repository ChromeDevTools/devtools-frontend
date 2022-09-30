// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import * as Host from '../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';
import {
  createTarget,
} from '../../helpers/EnvironmentHelpers.js';

describeWithMockConnection('Target', () => {
  let tabTarget: SDK.Target.Target;
  let mainFrameTargetUnderTab: SDK.Target.Target;
  let mainFrameTargetWithoutTab: SDK.Target.Target;
  let subframeTarget: SDK.Target.Target;

  beforeEach(() => {
    tabTarget = createTarget({type: SDK.Target.Type.Tab});
    mainFrameTargetUnderTab = createTarget({type: SDK.Target.Type.Frame, parentTarget: tabTarget});
    mainFrameTargetWithoutTab = createTarget({type: SDK.Target.Type.Frame});
    subframeTarget = createTarget({type: SDK.Target.Type.Frame, parentTarget: mainFrameTargetUnderTab});
  });

  it('has capabilities based on the type', () => {
    assert.isTrue(tabTarget.hasAllCapabilities(SDK.Target.Capability.Target));
    assert.isFalse(tabTarget.hasAllCapabilities(SDK.Target.Capability.DOM));

    assert.isTrue(mainFrameTargetUnderTab.hasAllCapabilities(
        SDK.Target.Capability.Target | SDK.Target.Capability.DOM | SDK.Target.Capability.DeviceEmulation));
    assert.isTrue(mainFrameTargetWithoutTab.hasAllCapabilities(
        SDK.Target.Capability.Target | SDK.Target.Capability.DOM | SDK.Target.Capability.DeviceEmulation));

    assert.isTrue(subframeTarget.hasAllCapabilities(SDK.Target.Capability.Target | SDK.Target.Capability.DOM));
    assert.isFalse(subframeTarget.hasAllCapabilities(SDK.Target.Capability.DeviceEmulation));
  });

  it('notifies about inspected URL change', () => {
    const inspectedURLChanged =
        sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'inspectedURLChanged');

    subframeTarget.setInspectedURL('https://example.com/' as Platform.DevToolsPath.UrlString);
    assert.isTrue(inspectedURLChanged.notCalled);

    mainFrameTargetWithoutTab.setInspectedURL('https://example.com/' as Platform.DevToolsPath.UrlString);
    assert.isTrue(inspectedURLChanged.calledOnce);

    mainFrameTargetUnderTab.setInspectedURL('https://example.com/' as Platform.DevToolsPath.UrlString);
    assert.isTrue(inspectedURLChanged.calledTwice);
  });
});
