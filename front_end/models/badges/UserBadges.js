// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import { AiExplorerBadge } from './AiExplorerBadge.js';
import { CodeWhispererBadge } from './CodeWhispererBadge.js';
import { DOMDetectiveBadge } from './DOMDetectiveBadge.js';
import { SpeedsterBadge } from './SpeedsterBadge.js';
import { StarterBadge } from './StarterBadge.js';
const SNOOZE_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SNOOZE_COUNT = 3;
const DELAY_BEFORE_TRIGGER = 1500;
let userBadgesInstance = undefined;
export class UserBadges extends Common.ObjectWrapper.ObjectWrapper {
    #badgeActionEventTarget = new Common.ObjectWrapper.ObjectWrapper();
    #receiveBadgesSetting;
    #allBadges;
    #starterBadgeSnoozeCount;
    #starterBadgeLastSnoozedTimestamp;
    #starterBadgeDismissed;
    static BADGE_REGISTRY = [
        StarterBadge,
        SpeedsterBadge,
        DOMDetectiveBadge,
        CodeWhispererBadge,
        AiExplorerBadge,
    ];
    constructor() {
        super();
        this.#receiveBadgesSetting = Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges');
        if (!Host.GdpClient.isBadgesEnabled()) {
            this.#receiveBadgesSetting.set(false);
        }
        this.#receiveBadgesSetting.addChangeListener(this.#reconcileBadges, this);
        this.#starterBadgeSnoozeCount = Common.Settings.Settings.instance().createSetting('starter-badge-snooze-count', 0, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
        this.#starterBadgeLastSnoozedTimestamp = Common.Settings.Settings.instance().createSetting('starter-badge-last-snoozed-timestamp', 0, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
        this.#starterBadgeDismissed = Common.Settings.Settings.instance().createSetting('starter-badge-dismissed', false, "Synced" /* Common.Settings.SettingStorageType.SYNCED */);
        this.#allBadges = UserBadges.BADGE_REGISTRY.map(badgeCtor => new badgeCtor({
            onTriggerBadge: this.#onTriggerBadge.bind(this),
            badgeActionEventTarget: this.#badgeActionEventTarget,
        }));
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!userBadgesInstance || forceNew) {
            userBadgesInstance = new UserBadges();
        }
        return userBadgesInstance;
    }
    async initialize() {
        return await this.#reconcileBadges();
    }
    snoozeStarterBadge() {
        this.#starterBadgeSnoozeCount.set(this.#starterBadgeSnoozeCount.get() + 1);
        this.#starterBadgeLastSnoozedTimestamp.set(Date.now());
    }
    dismissStarterBadge() {
        this.#starterBadgeDismissed.set(true);
    }
    recordAction(action) {
        // `Common.ObjectWrapper.ObjectWrapper` does not allow passing unions to
        // the `dispatchEventToListeners` and `action` in this case is a union.
        // We want to support listening to specific actions here, that's why we suppress
        // the TypeScript errors. This is safe to do so since every `BadgeAction`
        // is a valid event type and all events are typed as void.
        // @ts-expect-error
        this.#badgeActionEventTarget.dispatchEventToListeners(action);
    }
    async #resolveBadgeTriggerReason(badge) {
        if (!badge.isStarterBadge) {
            return "Award" /* BadgeTriggerReason.AWARD */;
        }
        const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
        // The `getProfile` call failed and returned a `null`.
        // For that case, we don't show anything.
        if (!getProfileResponse) {
            return;
        }
        const hasGdpProfile = Boolean(getProfileResponse.profile);
        const receiveBadgesSettingEnabled = Boolean(this.#receiveBadgesSetting.get());
        // If the user already has a GDP profile and the receive badges setting enabled,
        // starter badge behaves as if it's an activity based badge.
        if (hasGdpProfile && receiveBadgesSettingEnabled) {
            return "Award" /* BadgeTriggerReason.AWARD */;
        }
        if (this.#isStarterBadgeDismissed() || this.#isStarterBadgeSnoozed()) {
            return;
        }
        // If the user already has a GDP profile and the receive badges setting disabled,
        // starter badge behaves as a nudge for opting into receiving badges.
        if (hasGdpProfile && !receiveBadgesSettingEnabled) {
            return "StarterBadgeSettingsNudge" /* BadgeTriggerReason.STARTER_BADGE_SETTINGS_NUDGE */;
        }
        // The user does not have a GDP profile, starter badge acts as a nudge for creating a GDP profile.
        return "StarterBadgeProfileNudge" /* BadgeTriggerReason.STARTER_BADGE_PROFILE_NUDGE */;
    }
    async #onTriggerBadge(badge, opts) {
        const triggerTime = Date.now();
        const reason = await this.#resolveBadgeTriggerReason(badge);
        if (!reason) {
            return;
        }
        if (reason === "Award" /* BadgeTriggerReason.AWARD */) {
            const result = await Host.GdpClient.GdpClient.instance().createAward({ name: badge.name });
            if (!result) {
                return;
            }
        }
        const timeElapsedAfterTriggerCall = Date.now() - triggerTime;
        // We want to add exactly 1.5 second delay between the trigger action & the notification.
        const delay = opts?.immediate ? 0 : Math.max(DELAY_BEFORE_TRIGGER - timeElapsedAfterTriggerCall, 0);
        setTimeout(() => {
            this.dispatchEventToListeners("BadgeTriggered" /* Events.BADGE_TRIGGERED */, { badge, reason });
        }, delay);
    }
    #deactivateAllBadges() {
        this.#allBadges.forEach(badge => {
            badge.deactivate();
        });
    }
    #isStarterBadgeDismissed() {
        return this.#starterBadgeDismissed.get();
    }
    #isStarterBadgeSnoozed() {
        const snoozeCount = this.#starterBadgeSnoozeCount.get();
        const lastSnoozed = this.#starterBadgeLastSnoozedTimestamp.get();
        const snoozedRecently = (Date.now() - lastSnoozed) < SNOOZE_TIME_MS;
        return snoozeCount >= MAX_SNOOZE_COUNT || snoozedRecently;
    }
    async #reconcileBadges() {
        const syncInfo = await new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
        // If the user is not signed in, do not activate any badges.
        if (!syncInfo.accountEmail) {
            this.#deactivateAllBadges();
            return;
        }
        if (!Host.GdpClient.isGdpProfilesAvailable() || !Host.GdpClient.isBadgesEnabled()) {
            this.#deactivateAllBadges();
            return;
        }
        const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
        if (!getProfileResponse) {
            this.#deactivateAllBadges();
            return;
        }
        const hasGdpProfile = Boolean(getProfileResponse.profile);
        const isEligibleToCreateProfile = getProfileResponse.isEligible;
        // User does not have a GDP profile & not eligible to create one.
        // So, we don't activate any badges for them.
        if (!hasGdpProfile && !isEligibleToCreateProfile) {
            this.#deactivateAllBadges();
            return;
        }
        let awardedBadgeNames = null;
        if (hasGdpProfile) {
            awardedBadgeNames = await Host.GdpClient.GdpClient.instance().getAwardedBadgeNames({ names: this.#allBadges.map(badge => badge.name) });
            // This is a conservative approach. We bail out if `awardedBadgeNames` is null
            // when there is a profile to prevent a negative user experience.
            //
            // A failure here (e.g., from a typo in a badge name) could cause us to
            // re-trigger the "Receive badges" nudge for a user who has already earned the
            // starter badge and opted out of receiving badges.
            //
            // The trade-off is, we silently failing to enable badge mechanism rather than annoying the user.
            if (!awardedBadgeNames) {
                this.#deactivateAllBadges();
                return;
            }
        }
        const receiveBadgesSettingEnabled = Boolean(this.#receiveBadgesSetting.get());
        for (const badge of this.#allBadges) {
            if (awardedBadgeNames?.has(badge.name)) {
                badge.deactivate();
                continue;
            }
            const shouldActivateStarterBadge = badge.isStarterBadge && isEligibleToCreateProfile &&
                Host.GdpClient.isStarterBadgeEnabled() && !this.#isStarterBadgeDismissed() && !this.#isStarterBadgeSnoozed();
            const shouldActivateActivityBasedBadge = !badge.isStarterBadge && hasGdpProfile && receiveBadgesSettingEnabled;
            if (shouldActivateStarterBadge || shouldActivateActivityBasedBadge) {
                badge.activate();
            }
            else {
                badge.deactivate();
            }
        }
        this.reconcileBadgesFinishedForTest();
    }
    reconcileBadgesFinishedForTest() {
    }
    isReceiveBadgesSettingEnabled() {
        return Boolean(this.#receiveBadgesSetting.get());
    }
}
//# sourceMappingURL=UserBadges.js.map