import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    messages: readonly SDK.NetworkRequest.EventSourceMessage[];
    filterSetting: Common.Settings.Setting<string>;
    onClear: () => void;
    onFilterChanged: (event: Event) => void;
    onRowContextMenu: (message: SDK.NetworkRequest.EventSourceMessage, event: MouseEvent) => void;
}
export type View = (input: ViewInput, output: unknown, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class EventSourceMessagesView extends UI.Widget.VBox {
    #private;
    private readonly request;
    private messageFilterSetting;
    private filterRegex;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: View);
    wasShown(): void;
    willHide(): void;
    private messageAdded;
    private messageFilter;
    private clearMessages;
    private onFilterChanged;
    private setFilter;
    private onRowContextMenu;
    performUpdate(): void;
}
