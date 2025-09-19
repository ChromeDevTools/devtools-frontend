// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithLocale, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as SettingComponents from '../../../ui/components/settings/settings.js';
import * as PanelCommon from '../../common/common.js';

import * as PanelComponents from './components.js';

// TODO(crbug.com/442543412): Add tests for calling `UserBadges.initialize()` and recording an action after
// the setting is enabled. We currently don't have tests for these because we'll need to re-write them
// anyways with the widget framework (and using `view.onSettingChanged` kind of approach instead of
// emitting the change custom event).
async function renderSyncSection(data: PanelComponents.SyncSection.SyncSectionData):
    Promise<{section: PanelComponents.SyncSection.SyncSection, shadowRoot: ShadowRoot}> {
  const section = new PanelComponents.SyncSection.SyncSection();
  renderElementIntoDOM(section);
  section.data = data;
  await RenderCoordinator.done();
  assert.isNotNull(section.shadowRoot);
  return {section, shadowRoot: section.shadowRoot};
}

describeWithLocale('SyncSection', () => {
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

  it('shows a warning tooltip when sync is not active and the user is signed in', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        accountEmail: 'user@gmail.com',
      },
      syncSetting,
      receiveBadgesSetting,
    });
    const warning = shadowRoot.querySelector('devtools-tooltip');
    assert.instanceOf(warning, HTMLElement);
    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('shows a warning tooltip when sync is active but preferences bucket is not synced', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: false,
        accountEmail: 'user@gmail.com',
      },
      receiveBadgesSetting,
      syncSetting,
    });

    const warning = shadowRoot.querySelector('devtools-tooltip');
    assert.instanceOf(warning, HTMLElement);

    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('disables the checkbox when sync is not active', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        accountEmail: 'user@gmail.com',
      },
      receiveBadgesSetting,
      syncSetting,
    });

    const settingCheckbox = shadowRoot.querySelector('setting-checkbox');
    assert.instanceOf(settingCheckbox, SettingComponents.SettingCheckbox.SettingCheckbox);
    assert.isNotNull(settingCheckbox.shadowRoot);

    const checkbox = settingCheckbox.shadowRoot.querySelector('input');
    assert.instanceOf(checkbox, HTMLInputElement);

    assert.isTrue(checkbox.disabled);
  });

  it('shows the avatar and email of the logged in user', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: true,
        accountEmail: 'user@gmail.com',
        accountImage: '<png encoded as base64>',
      },
      receiveBadgesSetting,
      syncSetting,
    });

    const image = shadowRoot.querySelector('img');
    assert.instanceOf(image, HTMLImageElement);

    const email = shadowRoot.querySelector('.account-email');
    assert.instanceOf(email, HTMLElement);

    assert.include(email.innerText, 'user@gmail.com');
  });

  it('shows not signed in if the user is not logged in', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        arePreferencesSynced: false,
      },
      receiveBadgesSetting,
      syncSetting,
    });

    const email = shadowRoot.querySelector('.not-signed-in');
    assert.instanceOf(email, HTMLElement);

    assert.include(email.innerText, 'not signed into Chrome');
  });

  it('does not render the GDP section if the feature is disabled', async () => {
    updateHostConfig({
      devToolsGdpProfiles: {
        enabled: false,
      },
    });
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: true,
        accountEmail: 'user@gmail.com',
      },
      syncSetting,
      receiveBadgesSetting,
    });
    const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
    assert.isNull(gdpSection);
  });

  it('does not render the GDP section on non-branded builds', async () => {
    updateHostConfig({
      devToolsGdpProfilesAvailability: {
        enabled: false,
        enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
      },
    });
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: true,
        accountEmail: 'user@gmail.com',
      },
      syncSetting,
      receiveBadgesSetting,
    });
    const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
    assert.isNull(gdpSection);
  });

  it('does not render the GDP section if enterprise policy disables the feature', async () => {
    updateHostConfig({
      devToolsGdpProfilesAvailability: {
        enabled: true,
        enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED,
      },
    });
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: true,
        accountEmail: 'user@gmail.com',
      },
      syncSetting,
      receiveBadgesSetting,
    });
    const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
    assert.isNull(gdpSection);
  });

  describe('Google Developer Program profile', () => {
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

    afterEach(() => {
      updateHostConfig({});
    });

    it('renders the sign-up state when the user does not have a GDP profile but is eligible to create one',
       async () => {
         const gdpClient = Host.GdpClient.GdpClient.instance();
         sinon.stub(gdpClient, 'getProfile').resolves(null);
         sinon.stub(gdpClient, 'isEligibleToCreateProfile').resolves(true);

         const syncSetting = createFakeSetting<boolean>('setting', true);
         const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
         const {shadowRoot} = await renderSyncSection({
           syncInfo: {
             isSyncActive: true,
             arePreferencesSynced: true,
             accountEmail: 'user@gmail.com',
           },
           syncSetting,
           receiveBadgesSetting,
         });
         const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
         assert.instanceOf(gdpSection, HTMLElement);

         const signUpButton = gdpSection.querySelector('devtools-button');
         assert.instanceOf(signUpButton, HTMLElement);
         assert.strictEqual(signUpButton.innerText, 'Sign up');
       });

    it('does not render the GDP section when the user does not have a GDP profile and is not eligible to create one',
       async () => {
         const gdpClient = Host.GdpClient.GdpClient.instance();
         sinon.stub(gdpClient, 'getProfile').resolves(null);
         sinon.stub(gdpClient, 'isEligibleToCreateProfile').resolves(false);

         const syncSetting = createFakeSetting<boolean>('setting', true);
         const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
         const {shadowRoot} = await renderSyncSection({
           syncInfo: {
             isSyncActive: true,
             arePreferencesSynced: true,
             accountEmail: 'user@gmail.com',
           },
           syncSetting,
           receiveBadgesSetting,
         });
         const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
         assert.isNull(gdpSection);
       });

    it('renders the profile details with standard plan', async () => {
      const gdpClient = Host.GdpClient.GdpClient.instance();
      sinon.stub(gdpClient, 'getProfile').resolves({
        name: 'test-profile',
        activeSubscription: undefined,
      });

      const syncSetting = createFakeSetting<boolean>('setting', true);
      const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
      const {shadowRoot} = await renderSyncSection({
        syncInfo: {
          isSyncActive: true,
          arePreferencesSynced: true,
          accountEmail: 'user@gmail.com',
        },
        syncSetting,
        receiveBadgesSetting,
      });

      const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
      assert.instanceOf(gdpSection, HTMLElement);

      const planDetails = gdpSection.querySelector('.plan-details');
      assert.instanceOf(planDetails, HTMLElement);
      assert.include(planDetails.innerText, 'Standard plan');

      const viewProfileLink = gdpSection.querySelector('x-link');
      assert.instanceOf(viewProfileLink, HTMLElement);
      assert.strictEqual(viewProfileLink.innerText, 'View profile');

      const receiveBadgesCheckbox = gdpSection.querySelector('setting-checkbox');
      assert.instanceOf(receiveBadgesCheckbox, SettingComponents.SettingCheckbox.SettingCheckbox);
    });

    it('renders the profile details without badges if badges are blocked by enterprise policy', async () => {
      updateHostConfig({
        devToolsGdpProfiles: {
          enabled: true,
        },
        devToolsGdpProfilesAvailability: {
          enabled: true,
          enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED_WITHOUT_BADGES,
        },
      });
      const gdpClient = Host.GdpClient.GdpClient.instance();
      sinon.stub(gdpClient, 'getProfile').resolves({
        name: 'test-profile',
        activeSubscription: undefined,
      });

      const syncSetting = createFakeSetting<boolean>('setting', true);
      const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
      const {shadowRoot} = await renderSyncSection({
        syncInfo: {
          isSyncActive: true,
          arePreferencesSynced: true,
          accountEmail: 'user@gmail.com',
        },
        syncSetting,
        receiveBadgesSetting,
      });

      const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
      assert.instanceOf(gdpSection, HTMLElement);

      const planDetails = gdpSection.querySelector('.plan-details');
      assert.instanceOf(planDetails, HTMLElement);
      assert.include(planDetails.innerText, 'Standard plan');

      const viewProfileLink = gdpSection.querySelector('x-link');
      assert.instanceOf(viewProfileLink, HTMLElement);
      assert.strictEqual(viewProfileLink.innerText, 'View profile');

      const receiveBadgesCheckbox = gdpSection.querySelector('setting-checkbox');
      assert.isNull(receiveBadgesCheckbox);
    });

    const subscriptionTiers = [
      {
        tier: Host.GdpClient.SubscriptionTier.PREMIUM_ANNUAL,
        expectedText: 'Premium (Annual)',
      },
      {
        tier: Host.GdpClient.SubscriptionTier.PREMIUM_MONTHLY,
        expectedText: 'Premium (Monthly)',
      },
      {
        tier: Host.GdpClient.SubscriptionTier.PRO_ANNUAL,
        expectedText: 'Pro (Annual)',
      },
      {
        tier: Host.GdpClient.SubscriptionTier.PRO_MONTHLY,
        expectedText: 'Pro (Monthly)',
      },
      {
        tier: 'unknown-tier',
        expectedText: 'Unknown plan',
      },
    ];

    for (const {tier, expectedText} of subscriptionTiers) {
      it(`renders the profile details with ${expectedText} plan`, async () => {
        const gdpClient = Host.GdpClient.GdpClient.instance();
        sinon.stub(gdpClient, 'getProfile').resolves({
          name: 'test-profile',
          activeSubscription: {
            subscriptionTier: tier as Host.GdpClient.SubscriptionTier,
            subscriptionStatus: Host.GdpClient.SubscriptionStatus.ENABLED,
          },
        });

        const syncSetting = createFakeSetting<boolean>('setting', true);
        const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);
        const {shadowRoot} = await renderSyncSection({
          syncInfo: {
            isSyncActive: true,
            arePreferencesSynced: true,
            accountEmail: 'user@gmail.com',
          },
          syncSetting,
          receiveBadgesSetting,
        });

        const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
        assert.instanceOf(gdpSection, HTMLElement);

        const planDetails = gdpSection.querySelector('.plan-details');
        assert.instanceOf(planDetails, HTMLElement);
        assert.include(planDetails.innerText, expectedText);
      });
    }

    it('refetches the GDP profile details after a successful sign-up', async () => {
      const gdpClient = Host.GdpClient.GdpClient.instance();
      const getProfileStub = sinon.stub(gdpClient, 'getProfile').resolves(null);
      sinon.stub(gdpClient, 'isEligibleToCreateProfile').resolves(true);
      const showStub = sinon.stub(PanelCommon.GdpSignUpDialog, 'show').callsFake(options => {
        options?.onSuccess?.();
      });
      const syncSetting = createFakeSetting<boolean>('setting', true);
      const receiveBadgesSetting = createFakeSetting<boolean>('receive-badges', true);

      const {shadowRoot} = await renderSyncSection({
        syncInfo: {
          isSyncActive: true,
          arePreferencesSynced: true,
          accountEmail: 'user@gmail.com',
        },
        syncSetting,
        receiveBadgesSetting,
      });
      const gdpSection = shadowRoot.querySelector('.gdp-profile-container');
      assert.instanceOf(gdpSection, HTMLElement);
      const signUpButton = gdpSection.querySelector('devtools-button');
      assert.instanceOf(signUpButton, HTMLElement);
      // The first call happens on render.
      sinon.assert.calledOnce(getProfileStub);
      signUpButton.click();

      sinon.assert.calledOnce(showStub);
      // The second call is triggered by the `onSuccess` callback.
      sinon.assert.calledTwice(getProfileStub);
    });
  });
});
