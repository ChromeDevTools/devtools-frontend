import '../../ui/components/tooltips/tooltips.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import type { EditingLocationHistoryManager } from './EditingLocationHistoryManager.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
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
    leftToolbarItems: Array<UI.Toolbar.ToolbarItem | LitTemplate>;
    rightToolbarItems: Array<UI.Toolbar.ToolbarItem | LitTemplate>;
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
export declare const DEFAULT_VIEW: View;
declare const TabbedEditorContainerBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export declare class TabbedEditorContainer extends TabbedEditorContainerBase {
    #private;
    focus(): void;
    performUpdate(): void;
    set historyManager(historyManager: EditingLocationHistoryManager);
    set leftToolbarItems(items: Array<UI.Toolbar.ToolbarItem | LitTemplate>);
    set rightToolbarItems(items: Array<UI.Toolbar.ToolbarItem | LitTemplate>);
    set uiSourceCodes(uiSourceCodes: ReadonlySet<Workspace.UISourceCode.UISourceCode>);
    onEditorSelected?: (event: EditorSelectedEvent) => void;
    onEditorClosed?: (uiSourceCode: Workspace.UISourceCode.UISourceCode) => void;
    private tabIds;
    private files;
    history: History;
    set previouslyViewedFilesSetting(setting: Common.Settings.Setting<SerializedHistoryItem[]>);
    get previouslyViewedFilesSetting(): Common.Settings.Setting<SerializedHistoryItem[]>;
    private readonly uriToUISourceCode;
    private readonly idToUISourceCode;
    private currentView;
    private scrollTimer?;
    private reentrantShow;
    constructor(element?: HTMLElement, view?: View);
    get tabbedPane(): UI.TabbedPane.TabbedPaneElement;
    get tabbedPaneForTesting(): UI.TabbedPane.TabbedPaneElement;
    private onBindingCreated;
    private onBindingRemoved;
    get visibleView(): UI.Widget.Widget | null;
    fileViews(): UI.Widget.Widget[];
    showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeAllFiles(): void;
    detachEditors(): void;
    historyUISourceCodes(): Workspace.UISourceCode.UISourceCode[];
    selectNextTab(): void;
    selectPrevTab(): void;
    private addViewListeners;
    private removeViewListeners;
    private onScrollChanged;
    private onEditorUpdate;
    private titleForFile;
    private maybeCloseTab;
    closeTabs(ids: string[], forceCloseDirtyTabs?: boolean): void;
    onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void;
    private canonicalUISourceCode;
    addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void;
    private editorClosedByUserAction;
    private editorSelectedByUserAction;
    private updateHistory;
    private tooltipForFile;
    private appendFileTab;
    private addLoadErrorIcon;
    private restoreEditorProperties;
    private tabClosed;
    private tabSelected;
    private addUISourceCodeListeners;
    private removeUISourceCodeListeners;
    private updateFileTitle;
    private uiSourceCodeTitleChanged;
    private uiSourceCodeWorkingCopyChanged;
    private uiSourceCodeWorkingCopyCommitted;
    private generateTabId;
    getCreatedSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget | undefined;
    private getOrCreateSourceView;
    viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;
    recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    private removeSourceFrame;
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
export interface SerializedHistoryItem {
    url: string;
    resourceTypeName: string;
    selectionRange?: TextUtils.TextRange.SerializedTextRange;
    scrollLineNumber?: number;
}
interface HistoryItemKey {
    url: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
}
export declare class HistoryItem implements HistoryItemKey {
    url: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
    selectionRange: TextUtils.TextRange.TextRange | undefined;
    scrollLineNumber: number | undefined;
    constructor(url: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType, selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number);
    static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem;
    toObject(): SerializedHistoryItem | null;
}
export declare class History {
    private items;
    constructor(items: HistoryItem[]);
    static fromObject(serializedHistoryItems: SerializedHistoryItem[]): History;
    index({ url, resourceType }: HistoryItemKey): number;
    selectionRange(key: HistoryItemKey): TextUtils.TextRange.TextRange | undefined;
    updateSelectionRange(key: HistoryItemKey, selectionRange?: TextUtils.TextRange.TextRange): void;
    scrollLineNumber(key: HistoryItemKey): number | undefined;
    updateScrollLineNumber(key: HistoryItemKey, scrollLineNumber: number): void;
    update(keys: HistoryItemKey[]): void;
    remove(key: HistoryItemKey): void;
    toObject(): SerializedHistoryItem[];
    keys(): HistoryItemKey[];
}
export declare class EditorContainerTabDelegate implements UI.TabbedPane.TabbedPaneTabDelegate {
    private readonly editorContainer;
    constructor(editorContainer: TabbedEditorContainer);
    closeTabs(_tabbedPane: UI.TabbedPane.TabbedPane, ids: string[]): void;
    onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void;
}
export {};
