// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

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

function mockGetSyncInformation(
    inspectorFrontendHost: sinon.SinonStubbedInstance<Host.InspectorFrontendHost.InspectorFrontendHostStub>,
    information: Host.InspectorFrontendHostAPI.SyncInformation,
    ): void {
  inspectorFrontendHost.getSyncInformation.callsFake(cb => {
    cb(information);
  });
}

function stubGdpClientCreateAward(gdpClient: Host.GdpClient.GdpClient, name: string|null):
    sinon.SinonStub<Parameters<typeof Host.GdpClient.GdpClient.prototype.createAward>> {
  return sinon.stub(gdpClient, 'createAward').resolves(name ? {name} as Host.GdpClient.Award : null);
}

function mockGdpClientGetProfile(gdpClient: Host.GdpClient.GdpClient,
                                 response: Host.GdpClient.GetProfileResponse|null): void {
  sinon.stub(gdpClient, 'getProfile').resolves(response);
}

function mockGetAwardedBadgeNames(gdpClient: Host.GdpClient.GdpClient, names: string[]|null): void {
  sinon.stub(gdpClient, 'getAwardedBadgeNames').resolves(names ? new Set(names) : null);
}

function setReceiveBadgesSetting(settings: Common.Settings.Settings, value: boolean): void {
  settings.resolve(Badges.receiveGdpBadgesSettingDescriptor).set(value);
}

function setStarterBadgeSnoozeCount(settings: Common.Settings.Settings, value: number): void {
  settings.createSetting('starter-badge-snooze-count', 0).set(value);
}

function setStarterBadgeLastSnoozedTimestamp(settings: Common.Settings.Settings, value: number): void {
  settings.createSetting('starter-badge-last-snoozed-timestamp', 0).set(value);
}

function setStarterBadgeDismissed(settings: Common.Settings.Settings, value: boolean): void {
  settings.createSetting('starter-badge-dismissed', false).set(value);
}

function setUpEnvironmentForActivatedBadges(
    settings: Common.Settings.Settings,
    gdpClient: Host.GdpClient.GdpClient,
    inspectorFrontendHost: sinon.SinonStubbedInstance<Host.InspectorFrontendHost.InspectorFrontendHostStub>,
    ): void {
  setStarterBadgeSnoozeCount(settings, 0);
  setStarterBadgeLastSnoozedTimestamp(settings, NOW - TWO_DAYS);
  setStarterBadgeDismissed(settings, false);
  setReceiveBadgesSetting(settings, true);
  mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
  mockGdpClientGetProfile(gdpClient, {
    profile: {name: 'names/profile-id'},
    isEligible: true,
  });
  mockGetAwardedBadgeNames(gdpClient, []);
}

async function assertActiveBadges({
  userBadges,
  clock,
  shouldStarterBadgeBeActive,
  shouldActivityBadgeBeActive,
}: {
  userBadges: Badges.UserBadges,
  clock: sinon.SinonFakeTimers,
  shouldStarterBadgeBeActive: boolean,
  shouldActivityBadgeBeActive: boolean,
}): Promise<void> {
  // Record actions that'll trigger both badges.
  const handleActivityBadgeActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');
  const handleStarterBadgeActionStub = sinon.stub(MockStarterBadge.prototype, 'handleAction');

  userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
  userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
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

describe('UserBadges', () => {
  setupSettingsHooks();

  let universe: TestUniverse;
  let inspectorFrontendHost: sinon.SinonStubbedInstance<Host.InspectorFrontendHost.InspectorFrontendHostStub>;
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
    inspectorFrontendHost = sinon.createStubInstance(Host.InspectorFrontendHost.InspectorFrontendHostStub);
    universe = new TestUniverse({inspectorFrontendHost});
  });

  afterEach(() => {
    clock.restore();
  });

  it('should dispatch a badge triggered event when a badge is triggered for the first time', async () => {
    setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
    stubGdpClientCreateAward(universe.gdpClient, 'test/test-badge');
    await universe.userBadges.initialize();
    const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);

    universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    await clock.tickAsync(DELAY_BEFORE_TRIGGER);

    await badgeTriggeredPromise;
  });

  it('should only dispatch a badge triggered event once when the same action is recorded multiple times', async () => {
    setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
    stubGdpClientCreateAward(universe.gdpClient, 'test/test-badge');
    await universe.userBadges.initialize();
    const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);

    universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    await clock.tickAsync(DELAY_BEFORE_TRIGGER);

    await badgeTriggeredPromise;
  });

  describe('onTriggerBadge', () => {
    describe('non-starter badges', () => {
      it('should award a non-starter badge and dispatch event when `createAward` succeeds', async () => {
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, 'test/test-badge');
        await universe.userBadges.initialize();
        const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);

        universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        const {badge, reason} = await badgeTriggeredPromise;

        assert.strictEqual(badge.name, 'badges/test-badge');
        assert.strictEqual(reason, Badges.BadgeTriggerReason.AWARD);
        sinon.assert.calledWith(createAwardStub, {name: 'badges/test-badge'});
      });

      it('should not dispatch event for a non-starter badge when `createAward` fails', async () => {
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);
        const badgeTriggeredSpy = sinon.spy();
        await universe.userBadges.initialize();
        universe.userBadges.addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.calledOnce(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });
    });

    describe('starter-badges', () => {
      it('should award a starter badge if the user has a profile and the setting is enabled', async () => {
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, 'test/test-badge');
        await universe.userBadges.initialize();
        const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        const {badge, reason} = await badgeTriggeredPromise;

        assert.strictEqual(badge.name, 'badges/starter-test-badge');
        assert.strictEqual(reason, Badges.BadgeTriggerReason.AWARD);
        sinon.assert.calledWith(createAwardStub, {name: 'badges/starter-test-badge'});
      });

      it('should not award a starter badge if the user does not have a GDP profile but trigger the badge', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: null,
          isEligible: true,
        });
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);
        const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);
        await universe.userBadges.initialize();

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        const {reason} = await badgeTriggeredPromise;

        sinon.assert.notCalled(createAwardStub);
        assert.strictEqual(reason, Badges.BadgeTriggerReason.STARTER_BADGE_PROFILE_NUDGE);
      });

      it('should not award a starter badge if the "receive badges" setting is disabled but trigger the badge',
         async () => {
           setReceiveBadgesSetting(universe.settings, false);
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetAwardedBadgeNames(universe.gdpClient, []);
           const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);
           const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);
           await universe.userBadges.initialize();

           universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
           await clock.tickAsync(DELAY_BEFORE_TRIGGER);
           const {reason} = await badgeTriggeredPromise;

           sinon.assert.notCalled(createAwardStub);
           assert.strictEqual(reason, Badges.BadgeTriggerReason.STARTER_BADGE_SETTINGS_NUDGE);
         });
      it('does not trigger event if getProfile returns null (failed response)', async () => {
        setStarterBadgeSnoozeCount(universe.settings, 0);
        setStarterBadgeLastSnoozedTimestamp(universe.settings, NOW - TWO_DAYS);
        setStarterBadgeDismissed(universe.settings, false);
        setReceiveBadgesSetting(universe.settings, true);
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGdpClientGetProfile(universe.gdpClient, null);
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        const badgeTriggeredSpy = sinon.spy();
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);

        await universe.userBadges.initialize();
        universe.userBadges.addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });
    });
  });

  describe('recordAction', () => {
    it('should result in a call to `handleAction` for the badges that are interested in that action', async () => {
      setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
      await universe.userBadges.initialize();
      const handleActionStub = sinon.stub(MockActivityBadge.prototype, 'handleAction');

      universe.userBadges.recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
      await clock.tickAsync(DELAY_BEFORE_TRIGGER);

      sinon.assert.calledOnce(handleActionStub);
    });
  });

  describe('initialize and reconcile badges', () => {
    describe('no active badges', () => {
      it('should not activate any badges if the user is not signed in', async () => {
        mockGetSyncInformation(inspectorFrontendHost, {isSyncActive: false});

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if the user is signed in but is neither eligible to create a GDP profile nor has an existing one',
         async () => {
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: null,
             isEligible: false,
           });

           await universe.userBadges.initialize();

           await assertActiveBadges({
             userBadges: universe.userBadges,
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: false,
           });
         });

      it('should deactivate all badges if the awarded badges check fails', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });

        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, null);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges on non-branded builds', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: false,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED,
          },
        });

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if the badges kill-switch is on', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);
        updateHostConfig({
          devToolsGdpProfiles: {
            enabled: true,
            starterBadgeEnabled: true,
            badgesEnabled: false,
          },
        });

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if not allowed by enterprise policy', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);
        updateHostConfig({
          devToolsGdpProfilesAvailability: {
            enabled: true,
            enterprisePolicyValue: Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED_WITHOUT_BADGES,
          },
        });

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate any badges if `GetProfile` call returns null', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, null);
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('only starter badge', () => {
      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one',
         async () => {
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: null,
             isEligible: true,
           });
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(universe.gdpClient, []);

           await universe.userBadges.initialize();

           await assertActiveBadges({
             userBadges: universe.userBadges,
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one, even if awarded badges check fails',
         async () => {
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: null,
             isEligible: true,
           });
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(universe.gdpClient, null);

           await universe.userBadges.initialize();

           await assertActiveBadges({
             userBadges: universe.userBadges,
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should activate only the starter badge if the user has a GDP profile and the receive badges setting is off',
         async () => {
           setReceiveBadgesSetting(universe.settings, false);
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(universe.gdpClient, []);

           await universe.userBadges.initialize();

           await assertActiveBadges({
             userBadges: universe.userBadges,
             clock,
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the starter badge if it was awarded before', async () => {
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, ['badges/starter-test-badge']);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if the starter badge kill-switch is on', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);
        updateHostConfig({
          devToolsGdpProfiles: {
            enabled: true,
            badgesEnabled: true,
            starterBadgeEnabled: false,
          },
        });

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: true,
          shouldStarterBadgeBeActive: false,
        });
      });
    });

    describe('all badges', () => {
      it('should activate starter and activity badges if the user has a GDP profile AND the receive badges setting is on AND they are not awarded before',
         async () => {
           setReceiveBadgesSetting(universe.settings, true);
           mockGdpClientGetProfile(universe.gdpClient, {
             profile: {name: 'names/profile-id'},
             isEligible: true,
           });
           mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
           mockGetAwardedBadgeNames(universe.gdpClient, []);

           await universe.userBadges.initialize();

           await assertActiveBadges({
             userBadges: universe.userBadges,
             clock,
             shouldActivityBadgeBeActive: true,
             shouldStarterBadgeBeActive: true,
           });
         });

      it('should not activate the activity badge if it was awarded before', async () => {
        setReceiveBadgesSetting(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: {name: 'names/profile-id'},
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, ['badges/test-badge']);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
      });
    });

    it('should deactivate activity based badges when receive badges setting turns to false', async () => {
      setReceiveBadgesSetting(universe.settings, true);
      mockGdpClientGetProfile(universe.gdpClient, {
        profile: {name: 'names/profile-id'},
        isEligible: true,
      });
      mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
      mockGetAwardedBadgeNames(universe.gdpClient, []);

      await universe.userBadges.initialize();
      await assertActiveBadges({
        userBadges: universe.userBadges,
        clock,
        shouldActivityBadgeBeActive: true,
        shouldStarterBadgeBeActive: true,
      });

      const waitForReconcileBadgesToFinish =
          expectCall(sinon.stub(universe.userBadges, 'reconcileBadgesFinishedForTest'));
      setReceiveBadgesSetting(universe.settings, false);
      await waitForReconcileBadgesToFinish;
      await assertActiveBadges({
        userBadges: universe.userBadges,
        clock,
        shouldActivityBadgeBeActive: false,
        shouldStarterBadgeBeActive: true,
      });
    });
  });

  describe('starter badge snooze and dismiss', () => {
    beforeEach(() => {
      setStarterBadgeSnoozeCount(universe.settings, 0);
      setStarterBadgeLastSnoozedTimestamp(universe.settings, 0);
      setStarterBadgeDismissed(universe.settings, false);
    });

    describe('snoozeStarterBadge', () => {
      it('should increment the snooze count and update the timestamp', () => {
        universe.userBadges.snoozeStarterBadge();
        assert.strictEqual(universe.settings.settingForTest('starter-badge-snooze-count').get(), 1);
        assert.strictEqual(universe.settings.settingForTest('starter-badge-last-snoozed-timestamp').get(), Date.now());
      });
    });

    describe('dismissStarterBadge', () => {
      it('should set the dismissed setting to true', () => {
        universe.userBadges.dismissStarterBadge();
        assert.isTrue(universe.settings.settingForTest('starter-badge-dismissed').get());
      });
    });

    describe('reconcileBadges', () => {
      it('should not activate the starter badge if it has been dismissed', async () => {
        setStarterBadgeDismissed(universe.settings, true);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if it was snoozed recently', async () => {
        setStarterBadgeLastSnoozedTimestamp(universe.settings, NOW - 500);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should not activate the starter badge if the max snooze count has been reached', async () => {
        setStarterBadgeSnoozeCount(universe.settings, 3);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: false,
        });
      });

      it('should activate the starter badge if the snooze period has passed', async () => {
        setStarterBadgeLastSnoozedTimestamp(universe.settings, NOW - TWO_DAYS);
        mockGdpClientGetProfile(universe.gdpClient, {
          profile: null,
          isEligible: true,
        });
        mockGetSyncInformation(inspectorFrontendHost, {accountEmail: 'test@test.com', isSyncActive: false});
        mockGetAwardedBadgeNames(universe.gdpClient, []);

        await universe.userBadges.initialize();

        await assertActiveBadges({
          userBadges: universe.userBadges,
          clock,
          shouldActivityBadgeBeActive: false,
          shouldStarterBadgeBeActive: true,
        });
      });
    });

    describe('onTriggerBadge', () => {
      it('should not award the starter badge if it has been dismissed', async () => {
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        setStarterBadgeDismissed(universe.settings, true);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);
        const badgeTriggeredSpy = sinon.spy();
        await universe.userBadges.initialize();
        universe.userBadges.addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should not award the starter badge if it was snoozed recently', async () => {
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        setStarterBadgeLastSnoozedTimestamp(universe.settings, NOW - 500);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, null);
        const badgeTriggeredSpy = sinon.spy();
        await universe.userBadges.initialize();
        universe.userBadges.addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredSpy);

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);

        sinon.assert.notCalled(createAwardStub);
        sinon.assert.notCalled(badgeTriggeredSpy);
      });

      it('should award the starter badge if the snooze period has passed', async () => {
        setStarterBadgeLastSnoozedTimestamp(universe.settings, NOW - TWO_DAYS);
        setUpEnvironmentForActivatedBadges(universe.settings, universe.gdpClient, inspectorFrontendHost);
        const createAwardStub = stubGdpClientCreateAward(universe.gdpClient, 'test/test-badge');
        await universe.userBadges.initialize();
        const badgeTriggeredPromise = universe.userBadges.once(Badges.Events.BADGE_TRIGGERED);

        universe.userBadges.recordAction(Badges.BadgeAction.CSS_RULE_MODIFIED);
        await clock.tickAsync(DELAY_BEFORE_TRIGGER);
        await badgeTriggeredPromise;

        sinon.assert.calledOnce(createAwardStub);
      });
    });
  });
});
