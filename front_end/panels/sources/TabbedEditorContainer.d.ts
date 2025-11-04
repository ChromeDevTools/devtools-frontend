import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
export interface TabbedEditorContainerDelegate {
    viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget;
    recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
}
export declare class TabbedEditorContainer extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private readonly delegate;
    private readonly tabbedPane;
    private tabIds;
    private readonly files;
    private readonly previouslyViewedFilesSetting;
    private readonly history;
    private readonly uriToUISourceCode;
    private readonly idToUISourceCode;
    private currentView;
    private scrollTimer?;
    private reentrantShow;
    constructor(delegate: TabbedEditorContainerDelegate, setting: Common.Settings.Setting<SerializedHistoryItem[]>, placeholderElement: Element, focusedPlaceholderElement?: Element);
    private onBindingCreated;
    private onBindingRemoved;
    get view(): UI.Widget.Widget;
    get visibleView(): UI.Widget.Widget | null;
    fileViews(): UI.Widget.Widget[];
    leftToolbar(): UI.Toolbar.Toolbar;
    rightToolbar(): UI.Toolbar.Toolbar;
    show(parentElement: Element): void;
    showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    closeAllFiles(): void;
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
interface SerializedHistoryItem {
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
