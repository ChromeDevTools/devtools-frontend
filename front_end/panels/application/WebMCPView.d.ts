import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface FilterState {
    text: string;
    toolTypes?: {
        imperative?: boolean;
        declarative?: boolean;
    };
    statusTypes?: {
        success?: boolean;
        error?: boolean;
        pending?: boolean;
    };
}
export interface FilterMenuButton {
    button: UI.Toolbar.ToolbarMenuButton;
    setCount: (count: number) => void;
}
export interface FilterMenuButtons {
    toolTypes: FilterMenuButton;
    statusTypes: FilterMenuButton;
}
export interface ViewInput {
    tools: Protocol.WebMCP.Tool[];
    filters: FilterState;
    filterButtons: FilterMenuButtons;
    onClearLogClick: () => void;
    onFilterChange: (filters: FilterState) => void;
    toolCalls: SDK.WebMCPModel.Call[];
}
export declare function filterToolCalls(toolCalls: SDK.WebMCPModel.Call[], filterState: FilterState): SDK.WebMCPModel.Call[];
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class WebMCPView extends UI.Widget.VBox {
    #private;
    static createFilterButtons(onToolTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void, onStatusTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void): FilterMenuButtons;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
}
