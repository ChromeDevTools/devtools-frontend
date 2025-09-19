// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';

import * as Badges from './badges.js';

class MockActivityBadge extends Badges.Badge {
  override name = 'badges/test-badge';
  override title = 'test-badge-title';
  override imageUri = 'test-image-uri';
  override interestedActions: readonly Badges.BadgeAction[] = [
    Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED,
  ] as const;

  override handleAction(): void {
    this.trigger();
  }
}

class MockStarterBadge extends Badges.Badge {
  override name = 'badges/starter-test-badge';
  override title = 'starter-test-badge';
  override imageUri = 'starte-test-image-uri';
  override isStarterBadge = true;
  override interestedActions: readonly Badges.BadgeAction[] = [
    Badges.BadgeAction.CSS_RULE_MODIFIED,
  ] as const;

  override handleAction(): void {
    this.trigger();
  }
}

const MOCK_BADGE_REGISTRY = [
  MockActivityBadge,
  MockStarterBadge,
];

function mockGetSyncInformation(information: Host.InspectorFrontendHostAPI.SyncInformation): void {
  sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getSyncInformation').callsFake(cb => {
    cb(information);
  });
}

function stubGdpClientCreateAward(name: string|null):
    sinon.SinonStub<Parameters<typeof Host.GdpClient.GdpClient.prototype.createAward>> {
  return sinon.stub(Host.GdpClient.GdpClient.instance(), 'createAward')
      .resolves(name ? {name} as Host.GdpClient.Award : null);
}

function mockGdpClientGetProfile(profile: Host.GdpClient.Profile|null): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves(profile);
}

function mockIsEligibleToCreateProfile(eligible: boolean): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'isEligibleToCreateProfile').resolves(eligible);
}

function mockGetAwardedBadgeNames(names: string[]|null): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'getAwardedBadgeNames').resolves(names ? new Set(names) : null);
}

function setReceiveBadgesSetting(value: boolean) {
  Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges').set(value);
}

function setUpEnvironmentForActivatedBadges(): void {
  setReceiveBadgesSetting(true);
  mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
  mockGdpClientGetProfile({name: 'names/profile-id'});
  mockIsEligibleToCreateProfile(true);
  mockGetAwardedBadgeNames([]);
}

function assertActiveBadges({
  shouldStarterBadgeBeActive,
  shouldActivityBadgeBeActive,
}: {
  shouldStarterBadgeBeActive: boolean,
  shouldActivityBadgeBeActive: boolean,
}): void {
  // Record actions that'll trigger both badges.
  const handleActivityBadgeActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');
  const handleStarterBadgeActionStub = sinon.stub(MockStarterBadge.prototype, 'handleAction');

  Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
  Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);

  if (shouldStarterBadgeBeActive) {
    sinon.assert.calledOnce(handleStarterBadgeActionStub);
  } else {
    sinon.assert.notCalled(handleStarterBadgeActionStub);
  }

  if (shouldActivityBadgeBeActive) {
    sinon.assert.calledOnce(handleActivityBadgeActionStub);
  } else {
    sinon.assert.notCalled(handleActivityBadgeActionStub);
  }

  handleStarterBadgeActionStub.restore();
  handleActivityBadgeActionStub.restore();
}

describeWithEnvironment('UserBadges', () => {
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
    Object.assign(Badges.UserBadges.BADGE_REGISTRY, MOCK_BADGE_REGISTRY);
    Badges.UserBadges.instance({forceNew: true});
  });

  it('should dispatch a badge triggered event when a badge is triggered for the first time', async () => {
    setUpEnvironmentForActivatedBadges();
    stubGdpClientCreateAward('test/test-badge');
    await Badges.UserBadges.instance().initialize();
    const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    await badgeTriggeredPromise;
  });

  it('should only dispatch a badge triggered event once when the same action is recorded multiple times', async () => {
    setUpEnvironmentForActivatedBadges();
    stubGdpClientCreateAward('test/test-badge');
    await Badges.UserBadges.instance().initialize();
    const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    await badgeTriggeredPromise;
  });

  describe('onTriggerBadge', () => {
    describe('non-starter badges', () => {
      it('should award a non-starter badge and dispatch event when `createAward` succeeds', async () => {
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward('test/test-badge');
        await Badges.UserBadges.instance().initialize();
        const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
        const badge = await badgeTriggeredPromise;

        assert.strictEqual(badge.name, 'badges/test-badge');
        sinon.assert.calledWith(createAwardStub, {name: 'badges/test-badge'});
      });

      it('should not dispatch event for a non-starter badge when `createAward` fails', async () => {
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.calledOnce(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });
    });

    describe('starter-badges', () => {
      it('should award a starter badge if the user has a profile and the setting is enabled', async () => {
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward('test/test-badge');
        await Badges.UserBadges.instance().initialize();
        const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        const badge = await badgeTriggeredPromise;

        assert.strictEqual(badge.name, 'badges/starter-test-badge');
        sinon.assert.calledWith(createAwardStub, {name: 'badges/starter-test-badge'});
      });

      it('should not award a starter badge if the user does not have a GDP profile', async () => {
        setReceiveBadgesSetting(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGdpClientGetProfile(null);
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should not award a starter badge if the "receive badges" setting is disabled', async () => {
        setReceiveBadgesSetting(false);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGdpClientGetProfile({name: 'names/profile-id'});
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });
    });
  });

  describe('recordAction', () => {
    it('should result in a call to `handleAction` for the badges that are interested in that action', async () => {
      setUpEnvironmentForActivatedBadges();
      await Badges.UserBadges.instance().initialize();
      const handleActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');

      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

      sinon.assert.calledOnce(handleActionStub);
    });
  });

  describe('initialize and reconcile badges', () => {
    describe('no active badges', () => {
      it('should not activate any badges if the user is not signed in', async () => {
        mockGetSyncInformation({isSyncActive: false});

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if the user is signed in but is neither eligible to create a GDP profile nor has an existing one',
         async () => {
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockIsEligibleToCreateProfile(false);
           mockGdpClientGetProfile(null);

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: false,
           });
         });

      it('should deactivate all badges if the awarded badges check fails', async () => {
        setReceiveBadgesSetting(true);
        mockIsEligibleToCreateProfile(true);
        mockGdpClientGetProfile({name: 'profiles/test'});
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(null);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges on non-branded builds', async () => {
        setReceiveBadgesSetting(true);
        mockIsEligibleToCreateProfile(true);
        mockGdpClientGetProfile({name: 'profiles/test'});
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: false,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
          },
        });

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if not allowed by enterprise policy', async () => {
        setReceiveBadgesSetting(true);
        mockIsEligibleToCreateProfile(true);
        mockGdpClientGetProfile({name: 'profiles/test'});
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: true,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED_WITHOUT_BADGES,
          },
        });

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('only starter badge', () => {
      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one',
         async () => {
           mockGdpClientGetProfile(null);
           mockIsEligibleToCreateProfile(true);
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one, even if awarded badges check fails',
         async () => {
           mockGdpClientGetProfile(null);
           mockIsEligibleToCreateProfile(true);
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(null);

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user has a GDP profile and the receive badges setting is off',
         async () => {
           setReceiveBadgesSetting(false);
           mockIsEligibleToCreateProfile(true);
           mockGdpClientGetProfile({name: 'profiles/test'});
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the starter badge if it was awarded before', async () => {
        mockIsEligibleToCreateProfile(true);
        mockGdpClientGetProfile({name: 'profiles/test'});
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(['badges/starter-test-badge']);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('all badges', () => {
      it('should activate starter and activity badges if the user has a GDP profile AND the receive badges setting is on AND they are not awarded before',
         async () => {
           setReceiveBadgesSetting(true);
           mockIsEligibleToCreateProfile(true);
           mockGdpClientGetProfile({name: 'profiles/test'});
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: true,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the activity badge if it was awarded before', async () => {
        setReceiveBadgesSetting(true);
        mockIsEligibleToCreateProfile(true);
        mockGdpClientGetProfile({name: 'profiles/test'});
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(['badges/test-badge']);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
      });
    });

    it('should deactivate activity based badges when receive badges setting turns to false', async () => {
      setReceiveBadgesSetting(true);
      mockIsEligibleToCreateProfile(true);
      mockGdpClientGetProfile({name: 'profiles/test'});
      mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
      mockGetAwardedBadgeNames([]);

      await Badges.UserBadges.instance().initialize();
      assertActiveBadges({
        shouldActivityBadgeBeActive: true,
        shouldStarterBadgeBeActive: true,
      });

      const waitForReconcileBadgesToFinish =
          expectCall(sinon.stub(Badges.UserBadges.instance(), 'reconcileBadgesFinishedForTest'));
      setReceiveBadgesSetting(false);
      await waitForReconcileBadgesToFinish;
      assertActiveBadges({
        shouldActivityBadgeBeActive: false,
        shouldStarterBadgeBeActive: true,
      });
    });
  });

  describe('starter badge snooze and dismiss', () => {
    function setSnoozeCount(value: number) {
      Common.Settings.Settings.instance().createSetting('starter-badge-snooze-count', 0).set(value);
    }

    function setLastSnoozedTimestamp(value: number) {
      Common.Settings.Settings.instance().createSetting('starter-badge-last-snoozed-timestamp', 0).set(value);
    }

    function setDismissed(value: boolean) {
      Common.Settings.Settings.instance().createSetting('starter-badge-dismissed', false).set(value);
    }

    beforeEach(() => {
      setSnoozeCount(0);
      setLastSnoozedTimestamp(0);
      setDismissed(false);
    });

    describe('snoozeStarterBadge', () => {
      it('should increment the snooze count and update the timestamp', () => {
        const clock = sinon.useFakeTimers({toFake: ['Date']});
        Badges.UserBadges.instance().snoozeStarterBadge();
        assert.strictEqual(Common.Settings.Settings.instance().settingForTest('starter-badge-snooze-count').get(), 1);
        assert.strictEqual(
            Common.Settings.Settings.instance().settingForTest('starter-badge-last-snoozed-timestamp').get(),
            Date.now());
        clock.restore();
      });
    });

    describe('dismissStarterBadge', () => {
      it('should set the dismissed setting to true', () => {
        Badges.UserBadges.instance().dismissStarterBadge();
        assert.isTrue(Common.Settings.Settings.instance().settingForTest('starter-badge-dismissed').get());
      });
    });

    describe('reconcileBadges', () => {
      it('should not activate the starter badge if it has been dismissed', async () => {
        setDismissed(true);
        mockGdpClientGetProfile(null);
        mockIsEligibleToCreateProfile(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if it was snoozed recently', async () => {
        const clock = sinon.useFakeTimers({toFake: ['Date']});
        setLastSnoozedTimestamp(Date.now() - 1000);
        mockGdpClientGetProfile(null);
        mockIsEligibleToCreateProfile(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
        clock.restore();
      });

      it('should not activate the starter badge if the max snooze count has been reached', async () => {
        setSnoozeCount(3);
        mockGdpClientGetProfile(null);
        mockIsEligibleToCreateProfile(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should activate the starter badge if the snooze period has passed', async () => {
        const clock = sinon.useFakeTimers({toFake: ['Date']});
        setLastSnoozedTimestamp(Date.now() - 2 * 24 * 60 * 60 * 1000);
        mockGdpClientGetProfile(null);
        mockIsEligibleToCreateProfile(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        assertActiveBadges({
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
        clock.restore();
      });
    });

    describe('onTriggerBadge', () => {
      it('should not award the starter badge if it has been dismissed', async () => {
        setDismissed(true);
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should not award the starter badge if it was snoozed recently', async () => {
        const clock = sinon.useFakeTimers({toFake: ['Date']});
        setLastSnoozedTimestamp(Date.now() - 1000);
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await new Promise(resolve => setTimeout(resolve, 0));

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
        clock.restore();
      });

      it('should award the starter badge if the snooze period has passed', async () => {
        const clock = sinon.useFakeTimers({toFake: ['Date']});
        setLastSnoozedTimestamp(Date.now() - 2 * 24 * 60 * 60 * 1000);
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward('test/test-badge');
        await Badges.UserBadges.instance().initialize();
        const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await badgeTriggeredPromise;

        sinon.assert.calledOnce(createAwardStub);
        clock.restore();
      });
    });
  });
});
