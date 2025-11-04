import * as Common from '../../core/common/common.js';
import type { Badge, BadgeAction, BadgeContext } from './Badge.js';
type BadgeClass = new (badgeContext: BadgeContext) => Badge;
export declare const enum Events {
    BADGE_TRIGGERED = "BadgeTriggered"
}
export interface EventTypes {
    [Events.BADGE_TRIGGERED]: Badge;
}
export declare class UserBadges extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    static readonly BADGE_REGISTRY: BadgeClass[];
    private constructor();
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): UserBadges;
    initialize(): Promise<void>;
    snoozeStarterBadge(): void;
    dismissStarterBadge(): void;
    recordAction(action: BadgeAction): void;
    reconcileBadgesFinishedForTest(): void;
    isReceiveBadgesSettingEnabled(): boolean;
}
export {};
