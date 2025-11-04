import * as Badges from '../../models/badges/badges.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface BadgeNotificationAction {
    label: string;
    jslogContext: string;
    title?: string;
    onClick: () => void;
}
export interface BadgeNotificationProperties {
    message: HTMLElement | string;
    jslogContext: string;
    imageUri: string;
    actions: BadgeNotificationAction[];
    isStarterBadge: boolean;
}
export interface ViewInput extends BadgeNotificationProperties {
    onDismissClick: () => void;
}
declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class BadgeNotification extends UI.Widget.Widget {
    #private;
    jslogContext: string;
    message: HTMLElement | string;
    imageUri: string;
    actions: BadgeNotificationAction[];
    isStarterBadge: boolean;
    constructor(element?: HTMLElement, view?: View);
    present(badge: Badges.Badge): Promise<void>;
    onDetach(): void;
    wasShown(): void;
    performUpdate(): void;
}
export {};
