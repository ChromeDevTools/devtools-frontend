import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { MediaModel, type PlayerEvent } from './MediaModel.js';
import { PlayerDetailView } from './PlayerDetailView.js';
import { PlayerListView } from './PlayerListView.js';
export interface ViewInput {
    sidebar: PlayerListView;
    activePanel?: PlayerDetailView;
    hasPlayers: boolean;
}
export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
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
export declare class MainView extends UI.Panel.Panel implements SDK.TargetManager.SDKModelObserver<MediaModel> {
    #private;
    private detailPanels;
    private deletedPlayers;
    private readonly downloadStore;
    private readonly sidebar;
    constructor(downloadStore?: PlayerDataDownloadManager, view?: View);
    performUpdate(): void;
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
