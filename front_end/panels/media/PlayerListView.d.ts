import '../../ui/kit/kit.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { MainView, TriggerDispatcher } from './MainView.js';
import type { PlayerEvent } from './MediaModel.js';
interface PlayerStatus {
    playerTitle: string;
    frameTitle: string;
    playerID: string;
    exists: boolean;
    playing: boolean;
    titleEdited: boolean;
    iconName: string;
}
export interface ViewInput {
    players: PlayerStatus[];
    selectedPlayerID: string | null;
    onPlayerClick: (playerID: string) => void;
    onPlayerContextMenu: (playerID: string, event: Event) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare class PlayerListView extends UI.Widget.VBox implements TriggerDispatcher {
    #private;
    private readonly playerStatuses;
    private readonly playerEntriesWithHostnameFrameTitle;
    private readonly mainContainer;
    private currentlySelectedPlayerID;
    constructor(mainContainer: MainView, view?: View);
    performUpdate(): void;
    selectPlayerById(playerID: string): void;
    private selectPlayer;
    private rightClickPlayer;
    private setMediaElementFrameTitle;
    private setMediaElementPlayerTitle;
    private setMediaElementPlayerIcon;
    private formatAndEvaluate;
    addMediaElementItem(playerID: string): void;
    deletePlayer(playerID: string): void;
    onEvent(playerID: string, event: PlayerEvent): void;
    onProperty(playerID: string, property: Protocol.Media.PlayerProperty): void;
    onError(_playerID: string, _error: Protocol.Media.PlayerError): void;
    onMessage(_playerID: string, _message: Protocol.Media.PlayerMessage): void;
}
export {};
