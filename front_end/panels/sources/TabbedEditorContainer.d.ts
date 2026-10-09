import '../../ui/components/tooltips/tooltips.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import { History, HistoryItem, type SerializedHistoryItem } from './EditorHistory.js';
interface TabInfo {
    tabId: string;
    title: string;
    tooltip: string;
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    isCloseable: boolean;
    widget?: UI.Widget.Widget;
    hasLoadError: boolean;
    hasUnsavedCommittedChanges: boolean;
    disconnectedAutomaticFileSystemRoot?: string;
    icon?: LitTemplate;
}
export interface TabbedEditorViewInput {
    openTabs: TabInfo[];
    activeTabId?: string;
    leftToolbarItems: LitTemplate[];
    rightToolbarItems: LitTemplate[];
    tabDelegate: UI.TabbedPane.TabbedPaneTabDelegate;
    shortcuts: Array<{
        description: Platform.UIString.LocalizedString;
        onClick: () => void;
        keys: string[];
    }>;
    onAddFileSystemClicked: () => void;
    onConnectAutomaticFileSystem: (e: Event) => void;
    onClose: (e: Event) => void;
    onTabOrderChanged: (e: Event) => void;
    onSelect: (e: Event) => void;
}
export type View = (input: TabbedEditorViewInput, output: undefined, target: HTMLElement) => void;
export type SourceViewFactory = (uiSourceCode: Workspace.UISourceCode.UISourceCode) => UI.Widget.Widget;
export declare const DEFAULT_VIEW: View;
declare const TabbedEditorContainerBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export interface SourceLocation {
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    location?: SourceFrame.SourceFrame.RevealPosition;
    omitFocus?: boolean;
    omitHighlight?: boolean;
}
export declare class TabbedEditorContainer extends TabbedEditorContainerBase {
    #private;
    focus(): void;
    performUpdate(): void;
    set leftToolbarItems(items: LitTemplate[]);
    set rightToolbarItems(items: LitTemplate[]);
    set uiSourceCodes(uiSourceCodes: ReadonlySet<Workspace.UISourceCode.UISourceCode>);
    set sourceLocation(sourceLocation: SourceLocation | undefined);
    onEditorSelected?: (event: EditorSelectedEvent) => void;
    onEditorClosed?: (uiSourceCode: Workspace.UISourceCode.UISourceCode) => void;
    set previouslyViewedFilesSetting(setting: Common.Settings.Setting<SerializedHistoryItem[]>);
    get previouslyViewedFilesSetting(): Common.Settings.Setting<SerializedHistoryItem[]>;
    constructor(element?: HTMLElement, view?: View, sourceViewFactory?: SourceViewFactory);
    wasShown(): void;
    willHide(): void;
    onDetach(): void;
    static defaultUISourceCodeScores(): Map<Workspace.UISourceCode.UISourceCode, number>;
    /** @deprecated Used by chromium web tests until https://crrev.com/c/8514061 rolls. */
    get tabbedPane(): UI.TabbedPane.TabbedPaneElement;
    get visibleView(): UI.Widget.Widget | null;
    fileViews(): UI.Widget.Widget[];
    showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean, omitHighlight?: boolean): void;
    rollback(): void;
    rollover(): void;
    showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeActiveTab(): boolean;
    closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeAllFiles(): void;
    historyUISourceCodes(): Workspace.UISourceCode.UISourceCode[];
    selectNextTab(): void;
    selectPrevTab(): void;
    /** @deprecated Used by chromium web test ui-source-code-display-name.js */
    titleForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string;
    closeTabs(ids: string[], forceCloseDirtyTabs?: boolean): void;
    onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void;
    getCreatedSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget | undefined;
    viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;
    currentFile(): Workspace.UISourceCode.UISourceCode | null;
}
export declare const enum Events {
    EDITOR_SELECTED = "EditorSelected",
    EDITOR_CLOSED = "EditorClosed"
}
export interface EditorSelectedEvent {
    currentFile: Workspace.UISourceCode.UISourceCode;
    currentView: UI.Widget.Widget | null;
    previousView: UI.Widget.Widget | null;
    userGesture: boolean | undefined;
}
export interface EventTypes {
    [Events.EDITOR_SELECTED]: EditorSelectedEvent;
    [Events.EDITOR_CLOSED]: Workspace.UISourceCode.UISourceCode;
}
export { History, HistoryItem, type SerializedHistoryItem, };
export declare class EditorContainerTabDelegate implements UI.TabbedPane.TabbedPaneTabDelegate {
    #private;
    constructor(editorContainer: TabbedEditorContainer);
    closeTabs(_tabbedPane: UI.TabbedPane.TabbedPane, ids: string[]): void;
    onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void;
}
