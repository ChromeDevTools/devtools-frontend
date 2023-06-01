// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Security from '../../../../../front_end/panels/security/security.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('SecurityPanel', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = targetFactory();
    });

    it('updates when security state changes', async () => {
      const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
      const securityModel = target.model(Security.SecurityModel.SecurityModel);
      assertNotNullOrUndefined(securityModel);
      const visibleSecurityState = {
        securityState: Protocol.Security.SecurityState.Insecure,
        securityStateIssueIds: [],
        certificateSecurityState: null,
      } as unknown as Security.SecurityModel.PageVisibleSecurityState;
      securityModel.dispatchEventToListeners(
          Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

      assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                        ?.classList.contains('security-summary-insecure'));

      visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
      securityModel.dispatchEventToListeners(
          Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

      assert.isFalse(securityPanel.mainView.contentElement.querySelector('.security-summary')
                         ?.classList.contains('security-summary-insecure'));
      assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                        ?.classList.contains('security-summary-secure'));
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));

  it('can switch to a different SecurityModel', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainTarget = createTarget({parentTarget: tabTarget});
    const mainSecurityModel = mainTarget.model(Security.SecurityModel.SecurityModel);
    assertNotNullOrUndefined(mainSecurityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    // Add the main target to the security panel.
    securityPanel.modelAdded(mainSecurityModel);
    const visibleSecurityState = {
      securityState: Protocol.Security.SecurityState.Insecure,
      securityStateIssueIds: [],
      certificateSecurityState: null,
    } as unknown as Security.SecurityModel.PageVisibleSecurityState;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Switch to the prerender target.
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const prerenderSecurityModel = prerenderTarget.model(Security.SecurityModel.SecurityModel);
    assertNotNullOrUndefined(prerenderSecurityModel);
    securityPanel.modelAdded(prerenderSecurityModel);
    securityPanel.modelRemoved(mainSecurityModel);

    // Check that the security panel does not listen to events from the previous target.
    visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Check that the security panel listens to events from the current target.
    prerenderSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-secure'));

    // Check that the SecurityPanel listens to any PrimaryPageChanged event
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    const sidebarTreeClearSpy = sinon.spy(securityPanel.sidebarTree, 'clearOrigins');
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: {url: 'https://www.example.com'} as SDK.ResourceTreeModel.ResourceTreeFrame,
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation,
    });
    assert.isTrue(sidebarTreeClearSpy.calledOnce);
  });
});
