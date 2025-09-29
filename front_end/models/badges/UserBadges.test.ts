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
  override jslogContext = 'test-badge-jslogcontext';
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
  override jslogContext = 'starter-test-badge-jslogcontext';
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

function mockGdpClientGetProfile(response: Host.GdpClient.GetProfileResponse|null): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves(response);
}

function mockGetAwardedBadgeNames(names: string[]|null): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'getAwardedBadgeNames').resolves(names ? new Set(names) : null);
}

function setReceiveBadgesSetting(value: boolean) {
  Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges').set(value);
}

function setStarterBadgeSnoozeCount(value: number) {
  Common.Settings.Settings.instance().createSetting('starter-badge-snooze-count', 0).set(value);
}

function setStarterBadgeLastSnoozedTimestamp(value: number) {
  Common.Settings.Settings.instance().createSetting('starter-badge-last-snoozed-timestamp', 0).set(value);
}

function setStarterBadgeDismissed(value: boolean) {
  Common.Settings.Settings.instance().createSetting('starter-badge-dismissed', false).set(value);
}

function setUpEnvironmentForActivatedBadges(): void {
  setStarterBadgeSnoozeCount(0);
  setStarterBadgeLastSnoozedTimestamp(NOW - TWO_DAYS);
  setStarterBadgeDismissed(false);
  setReceiveBadgesSetting(true);
  mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
  mockGdpClientGetProfile({
    profile: {name: 'names/profile-id'},
    isEligible: true,
  });
  mockGetAwardedBadgeNames([]);
}

async function assertActiveBadges({
  clock,
  shouldStarterBadgeBeActive,
  shouldActivityBadgeBeActive,
}: {
  clock: sinon.SinonFakeTimers,
  shouldStarterBadgeBeActive: boolean,
  shouldActivityBadgeBeActive: boolean,
}): Promise<void> {
  // Record actions that'll trigger both badges.
  const handleActivityBadgeActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');
  const handleStarterBadgeActionStub = sinon.stub(MockStarterBadge.prototype, 'handleAction');

  Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
  Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
  await clock.tickAsync(DELAY_BEFORE_TRIGGER);

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

const DELAY_BEFORE_TRIGGER = 1500;
const NOW = 683935200000;  // Sep 4, 1991
const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

describeWithEnvironment('UserBadges', () => {
  let clock: sinon.SinonFakeTimers;
  beforeEach(() => {
    updateHostConfig({
      devToolsGdpProfiles: {
        enabled: true,
        starterBadgeEnabled: true,
        badgesEnabled: true,
      },
      devToolsGdpProfilesAvailability: {
        enabled: true,
        enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
      },
    });
    clock = sinon.useFakeTimers({toFake: ['Date', 'setTimeout'], now: NOW});
    Object.assign(Badges.UserBadges.BADGE_REGISTRY, MOCK_BADGE_REGISTRY);
    Badges.UserBadges.instance({forceNew: true});
  });

  afterEach(() => {
    clock.restore();
  });

  it('should dispatch a badge triggered event when a badge is triggered for the first time', async () => {
    setUpEnvironmentForActivatedBadges();
    stubGdpClientCreateAward('test/test-badge');
    await Badges.UserBadges.instance().initialize();
    const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    await clock.tickAsync(DELAY_BEFORE_TRIGGER);

    await badgeTriggeredPromise;
  });

  it('should only dispatch a badge triggered event once when the same action is recorded multiple times', async () => {
    setUpEnvironmentForActivatedBadges();
    stubGdpClientCreateAward('test/test-badge');
    await Badges.UserBadges.instance().initialize();
    const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    await clock.tickAsync(DELAY_BEFORE_TRIGGER);

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
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
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
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

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
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        const badge = await badgeTriggeredPromise;

        assert.strictEqual(badge.name, 'badges/starter-test-badge');
        sinon.assert.calledWith(createAwardStub, {name: 'badges/starter-test-badge'});
      });

      it('should not award a starter badge if the user does not have a GDP profile but trigger the badge', async () => {
        setReceiveBadgesSetting(true);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGdpClientGetProfile({
          profile: null,
          isEligible: true,
        });
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.calledOnce(badgeTriggeredSpy);
      });

      it('should not award a starter badge if the "receive badges" setting is disabled but trigger the badge',
         async () => {
           setReceiveBadgesSetting(false);
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGdpClientGetProfile({
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetAwardedBadgeNames([]);
           const createAwardStub = stubGdpClientCreateAward(null);
           const badgeTriggeredSpy = sinon.spy();
           await Badges.UserBadges.instance().initialize();
           Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

           Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
           await clock.tickAsync(DELAY_BEFORE_TRIGGER);

           sinon.assert.notCalled(createAwardStub);
           sinon.assert.calledOnce(badgeTriggeredSpy);
         });
    });
  });

  describe('recordAction', () => {
    it('should result in a call to `handleAction` for the badges that are interested in that action', async () => {
      setUpEnvironmentForActivatedBadges();
      await Badges.UserBadges.instance().initialize();
      const handleActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');

      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
      await clock.tickAsync(DELAY_BEFORE_TRIGGER);

      sinon.assert.calledOnce(handleActionStub);
    });
  });

  describe('initialize and reconcile badges', () => {
    describe('no active badges', () => {
      it('should not activate any badges if the user is not signed in', async () => {
        mockGetSyncInformation({isSyncActive: false});

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if the user is signed in but is neither eligible to create a GDP profile nor has an existing one',
         async () => {
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGdpClientGetProfile({
             profile: null,
             isEligible: false,
           });

           await Badges.UserBadges.instance().initialize();

           await assertActiveBadges({
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: false,
           });
         });

      it('should deactivate all badges if the awarded badges check fails', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });

        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(null);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges on non-branded builds', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: false,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
          },
        });

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if the badges kill-switch is on', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfiles: {
            enabled: true,
            starterBadgeEnabled: true,
            badgesEnabled: false,
          },
        });

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if not allowed by enterprise policy', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: true,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED_WITHOUT_BADGES,
          },
        });

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if `GetProfile` call returns null', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile(null);
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('only starter badge', () => {
      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one',
         async () => {
           mockGdpClientGetProfile({
             profile: null,
             isEligible: true,
           });
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           await assertActiveBadges({
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one, even if awarded badges check fails',
         async () => {
           mockGdpClientGetProfile({
             profile: null,
             isEligible: true,
           });
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(null);

           await Badges.UserBadges.instance().initialize();

           await assertActiveBadges({
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user has a GDP profile and the receive badges setting is off',
         async () => {
           setReceiveBadgesSetting(false);
           mockGdpClientGetProfile({
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           await assertActiveBadges({
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the starter badge if it was awarded before', async () => {
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(['badges/starter-test-badge']);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if the starter badge kill-switch is on', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);
        updateHostConfig({
          devToolsGdpProfiles: {
            enabled: true,
            badgesEnabled: true,
            starterBadgeEnabled: false,
          },
        });

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: true,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('all badges', () => {
      it('should activate starter and activity badges if the user has a GDP profile AND the receive badges setting is on AND they are not awarded before',
         async () => {
           setReceiveBadgesSetting(true);
           mockGdpClientGetProfile({
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames([]);

           await Badges.UserBadges.instance().initialize();

           await assertActiveBadges({
             clock,
             shouldActivityBadgeBeActive: true,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the activity badge if it was awarded before', async () => {
        setReceiveBadgesSetting(true);
        mockGdpClientGetProfile({
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(['badges/test-badge']);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
      });
    });

    it('should deactivate activity based badges when receive badges setting turns to false', async () => {
      setReceiveBadgesSetting(true);
      mockGdpClientGetProfile({
        profile: {name: 'names/profile-id'},
        isEligible: true,
      });
      mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
      mockGetAwardedBadgeNames([]);

      await Badges.UserBadges.instance().initialize();
      await assertActiveBadges({
        clock,
        shouldActivityBadgeBeActive: true,
        shouldStarterBadgeBeActive: true,
      });

      const waitForReconcileBadgesToFinish =
          expectCall(sinon.stub(Badges.UserBadges.instance(), 'reconcileBadgesFinishedForTest'));
      setReceiveBadgesSetting(false);
      await waitForReconcileBadgesToFinish;
      await assertActiveBadges({
        clock,
        shouldActivityBadgeBeActive: false,
        shouldStarterBadgeBeActive: true,
      });
    });
  });

  describe('starter badge snooze and dismiss', () => {
    beforeEach(() => {
      setStarterBadgeSnoozeCount(0);
      setStarterBadgeLastSnoozedTimestamp(0);
      setStarterBadgeDismissed(false);
    });

    describe('snoozeStarterBadge', () => {
      it('should increment the snooze count and update the timestamp', () => {
        Badges.UserBadges.instance().snoozeStarterBadge();
        assert.strictEqual(Common.Settings.Settings.instance().settingForTest('starter-badge-snooze-count').get(), 1);
        assert.strictEqual(
            Common.Settings.Settings.instance().settingForTest('starter-badge-last-snoozed-timestamp').get(),
            Date.now());
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
        setStarterBadgeDismissed(true);
        mockGdpClientGetProfile({
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if it was snoozed recently', async () => {
        setStarterBadgeLastSnoozedTimestamp(NOW - 500);
        mockGdpClientGetProfile({
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if the max snooze count has been reached', async () => {
        setStarterBadgeSnoozeCount(3);
        mockGdpClientGetProfile({
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should activate the starter badge if the snooze period has passed', async () => {
        setStarterBadgeLastSnoozedTimestamp(NOW - TWO_DAYS);
        mockGdpClientGetProfile({
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames([]);

        await Badges.UserBadges.instance().initialize();

        await assertActiveBadges({
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
      });
    });

    describe('onTriggerBadge', () => {
      it('should not award the starter badge if it has been dismissed', async () => {
        setUpEnvironmentForActivatedBadges();
        setStarterBadgeDismissed(true);
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should not award the starter badge if it was snoozed recently', async () => {
        setUpEnvironmentForActivatedBadges();
        setStarterBadgeLastSnoozedTimestamp(NOW - 500);
        const createAwardStub = stubGdpClientCreateAward(null);
        const badgeTriggeredSpy = sinon.spy();
        await Badges.UserBadges.instance().initialize();
        Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should award the starter badge if the snooze period has passed', async () => {
        setStarterBadgeLastSnoozedTimestamp(NOW - TWO_DAYS);
        setUpEnvironmentForActivatedBadges();
        const createAwardStub = stubGdpClientCreateAward('test/test-badge');
        await Badges.UserBadges.instance().initialize();
        const badgeTriggeredPromise = Badges.UserBadges.instance().once(Badges.Events.BADGE_TRIGGERED);

        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        await badgeTriggeredPromise;

        sinon.assert.calledOnce(createAwardStub);
      });
    });
  });
});
