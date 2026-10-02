import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { type EditorSelectedEvent, type SourceLocation } from './TabbedEditorContainer.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
export interface ViewInput {
    searchProvider: UI.SearchableView.Searchable;
    replaceProvider: UI.SearchableView.Replaceable;
    isSearchReplaceable: boolean;
    scriptViewToolbarItems: LitTemplate;
    isNavigatorSidebarOpen: boolean;
    isDebuggerSidebarOpen: boolean;
    isDebuggerSidebarButtonEnabled: boolean;
    isVertical: boolean;
    isInWrapper: boolean;
    isTraceApp: boolean;
    onToggleNavigatorSidebar?: () => void;
    onToggleDebuggerSidebar?: () => void;
    breakpointsActive: boolean;
    uiSourceCodes: ReadonlySet<Workspace.UISourceCode.UISourceCode>;
    sourceLocation?: SourceLocation;
    onEditorSelected: (event: EditorSelectedEvent) => void;
    onEditorClosed: (uiSourceCode: Workspace.UISourceCode.UISourceCode) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
declare const SourcesViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export declare class SourcesView extends SourcesViewBase implements UI.SearchableView.Searchable, UI.SearchableView.Replaceable {
    #private;
    private toolbarChangedListener;
    private searchView?;
    private searchConfig?;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    set onToggleNavigatorSidebar(callback: () => void);
    set onToggleDebuggerSidebar(callback: () => void);
    set isNavigatorSidebarOpen(isOpen: boolean);
    set isDebuggerSidebarOpen(isOpen: boolean);
    toggleDebuggerSidebarButtonEnabled(enabled: boolean): void;
    setLayoutMode(isVertical: boolean, isInWrapper: boolean): void;
    wasShown(): void;
    willHide(): void;
    searchableView(): UI.SearchableView.SearchableView | null;
    visibleView(): UI.Widget.Widget | null;
    currentSourceFrame(): UISourceCodeFrame | null;
    currentUISourceCode(): Workspace.UISourceCode.UISourceCode | null;
    private uiSourceCodeAdded;
    private addUISourceCode;
    private uiSourceCodeRemoved;
    private removeUISourceCodes;
    private projectRemoved;
    private updateScriptViewToolbarItems;
    showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean, omitHighlight?: boolean): Promise<void>;
    private editorClosed;
    private editorSelected;
    private removeToolbarChangedListener;
    private updateToolbarChangedListener;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
    replaceSelectionWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void;
    replaceAllWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void;
    showOutlineQuickOpen(): void;
    showGoToLineQuickOpen(): void;
    save(): void;
    saveAll(): void;
    private saveSourceFrame;
    toggleBreakpointsActiveState(active: boolean): void;
}
export declare const enum Events {
    EDITOR_CLOSED = "EditorClosed",
    EDITOR_SELECTED = "EditorSelected"
}
export interface EditorClosedEvent {
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    wasSelected: boolean;
}
export interface EventTypes {
    [Events.EDITOR_CLOSED]: EditorClosedEvent;
    [Events.EDITOR_SELECTED]: Workspace.UISourceCode.UISourceCode;
}
export declare class SwitchFileActionDelegate implements UI.ActionRegistration.ActionDelegate {
    private static nextFile;
    handleAction(context: UI.Context.Context, _actionId: string): boolean;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export {};
