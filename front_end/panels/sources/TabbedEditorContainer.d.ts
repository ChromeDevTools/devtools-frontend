import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { EditingLocationHistoryManager } from './EditingLocationHistoryManager.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
declare const TabbedEditorContainer_base: Platform.Constructor.Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.VBox;
export declare class TabbedEditorContainer extends TabbedEditorContainer_base {
    #private;
    set historyManager(historyManager: EditingLocationHistoryManager);
    private readonly sourceViewByUISourceCode;
    private readonly tabbedPane;
    private tabIds;
    private readonly files;
    history: History;
    set previouslyViewedFilesSetting(setting: Common.Settings.Setting<SerializedHistoryItem[]>);
    get previouslyViewedFilesSetting(): Common.Settings.Setting<SerializedHistoryItem[]>;
    private readonly uriToUISourceCode;
    private readonly idToUISourceCode;
    private currentView;
    private scrollTimer?;
    private reentrantShow;
    constructor(element?: HTMLElement);
    get tabbedPaneForTesting(): UI.TabbedPane.TabbedPane;
    private onBindingCreated;
    private onBindingRemoved;
    get visibleView(): UI.Widget.Widget | null;
    fileViews(): UI.Widget.Widget[];
    leftToolbar(): UI.Toolbar.Toolbar;
    rightToolbar(): UI.Toolbar.Toolbar;
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
    viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;
    private getOrCreateSourceView;
    private createSourceView;
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
