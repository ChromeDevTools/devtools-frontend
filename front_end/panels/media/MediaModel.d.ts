import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
export interface PlayerEvent extends Protocol.Media.PlayerEvent {
    value: string;
    displayTimestamp: string;
    event: string;
}
export declare const enum Events {
    PLAYER_PROPERTIES_CHANGED = "PlayerPropertiesChanged",
    PLAYER_EVENTS_ADDED = "PlayerEventsAdded",
    PLAYER_MESSAGES_LOGGED = "PlayerMessagesLogged",
    PLAYER_ERRORS_RAISED = "PlayerErrorsRaised",
    PLAYER_CREATED = "PlayerCreated"
}
export interface EventTypes {
    [Events.PLAYER_PROPERTIES_CHANGED]: Protocol.Media.PlayerPropertiesChangedEvent;
    [Events.PLAYER_EVENTS_ADDED]: Protocol.Media.PlayerEventsAddedEvent;
    [Events.PLAYER_MESSAGES_LOGGED]: Protocol.Media.PlayerMessagesLoggedEvent;
    [Events.PLAYER_ERRORS_RAISED]: Protocol.Media.PlayerErrorsRaisedEvent;
    [Events.PLAYER_CREATED]: Protocol.Media.Player;
}
export declare class MediaModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.MediaDispatcher {
    private enabled;
    private readonly agent;
    constructor(target: SDK.Target.Target);
    resumeModel(): Promise<void>;
    ensureEnabled(): void;
    playerPropertiesChanged(event: Protocol.Media.PlayerPropertiesChangedEvent): void;
    playerEventsAdded(event: Protocol.Media.PlayerEventsAddedEvent): void;
    playerMessagesLogged(event: Protocol.Media.PlayerMessagesLoggedEvent): void;
    playerErrorsRaised(event: Protocol.Media.PlayerErrorsRaisedEvent): void;
    playerCreated({ player }: Protocol.Media.PlayerCreatedEvent): void;
}
