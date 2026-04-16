import '../../ui/components/icon_button/icon_button.js';
import '../../ui/components/lists/lists.js';
import '../../ui/components/node_text/node_text.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/legacy/legacy.js';
import type { JSONSchema7 } from 'json-schema';
import * as SDK from '../../core/sdk/sdk.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as WebMCP from '../../models/web_mcp/web_mcp.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ProtocolMonitor from '../protocol_monitor/protocol_monitor.js';
export interface FilterState {
    text: string;
    toolTypes?: {
        imperative?: boolean;
        declarative?: boolean;
    };
    statusTypes?: {
        completed?: boolean;
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
    tools: WebMCP.WebMCPModel.Tool[];
    selectedTool: WebMCP.WebMCPModel.Tool | null;
    onToolSelect: (tool: WebMCP.WebMCPModel.Tool | null) => void;
    selectedCall: WebMCP.WebMCPModel.Call | null;
    onCallSelect: (call: WebMCP.WebMCPModel.Call | null) => void;
    filters: FilterState;
    filterButtons: FilterMenuButtons;
    onClearLogClick: () => void;
    onFilterChange: (filters: FilterState) => void;
    toolCalls: WebMCP.WebMCPModel.Call[];
}
export declare function filterToolCalls(toolCalls: WebMCP.WebMCPModel.Call[], filterState: FilterState): WebMCP.WebMCPModel.Call[];
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare function parsePayload(payload?: unknown): {
    valueObject: unknown;
    valueString: string | undefined;
};
export declare const DEFAULT_VIEW: View;
export declare class WebMCPView extends UI.Widget.VBox {
    #private;
    static createFilterButtons(onToolTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void, onStatusTypesClick: (contextMenu: UI.ContextMenu.ContextMenu) => void): FilterMenuButtons;
    constructor(target?: HTMLElement, view?: View);
    performUpdate(): void;
}
export interface PayloadViewInput {
    valueObject?: unknown;
    valueString?: string;
    errorText?: string;
    exceptionDetails?: WebMCP.WebMCPModel.ExceptionDetails;
}
export declare const PAYLOAD_DEFAULT_VIEW: (input: PayloadViewInput, output: object, target: HTMLElement) => void;
export declare class PayloadWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: PayloadViewInput, output: object, target: HTMLElement) => void);
    set valueObject(valueObject: unknown);
    get valueObject(): unknown;
    set valueString(valueString: string | undefined);
    get valueString(): string | undefined;
    set errorText(errorText: string | undefined);
    get errorText(): string | undefined;
    set exceptionDetails(exceptionDetailsPromise: Promise<WebMCP.WebMCPModel.ExceptionDetails | undefined> | undefined);
    get exceptionDetails(): Promise<WebMCP.WebMCPModel.ExceptionDetails | undefined> | undefined;
    wasShown(): void;
    performUpdate(): void;
}
export interface ToolDetailsViewInput {
    tool: WebMCP.WebMCPModel.Tool | null | undefined;
    origin: SDK.DOMModel.DOMNode | StackTrace.StackTrace.StackTrace | undefined;
    highlightNode: (node: SDK.DOMModel.DOMNode) => void;
    clearHighlight: () => void;
    revealNode: (node: SDK.DOMModel.DOMNode) => void;
}
declare const TOOL_DETAILS_VIEW: (input: ToolDetailsViewInput, output: undefined, target: HTMLElement) => void;
export declare class ToolDetailsWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: typeof TOOL_DETAILS_VIEW);
    set tool(tool: WebMCP.WebMCPModel.Tool | null | undefined);
    get tool(): WebMCP.WebMCPModel.Tool | null | undefined;
    performUpdate(): void;
    wasShown(): void;
}
export interface ParsedToolSchema {
    parameters: ProtocolMonitor.JSONEditor.Parameter[];
    typesByName: Map<string, ProtocolMonitor.JSONEditor.Parameter[]>;
    enumsByName: Map<string, Record<string, string>>;
}
export declare function parseToolSchema(schema: JSONSchema7): ParsedToolSchema;
export {};
