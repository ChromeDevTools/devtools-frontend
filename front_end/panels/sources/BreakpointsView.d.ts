import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface BreakpointsViewData {
    breakpointsActive: boolean;
    pauseOnUncaughtExceptions: boolean;
    pauseOnCaughtExceptions: boolean;
    groups: BreakpointGroup[];
}
export interface BreakpointGroup {
    name: string;
    url: Platform.DevToolsPath.UrlString;
    editable: boolean;
    expanded: boolean;
    breakpointItems: BreakpointItem[];
}
export interface BreakpointItem {
    id: string;
    location: string;
    codeSnippet: string;
    isHit: boolean;
    status: BreakpointStatus;
    type: SDK.DebuggerModel.BreakpointType;
    hoverText?: string;
}
export declare const enum BreakpointStatus {
    ENABLED = "ENABLED",
    DISABLED = "DISABLED",
    INDETERMINATE = "INDETERMINATE"
}
export declare class BreakpointsSidebarController implements UI.ContextFlavorListener.ContextFlavorListener {
    #private;
    private constructor();
    static instance({ forceNew, breakpointManager, settings }?: {
        forceNew: boolean | null;
        breakpointManager: Breakpoints.BreakpointManager.BreakpointManager;
        settings: Common.Settings.Settings;
    }): BreakpointsSidebarController;
    static removeInstance(): void;
    flavorChanged(_object: Object | null): void;
    breakpointEditFinished(breakpoint: Breakpoints.BreakpointManager.Breakpoint | null, edited: boolean): void;
    breakpointStateChanged(breakpointItem: BreakpointItem, checked: boolean): void;
    breakpointEdited(breakpointItem: BreakpointItem, editButtonClicked: boolean): Promise<void>;
    breakpointsRemoved(breakpointItems: BreakpointItem[]): void;
    expandedStateChanged(url: Platform.DevToolsPath.UrlString, expanded: boolean): void;
    jumpToSource(breakpointItem: BreakpointItem): Promise<void>;
    setPauseOnUncaughtExceptions(value: boolean): void;
    setPauseOnCaughtExceptions(value: boolean): void;
    update(): Promise<void>;
    getUpdatedBreakpointViewData(): Promise<BreakpointsViewData>;
}
/**
 * These properties should really be part of {@link BreakpointItem}, but for migrating
 * to the UI eng vision, we use a Map<BreakpointItemId, BreakpointItemDetails>.
 */
export interface BreakpointItemDetails {
    itemDescription: string;
    codeSnippet: string;
    codeSnippetTooltip: string | undefined;
}
export interface BreakpointsViewInput {
    clickHandler: (event: Event) => void;
    keyDownHandler: (event: KeyboardEvent) => Promise<void>;
    pauseOnUncaughtExceptions: boolean;
    onPauseOnUncaughtExceptionsStateChanged: (event: Event) => void;
    pauseOnCaughtExceptions: boolean;
    onPauseOnCaughtExceptionsStateChanged: (event: Event) => void;
    breakpointGroups: BreakpointGroup[];
    breakpointsActive: boolean;
    groupContextMenuHandler: (group: BreakpointGroup, event: Event) => void;
    groupToggleHandler: (group: BreakpointGroup, event: Event) => void;
    groupClickHandler: (event: Event) => void;
    groupCheckboxToggled: (group: BreakpointGroup, event: Event) => void;
    urlToDifferentiatingPath: Map<Platform.DevToolsPath.UrlString, string>;
    removeAllBreakpointsInFileClickHandler: (items: BreakpointItem[], event: Event) => void;
    itemDetails: Map<string, BreakpointItemDetails>;
    itemContextMenuHandler: (item: BreakpointItem, editable: boolean, event: Event) => void;
    itemClickHandler: (event: Event) => void;
    itemSnippetClickHandler: (item: BreakpointItem, event: Event) => void;
    itemCheckboxToggled: (item: BreakpointItem, event: Event) => void;
    itemEditClickHandler: (item: BreakpointItem, event: Event) => void;
    itemRemoveClickHandler: (item: BreakpointItem, event: Event) => void;
}
export type View = (input: BreakpointsViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class BreakpointsView extends UI.Widget.VBox {
    #private;
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): BreakpointsView;
    constructor(element: HTMLElement | undefined, view?: View);
    set data(data: BreakpointsViewData);
    wasShown(): void;
    performUpdate(): void;
}
