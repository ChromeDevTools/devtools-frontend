// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';

import * as Badges from './badges.js';
class MockActivityBadge extends Badges.Badge {
  override name = 'badges/test-badge';
  override title = 'test-badge-title';
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

function mockGdpClientGetProfile(profile: Host.GdpClient.Profile|null): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'getProfile').resolves(profile);
}

function mockIsEligibleToCreateProfile(eligible: boolean): void {
  sinon.stub(Host.GdpClient.GdpClient.instance(), 'isEligibleToCreateProfile').resolves(eligible);
}

function setReceiveBadgesSetting(value: boolean) {
  Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges').set(value);
}

function setUpEnvironmentForActivatedBadges(): void {
  setReceiveBadgesSetting(true);
  mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});
  mockGdpClientGetProfile({name: 'names/profile-id'});
  mockIsEligibleToCreateProfile(true);
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
    Object.assign(Badges.UserBadges.BADGE_REGISTRY, MOCK_BADGE_REGISTRY);
    Badges.UserBadges.instance({forceNew: true});
  });

  it('should dispatch a badge triggered event when a badge is triggered for the first time', async () => {
    setUpEnvironmentForActivatedBadges();
    const badgeTriggeredEventHandlerStub = sinon.stub();
    await Badges.UserBadges.instance().initialize();
    Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredEventHandlerStub);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    sinon.assert.calledOnce(badgeTriggeredEventHandlerStub);
  });

  it('should only dispatch a badge triggered event once when the same action is recorded multiple times', async () => {
    setUpEnvironmentForActivatedBadges();
    const badgeTriggeredEventHandlerStub = sinon.stub();
    await Badges.UserBadges.instance().initialize();
    Badges.UserBadges.instance().addEventListener(Badges.Events.BADGE_TRIGGERED, badgeTriggeredEventHandlerStub);

    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);

    sinon.assert.calledOnce(badgeTriggeredEventHandlerStub);
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
    });

    describe('only starter badge', () => {
      it('should activate only the starter badge if the user does not have a GDP profile and is eligible for one',
         async () => {
           mockIsEligibleToCreateProfile(true);
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});

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

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: false,
             shouldStarterBadgeBeActive: true,
           });
         });
    });

    describe('all badges', () => {
      it('should activate starter and activity badges if the user has a GDP profile and the receive badges setting is on',
         async () => {
           setReceiveBadgesSetting(true);
           mockIsEligibleToCreateProfile(true);
           mockGdpClientGetProfile({name: 'profiles/test'});
           mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});

           await Badges.UserBadges.instance().initialize();

           assertActiveBadges({
             shouldActivityBadgeBeActive: true,
             shouldStarterBadgeBeActive: true,
           });
         });
    });

    it('should deactivate activity based badges when receive badges setting turns to false', async () => {
      setReceiveBadgesSetting(true);
      mockIsEligibleToCreateProfile(true);
      mockGdpClientGetProfile({name: 'profiles/test'});
      mockGetSyncInformation({accountEmail: 'test@test.com', isSyncActive: false});

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
});
