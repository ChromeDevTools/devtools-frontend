import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type BackgroundServiceModel } from './BackgroundServiceModel.js';
export interface ViewInput {
    serviceName: Protocol.BackgroundService.ServiceName;
    isRecording: boolean;
    selectedEvent: EventData | null;
    events: EventData[];
    onClear: () => void;
    onSave: () => void;
    toggleRecording: () => void;
    onSelectEvent: (event: EventData) => void;
    onOriginCheckboxChanged: (event: Event) => void;
    onStorageKeyCheckboxChanged: (event: Event) => void;
    isOriginCheckboxChecked: boolean;
    isStorageKeyCheckboxChecked: boolean;
    createLearnMoreLink: () => Platform.DevToolsPath.UrlString;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class BackgroundServiceView extends UI.Widget.Widget {
    #private;
    static getUIString(serviceName: string): string;
    constructor(element?: HTMLElement, view?: View);
    get serviceName(): Protocol.BackgroundService.ServiceName | undefined;
    set serviceName(serviceName: Protocol.BackgroundService.ServiceName);
    get model(): BackgroundServiceModel | undefined;
    set model(model: BackgroundServiceModel);
    wasShown(): void;
    /**
     * Displays all available events in the grid.
     */
    private refreshView;
    /**
     * Clears the grid and panel.
     */
    private clearView;
    /**
     * Called when the `Toggle Record` button is clicked.
     */
    toggleRecording(): void;
    /**
     * Called when the `Clear` button is clicked.
     */
    private clearEvents;
    private onRecordingStateChanged;
    private onEventReceived;
    private onOriginChanged;
    private onStorageKeyChanged;
    private addEvent;
    /**
     * Creates the data object to pass to the DataGrid Node.
     */
    private createEventData;
    /**
     * Filtration function to know whether event should be shown or not.
     */
    private acceptEvent;
    private createLearnMoreLink;
    performUpdate(): void;
    /**
     * Saves all currently displayed events in a file (JSON format).
     */
    private saveToFile;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export interface RecordingState {
    isRecording: boolean;
    serviceName: Protocol.BackgroundService.ServiceName;
}
export interface EventData {
    id: number;
    timestamp: string;
    origin: string;
    'storage-key': string;
    'sw-scope': string;
    'event-name': string;
    'instance-id': string;
    eventMetadata: Protocol.BackgroundService.EventMetadata[];
}
export {};
