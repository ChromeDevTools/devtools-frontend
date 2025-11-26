import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { TabbedEditorContainer, type TabbedEditorContainerDelegate } from './TabbedEditorContainer.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
declare const SourcesView_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class SourcesView extends SourcesView_base implements TabbedEditorContainerDelegate, UI.SearchableView.Searchable, UI.SearchableView.Replaceable {
    #private;
    private readonly sourceViewByUISourceCode;
    editorContainer: TabbedEditorContainer;
    private readonly historyManager;
    private toolbarChangedListener;
    private readonly focusedPlaceholderElement?;
    private searchView?;
    private searchConfig?;
    constructor();
    private placeholderElement;
    private addFileSystemClicked;
    static defaultUISourceCodeScores(): Map<Workspace.UISourceCode.UISourceCode, number>;
    leftToolbar(): UI.Toolbar.Toolbar;
    rightToolbar(): UI.Toolbar.Toolbar;
    bottomToolbar(): UI.Toolbar.Toolbar;
    scriptViewToolbar(): UI.Toolbar.Toolbar;
    wasShown(): void;
    willHide(): void;
    searchableView(): UI.SearchableView.SearchableView;
    visibleView(): UI.Widget.Widget | null;
    currentSourceFrame(): UISourceCodeFrame | null;
    currentUISourceCode(): Workspace.UISourceCode.UISourceCode | null;
    onCloseEditorTab(): boolean;
    onJumpToPreviousLocation(): void;
    onJumpToNextLocation(): void;
    private uiSourceCodeAdded;
    private addUISourceCode;
    private uiSourceCodeRemoved;
    private removeUISourceCodes;
    private projectRemoved;
    private updateScriptViewToolbarItems;
    showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean, omitHighlight?: boolean): void;
    private createSourceView;
    getSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget | undefined;
    private getOrCreateSourceView;
    recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;
    private removeSourceFrame;
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
export interface EditorAction {
    getOrCreateButton(sourcesView: SourcesView): UI.Toolbar.ToolbarButton;
}
export declare function registerEditorAction(editorAction: () => EditorAction): void;
export declare function getRegisteredEditorActions(): EditorAction[];
export declare class SwitchFileActionDelegate implements UI.ActionRegistration.ActionDelegate {
    private static nextFile;
    handleAction(context: UI.Context.Context, _actionId: string): boolean;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export {};
