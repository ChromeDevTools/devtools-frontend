// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';
import * as PanelCommon from '../../common/common.js';

import * as Components from './components.js';

describeWithEnvironment('SyncSection', () => {
  const MOCK_SYNC_INFO_NOT_SIGNED_IN: Host.InspectorFrontendHostAPI.SyncInformation = {
    isSyncActive: false,
  };

  const MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON: Host.InspectorFrontendHostAPI.SyncInformation = {
    isSyncActive: true,
    arePreferencesSynced: true,
    accountEmail: 'test@google.com',
    accountImage: 'data:image/png;base64,test',
  };

  const MOCK_SYNC_INFO_SIGNED_IN_SYNC_OFF: Host.InspectorFrontendHostAPI.SyncInformation = {
    ...MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON,
    isSyncActive: false,
  };

  const MOCK_SYNC_INFO_SIGNED_IN_PREFERENCES_OFF: Host.InspectorFrontendHostAPI.SyncInformation = {
    ...MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON,
    arePreferencesSynced: false,
  };

  const MOCK_GDP_PROFILE: Host.GdpClient.Profile = {
    name: 'test',
    activeSubscription: {
      subscriptionTier: Host.GdpClient.SubscriptionTier.PREMIUM_ANNUAL,
      subscriptionStatus: Host.GdpClient.SubscriptionStatus.ENABLED,
    },
  };

  let getProfileStub: sinon.SinonStub;

  beforeEach(() => {
    getProfileStub = sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile');
    // Default to no profile.
    getProfileStub.resolves(null);
  });

  async function createWidget() {
    const view = createViewFunctionStub(Components.SyncSection.SyncSection);
    const widget = new Components.SyncSection.SyncSection(undefined, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

  describe('rendering', () => {
    it('shows "not signed in" when no user is signed into Chrome', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_NOT_SIGNED_IN;
      const input = await view.nextInput;
      assert.deepEqual(input.syncInfo, MOCK_SYNC_INFO_NOT_SIGNED_IN);
      assert.isUndefined(input.gdpProfile);
    });

    it('shows account info when user is signed in', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      assert.deepEqual(input.syncInfo, MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON);
    });

    it('disables sync checkbox when sync is off', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_OFF;
      const input = await view.nextInput;
      assert.isTrue(input.syncSetting.disabled());
    });

    it('disables sync checkbox when preferences sync is off', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_PREFERENCES_OFF;
      const input = await view.nextInput;
      assert.isTrue(input.syncSetting.disabled());
    });

    it('enables sync checkbox when sync is fully on', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      assert.isFalse(input.syncSetting.disabled());
    });

    it('passes SYNC_DISABLED warning type when sync is off', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_OFF;
      const input = await view.nextInput;
      assert.strictEqual(input.warningType, Components.SyncSection.WarningType.SYNC_DISABLED);
    });

    it('passes PREFERENCES_SYNC_DISABLED warning type when preferences sync is off', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_PREFERENCES_OFF;
      const input = await view.nextInput;
      assert.strictEqual(input.warningType, Components.SyncSection.WarningType.PREFERENCES_SYNC_DISABLED);
    });

    it('passes no warning type when sync is fully on', async () => {
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      assert.isUndefined(input.warningType);
    });
  });

  describe('GDP profile', () => {
    beforeEach(() => {
      updateHostConfig({
        devToolsGdpProfiles: {
          enabled: true,
        },
        devToolsGdpProfilesAvailability: {
          enabled: true,
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
        },
      });
    });

    it('fetches GDP profile when user is signed in', async () => {
      const {widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      sinon.assert.calledOnce(getProfileStub);
    });

    it('does not fetch GDP profile when user is not signed in', async () => {
      const {widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_NOT_SIGNED_IN;
      sinon.assert.notCalled(getProfileStub);
    });

    it('shows sign up button if user is eligible and has no profile', async () => {
      getProfileStub.resolves({profile: null, isEligible: true});
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      assert.isTrue(input.isEligibleToCreateGdpProfile);
      assert.isUndefined(input.gdpProfile);
    });

    it('shows profile details if user has a profile', async () => {
      getProfileStub.resolves({profile: MOCK_GDP_PROFILE, isEligible: true});
      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      assert.isTrue(input.isEligibleToCreateGdpProfile);
      assert.deepEqual(input.gdpProfile, MOCK_GDP_PROFILE);
    });

    it('refetches GDP profile on sign-up success', async () => {
      getProfileStub.resolves({profile: null, isEligible: true});
      const showStub = sinon.stub(PanelCommon.GdpSignUpDialog, 'show').callsFake(options => {
        options?.onSuccess?.();
      });

      const {view, widget} = await createWidget();
      widget.syncInfo = MOCK_SYNC_INFO_SIGNED_IN_SYNC_ON;
      const input = await view.nextInput;
      // The first call happens on render.
      sinon.assert.calledOnce(getProfileStub);
      input.onSignUpClick();
      sinon.assert.calledOnce(showStub);
      // The second call is triggered by the `onSuccess` callback.
      sinon.assert.calledTwice(getProfileStub);
    });
  });
});
