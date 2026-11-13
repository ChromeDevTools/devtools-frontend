import '../../ui/components/spinners/spinners.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type TemplateResult } from '../../ui/lit/lit.js';
export declare const Types: {
    Authored: string;
    AutomaticFileSystem: string;
    Deployed: string;
    Domain: string;
    File: string;
    FileSystem: string;
    FileSystemFolder: string;
    Frame: string;
    NetworkFolder: string;
    Root: string;
    Worker: string;
};
export declare function iconTypeForNodeType(type: string): string;
export declare function contextForNodeType(type: string): string;
export declare function renderFolderLeadingIcon(type: string): TemplateResult;
export declare function renderSourceTrailingIcons(uiSourceCode: Workspace.UISourceCode.UISourceCode, onSelectSource: (uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean) => void): TemplateResult[];
export declare function renderGroupTrailingIcons(project: Workspace.Workspace.Project | null): TemplateResult[];
export interface ViewInput {
    nodes: readonly NavigatorTreeNode[];
    expandedNodes: WeakSet<NavigatorTreeNode>;
    selectedNode: NavigatorTreeNode | null;
    onExpand: (node: NavigatorTreeNode, expanded: boolean) => void;
    onSelect: (node: NavigatorTreeNode, selectedByUser?: boolean) => void;
    onDoubleClick: (node: NavigatorTreeNode, middleClick: boolean) => void;
    onContextMenu: (node: NavigatorTreeNode, contextMenu: UI.ContextMenu.ContextMenu) => void;
    onHover: (node: NavigatorTreeNode, hovered: boolean) => void;
    onMouseDown: (node: NavigatorTreeNode) => void;
    onSelectSource: (uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean) => void;
    onCommitRename: (node: NavigatorUISourceCodeTreeNode, newTitle: string) => void;
    onCancelRename: (node: NavigatorUISourceCodeTreeNode) => void;
    showTree: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export interface NavigatorSourceTitleViewInput {
    title: string;
    editing: boolean;
    onCommit: (detail: string) => void;
    onCancel: () => void;
}
export type NavigatorSourceTitleView = (input: NavigatorSourceTitleViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_NAVIGATOR_SOURCE_TITLE_VIEW: NavigatorSourceTitleView;
export declare class NavigatorSourceTitleWidget extends UI.Widget.Widget {
    #private;
    onCommit?: (detail: string) => void;
    onCancel?: () => void;
    set title(title: string);
    get title(): string;
    set editing(editing: boolean);
    get editing(): boolean;
    constructor(element?: HTMLElement, view?: NavigatorSourceTitleView);
    wasShown(): void;
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: View;
export declare const enum Events {
    UI_SOURCE_CODE_ADDED = "ui-source-code-added",
    SOURCE_SELECTED = "source-selected"
}
export interface SourceSelectedEvent {
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    focusSource: boolean;
}
export interface EventTypes {
    [Events.UI_SOURCE_CODE_ADDED]: Workspace.UISourceCode.UISourceCode;
    [Events.SOURCE_SELECTED]: SourceSelectedEvent;
}
declare const NavigatorViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox>;
export declare class NavigatorView extends NavigatorViewBase implements SDK.TargetManager.Observer {
    #private;
    static readonly INJECT: readonly [
        typeof Bindings.NetworkProject.NetworkProjectManager,
        typeof Workspace.Workspace.WorkspaceImpl,
        typeof Workspace.IgnoreListManager.IgnoreListManager,
        typeof Persistence.Persistence.PersistenceImpl,
        typeof Persistence.NetworkPersistenceManager.NetworkPersistenceManager,
        typeof SDK.TargetManager.TargetManager,
        typeof Common.Settings.Settings
    ];
    readonly rootNode: NavigatorRootTreeNode;
    constructor(element?: HTMLElement, [networkProjectManager, workspace, ignoreListManager, persistence, networkPersistenceManager, targetManager, settings,]?: Partial<UI.Widget.WidgetDependencies<typeof NavigatorView>>, view?: View);
    get ignoreListManager(): Workspace.IgnoreListManager.IgnoreListManager;
    get persistence(): Persistence.Persistence.PersistenceImpl;
    get settings(): Common.Settings.Settings;
    wasShown(): void;
    willHide(): void;
    get enableAuthoredGrouping(): boolean;
    set enableAuthoredGrouping(enableAuthoredGrouping: boolean);
    get projectFilter(): ((project: Workspace.Workspace.Project) => boolean) | undefined;
    set projectFilter(projectFilter: ((project: Workspace.Workspace.Project) => boolean) | undefined);
    static compareNodes(node1: NavigatorTreeNode, node2: NavigatorTreeNode): number;
    static appendSearchItem(contextMenu: UI.ContextMenu.ContextMenu, path: string): void;
    performUpdate(): void;
    selectNode(node: NavigatorTreeNode): void;
    expandNode(node: NavigatorTreeNode): void;
    collapseNode(node: NavigatorTreeNode): void;
    isNodeExpanded(node: NavigatorTreeNode): boolean;
    isNodeSelected(node: NavigatorTreeNode): boolean;
    setNodeSelected(node: NavigatorTreeNode): void;
    setNodeExpanded(node: NavigatorTreeNode): void;
    isNodeSelectedOrDescendant(node: NavigatorTreeNode): boolean;
    deselectIfDescendant(node: NavigatorTreeNode): void;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    tryAddProject(project: Workspace.Workspace.Project): void;
    removeProject(project: Workspace.Workspace.Project): void;
    revealUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, select?: boolean): NavigatorUISourceCodeTreeNode | null;
    sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void;
    removeUISourceCodeNode(node: NavigatorUISourceCodeTreeNode): void;
    reset(tearDownOnly?: boolean): void;
    shouldRenameOnMouseDown(node: NavigatorUISourceCodeTreeNode): boolean;
    startRenamingNode(node: NavigatorUISourceCodeTreeNode): void;
    stopRenamingNode(node: NavigatorUISourceCodeTreeNode): void;
    isRenaming(): boolean;
    handleFileContextMenu(contextMenu: UI.ContextMenu.ContextMenu, node: NavigatorUISourceCodeTreeNode): void;
    folderHovered(node: NavigatorTreeNode, hovered: boolean): void;
    handleFolderContextMenu(contextMenu: UI.ContextMenu.ContextMenu, node: NavigatorFolderTreeNode | NavigatorGroupTreeNode): void;
    rename(node: NavigatorUISourceCodeTreeNode, creatingNewUISourceCode: boolean): void;
    create(project: Workspace.Workspace.Project, path: Platform.DevToolsPath.EncodedPathString, uiSourceCodeToCopy?: Workspace.UISourceCode.UISourceCode): Promise<void>;
    protected resetForTest(groupBy?: {
        frame?: boolean;
        domain?: boolean;
        folder?: boolean;
    }): void;
    targetAdded(_target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
}
export interface NavigatorRecursiveTreeNodeProperties {
    exclusivelySourceMapped: boolean | null;
    exclusivelyIgnored: boolean | null;
    exclusivelyThirdParty: boolean | null;
    exclusivelyContentScripts: boolean | null;
}
export declare class NavigatorTreeNode {
    #private;
    id: string;
    protected navigatorView: NavigatorView;
    type: string;
    boostOrder: boolean;
    hasMappedFiles: boolean;
    isMerged: boolean;
    mergedTitle(): string;
    effectiveChildren(): NavigatorTreeNode[];
    parent: NavigatorTreeNode | null;
    title: string;
    tooltip?: string;
    recursiveProperties: NavigatorRecursiveTreeNodeProperties;
    constructor(navigatorView: NavigatorView, id: string, type: string, tooltip?: string);
    isDisposed(): boolean;
    dispose(): void;
    computedTooltip(): string;
    updateTitle(): void;
    updateTitleRecursive(): void;
    updateTitleBubbleUp(): void;
    isRoot(): boolean;
    hasChildren(): boolean;
    onattach(): void;
    setTitle(_title: string): void;
    populate(): void;
    wasPopulated(): void;
    didAddChild(_node: NavigatorTreeNode): void;
    willRemoveChild(_node: NavigatorTreeNode): void;
    isPopulated(): boolean;
    isEmpty(): boolean;
    children(): readonly NavigatorTreeNode[];
    child(id: string): NavigatorTreeNode | null;
    appendChild(node: NavigatorTreeNode): void;
    resortChild(node: NavigatorTreeNode): void;
    removeChild(node: NavigatorTreeNode): void;
    reset(): void;
    updateId(newId: string): void;
}
export declare class NavigatorRootTreeNode extends NavigatorTreeNode {
    constructor(navigatorView: NavigatorView);
    isRoot(): boolean;
}
export declare class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
    #private;
    isEditing: boolean;
    constructor(navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, frame: SDK.ResourceTreeModel.ResourceTreeFrame | null);
    frame(): SDK.ResourceTreeModel.ResourceTreeFrame | null;
    uiSourceCode(): Workspace.UISourceCode.UISourceCode;
    updateTitle(ignoreIsDirty?: boolean): void;
    hasChildren(): boolean;
    dispose(): void;
    reveal(select?: boolean): void;
    rename(callback?: ((committed: boolean) => void)): void;
    commitRename(newTitle: string): Promise<void>;
    cancelRename(): void;
}
export declare class NavigatorFolderTreeNode extends NavigatorTreeNode {
    #private;
    project: Workspace.Workspace.Project | null;
    readonly folderPath: Platform.DevToolsPath.EncodedPathString;
    readonly origin: Platform.DevToolsPath.UrlString;
    title: string;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, folderPath: Platform.DevToolsPath.EncodedPathString, title: string, origin: Platform.DevToolsPath.UrlString);
    computedTooltip(): string;
    updateTitle(): void;
    didAddChild(node: NavigatorTreeNode): void;
    shouldMerge(node: NavigatorTreeNode): boolean;
    mergedTitle(): string;
    mergedLeafNode(): NavigatorFolderTreeNode;
    effectiveChildren(): NavigatorTreeNode[];
}
export declare class NavigatorGroupTreeNode extends NavigatorTreeNode {
    #private;
    readonly project: Workspace.Workspace.Project | null;
    title: string;
    readonly frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, title: string, tooltip?: string, frame?: SDK.ResourceTreeModel.ResourceTreeFrame);
    updateTitle(): void;
    setTitle(title: string): void;
}
export {};
