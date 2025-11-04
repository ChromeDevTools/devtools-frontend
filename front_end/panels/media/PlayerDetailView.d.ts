import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { TriggerHandler } from './MainView.js';
import type { PlayerEvent } from './MediaModel.js';
export declare const enum PlayerDetailViewTabs {
    EVENTS = "events",
    PROPERTIES = "properties",
    MESSAGES = "messages",
    TIMELINE = "timeline"
}
export declare class PlayerDetailView extends UI.TabbedPane.TabbedPane implements TriggerHandler {
    private readonly eventView;
    private readonly propertyView;
    private readonly messageView;
    private readonly timelineView;
    constructor();
    onProperty(property: Protocol.Media.PlayerProperty): void;
    onError(error: Protocol.Media.PlayerError): void;
    onMessage(message: Protocol.Media.PlayerMessage): void;
    onEvent(event: PlayerEvent): void;
}
