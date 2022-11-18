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
});
