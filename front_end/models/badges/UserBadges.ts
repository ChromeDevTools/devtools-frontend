// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';

import type {Badge, BadgeAction, BadgeActionEvents, BadgeContext} from './Badge.js';
import {SpeedsterBadge} from './SpeedsterBadge.js';
import {StarterBadge} from './StarterBadge.js';

type BadgeClass = new (badgeContext: BadgeContext) => Badge;

export const enum Events {
  BADGE_TRIGGERED = 'BadgeTriggered',
}

export interface EventTypes {
  [Events.BADGE_TRIGGERED]: Badge;
}

let userBadgesInstance: UserBadges|undefined = undefined;
export class UserBadges extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #badgeActionEventTarget = new Common.ObjectWrapper.ObjectWrapper<BadgeActionEvents>();

  #receiveBadgesSetting?: Common.Settings.Setting<Boolean>;
  #allBadges: Badge[];

  static readonly BADGE_REGISTRY: BadgeClass[] = [
    StarterBadge,
    SpeedsterBadge,
  ];

  private constructor() {
    super();

    this.#receiveBadgesSetting = Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges');
    this.#receiveBadgesSetting.addChangeListener(this.#reconcileBadges, this);

    this.#allBadges =
        UserBadges.BADGE_REGISTRY.map(badgeCtor => new badgeCtor({
                                        dispatchBadgeTriggeredEvent: this.#dispatchBadgeTriggeredEvent.bind(this),
                                        badgeActionEventTarget: this.#badgeActionEventTarget,
                                      }));
  }

  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): UserBadges {
    if (!userBadgesInstance || forceNew) {
      userBadgesInstance = new UserBadges();
    }
    return userBadgesInstance;
  }

  async initialize(): Promise<void> {
    return await this.#reconcileBadges();
  }

  recordAction(action: BadgeAction): void {
    // `Common.ObjectWrapper.ObjectWrapper` does not allow passing unions to
    // the `dispatchEventToListeners` and `action` in this case is a union.
    // We want to support listening to specific actions here, that's why we suppress
    // the TypeScript errors. This is safe to do so since every `BadgeAction`
    // is a valid event type and all events are typed as void.
    // @ts-expect-error
    this.#badgeActionEventTarget.dispatchEventToListeners(action);
  }

  #dispatchBadgeTriggeredEvent(badge: Badge): void {
    this.dispatchEventToListeners(Events.BADGE_TRIGGERED, badge);
  }

  #deactivateAllBadges(): void {
    this.#allBadges.forEach(badge => {
      badge.deactivate();
    });
  }

  // TODO(ergunsh): Implement starter badge dismissal, snooze count & timestamp checks.
  // TODO(ergunsh): Implement checking for previously awarded badges.
  async #reconcileBadges(): Promise<void> {
    const syncInfo = await new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
        resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
    // If the user is not signed in, do not activate any badges.
    if (!syncInfo.accountEmail) {
      this.#deactivateAllBadges();
      return;
    }

    const [gdpProfile, isEligibleToCreateProfile] = await Promise.all([
      Host.GdpClient.GdpClient.instance().getProfile(),
      Host.GdpClient.GdpClient.instance().isEligibleToCreateProfile(),
    ]);

    // User does not have a GDP profile & not eligible to create one.
    // So, we don't activate any badges for them.
    if (!gdpProfile && !isEligibleToCreateProfile) {
      this.#deactivateAllBadges();
      return;
    }

    const receiveBadgesSettingEnabled = Boolean(this.#receiveBadgesSetting?.get());
    for (const badge of this.#allBadges) {
      const shouldActivateStarterBadge = badge.isStarterBadge && isEligibleToCreateProfile;
      const shouldActivateActivityBasedBadge =
          !badge.isStarterBadge && Boolean(gdpProfile) && receiveBadgesSettingEnabled;
      if (shouldActivateStarterBadge || shouldActivateActivityBasedBadge) {
        badge.activate();
      } else {
        badge.deactivate();
      }
    }

    this.reconcileBadgesFinishedForTest();
  }

  reconcileBadgesFinishedForTest(): void {
  }
}
