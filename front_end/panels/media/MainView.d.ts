import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { MediaModel, type PlayerEvent } from './MediaModel.js';
export interface TriggerHandler {
    onProperty(property: Protocol.Media.PlayerProperty): void;
    onError(error: Protocol.Media.PlayerError): void;
    onMessage(message: Protocol.Media.PlayerMessage): void;
    onEvent(event: PlayerEvent): void;
}
export interface TriggerDispatcher {
    onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
    onError(playerID: string, error: Protocol.Media.PlayerError): void;
    onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void;
    onEvent(playerID: string, event: PlayerEvent): void;
}
export declare class PlayerDataDownloadManager implements TriggerDispatcher {
    private readonly playerDataCollection;
    constructor();
    addPlayer(playerID: string): void;
    onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
    onError(playerID: string, error: Protocol.Media.PlayerError): void;
    onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void;
    onEvent(playerID: string, event: PlayerEvent): void;
    exportPlayerData(playerID: string): {
        properties: Map<string, string>;
        messages: Protocol.Media.PlayerMessage[];
        events: PlayerEvent[];
        errors: Protocol.Media.PlayerError[];
    };
    deletePlayer(playerID: string): void;
}
export declare class MainView extends UI.Panel.PanelWithSidebar implements SDK.TargetManager.SDKModelObserver<MediaModel> {
    #private;
    private detailPanels;
    private deletedPlayers;
    private readonly downloadStore;
    private readonly sidebar;
    constructor(downloadStore?: PlayerDataDownloadManager);
    renderMainPanel(playerID: string): void;
    wasShown(): void;
    willHide(): void;
    modelAdded(model: MediaModel): void;
    modelRemoved(model: MediaModel): void;
    private addEventListeners;
    private removeEventListeners;
    private propertiesChanged;
    private eventsAdded;
    private messagesLogged;
    private errorsRaised;
    private shouldPropagate;
    onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
    onError(playerID: string, error: Protocol.Media.PlayerError): void;
    onMessage(playerID: string, message: Protocol.Media.PlayerMessage): void;
    onEvent(playerID: string, event: PlayerEvent): void;
    selectPlayerByDOMNodeId(domNodeId: Protocol.DOM.BackendNodeId): void;
    waitForInitialPlayers(): Promise<void>;
    private playerCreated;
    markPlayerForDeletion(playerID: string): void;
    markOtherPlayersForDeletion(playerID: string): void;
    exportPlayerData(playerID: string): void;
}
