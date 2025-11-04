import { Badge, BadgeAction } from './Badge.js';
export declare class AiExplorerBadge extends Badge {
    #private;
    readonly name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fai-explorer";
    readonly title = "AI Explorer";
    readonly jslogContext = "ai-explorer";
    readonly imageUri: string;
    readonly interestedActions: readonly [BadgeAction.STARTED_AI_CONVERSATION];
    handleAction(_action: BadgeAction): void;
}
