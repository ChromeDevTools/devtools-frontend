// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';

import * as Freestyler from './freestyler.js';

function getTestAidaClient() {
  return {
    async *
        fetch() {
          yield {explanation: 'test', metadata: {}};
        },
  };
}

describeWithEnvironment('FreestylerPanel', () => {
  describe('consent view', () => {
    const mockView = sinon.stub();

    beforeEach(() => {
      registerNoopActions(['elements.toggle-element-search']);
      mockView.reset();
    });

    it('should render consent view when the consent is not given before', async () => {
      Common.Settings.settingForTest('freestyler-dogfood-consent-onboarding-finished').set(false);

      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAvailability.AVAILABLE,
      });

      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CONSENT_VIEW}));
    });

    it('should set the setting to true and render chat view on accept click', async () => {
      const setting = Common.Settings.settingForTest('freestyler-dogfood-consent-onboarding-finished');
      setting.set(false);

      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAvailability.AVAILABLE,
      });

      const callArgs = mockView.getCall(0).args[0];
      mockView.reset();
      callArgs.onAcceptConsentClick();

      assert.isTrue(setting.get());
      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CHAT_VIEW}));
    });

    it('should render chat view when the consent is given before', async () => {
      Common.Settings.settingForTest('freestyler-dogfood-consent-onboarding-finished').set(true);

      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAvailability.AVAILABLE,
      });

      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CHAT_VIEW}));
    });
  });
});
