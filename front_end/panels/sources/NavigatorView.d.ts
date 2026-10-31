import '../../ui/components/spinners/spinners.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
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
export interface ViewInput {
    treeElement: HTMLElement;
    showTree: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare function iconTypeForNodeType(type: string): string;
export declare function contextForNodeType(type: string): string;
export declare function renderFolderLeadingIcon(type: string): Lit.TemplateResult;
export declare function renderSourceTrailingIcons(uiSourceCode: Workspace.UISourceCode.UISourceCode, onSelectSource: (uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean) => void): Lit.TemplateResult[];
export declare function renderGroupTrailingIcons(project: Workspace.Workspace.Project | null): Lit.TemplateResult[];
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
    static readonly INJECT: readonly [typeof Bindings.NetworkProject.NetworkProjectManager];
    scriptsTree: UI.TreeOutline.TreeOutlineInShadow;
    private readonly uiSourceCodeNodes;
    private readonly subfolderNodes;
    private readonly rootNode;
    private readonly frameNodes;
    private authoredNode?;
    private deployedNode?;
    private navigatorGroupByFolderSetting;
    private navigatorJustMyCodeSetting;
    private navigatorGroupByAuthoredSetting?;
    private groupByFrame?;
    private groupByAuthored?;
    private groupByDomain?;
    private groupByFolder?;
    private selectedNode;
    private expandedNodes;
    private readonly treeElementNodes;
    constructor(element?: HTMLElement, [networkProjectManager]?: UI.Widget.WidgetDependencies<typeof NavigatorView>, view?: View);
    wasShown(): void;
    get enableAuthoredGrouping(): boolean;
    set enableAuthoredGrouping(enableAuthoredGrouping: boolean);
    get projectFilter(): ((project: Workspace.Workspace.Project) => boolean) | undefined;
    set projectFilter(projectFilter: ((project: Workspace.Workspace.Project) => boolean) | undefined);
    private static nodeOrder;
    static compareNodes(node1: NavigatorTreeNode, node2: NavigatorTreeNode): number;
    static appendSearchItem(contextMenu: UI.ContextMenu.ContextMenu, path: string): void;
    private treeElementsCompare;
    performUpdate(): void;
    private onBindingChanged;
    focus(): void;
    selectNode(node: NavigatorTreeNode, omitFocus?: boolean, selectedByUser?: boolean): void;
    expandNode(node: NavigatorTreeNode): void;
    collapseNode(node: NavigatorTreeNode): void;
    isNodeExpanded(node: NavigatorTreeNode): boolean;
    isNodeSelected(node: NavigatorTreeNode): boolean;
    setNodeSelected(node: NavigatorTreeNode): void;
    setNodeExpanded(node: NavigatorTreeNode): void;
    setNodeForTreeElement(treeElement: UI.TreeOutline.TreeElement, node: NavigatorTreeNode): void;
    nodeForTreeElement(treeElement: UI.TreeOutline.TreeElement): NavigatorTreeNode | undefined;
    /**
     * Central place to add elements to the tree to
     * enable focus if the tree has elements
     */
    appendChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void;
    /**
     * Central place to remove elements from the tree to
     * disable focus if the tree is empty
     */
    removeChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void;
    private resetWorkspace;
    private projectAddedCallback;
    private projectRemovedCallback;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    private frameAttributionAdded;
    private frameAttributionRemoved;
    private acceptsUISourceCode;
    private addUISourceCode;
    private addUISourceCodeNode;
    private uiSourceCodeAddedCallback;
    private uiSourceCodeRemovedCallback;
    tryAddProject(project: Workspace.Workspace.Project): void;
    private projectAdded;
    private selectDefaultTreeNode;
    private computeUniqueFileSystemProjectNames;
    removeProject(project: Workspace.Workspace.Project): void;
    private folderNodeId;
    private folderNode;
    private domainNode;
    private frameNode;
    private targetNode;
    private rootOrDeployedNode;
    private computeProjectDisplayName;
    revealUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, select?: boolean): NavigatorUISourceCodeTreeNode | null;
    sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void;
    private removeUISourceCodes;
    private removeUISourceCodeNode;
    reset(tearDownOnly?: boolean): void;
    private renameShortcut;
    private handleContextMenuCreate;
    private handleContextMenuRename;
    private handleContextMenuExclude;
    private handleContextMenuDelete;
    fileDragStarted(node: NavigatorUISourceCodeTreeNode, event: DragEvent): void;
    shouldRenameOnMouseDown(node: NavigatorUISourceCodeTreeNode): boolean;
    handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void;
    private handleSaveAs;
    private addJSExtension;
    private handleDeleteFolder;
    private removeUISourceCodeFromProject;
    private deleteDirectoryRecursively;
    private findTopNonMergedNode;
    folderHovered(node: NavigatorTreeNode, hovered: boolean): void;
    handleFolderContextMenu(event: Event, node: NavigatorFolderTreeNode | NavigatorGroupTreeNode): void;
    rename(node: NavigatorUISourceCodeTreeNode, creatingNewUISourceCode: boolean): void;
    create(project: Workspace.Workspace.Project, path: Platform.DevToolsPath.EncodedPathString, uiSourceCodeToCopy?: Workspace.UISourceCode.UISourceCode): Promise<void>;
    private groupingChanged;
    private ignoreListChanged;
    private initGrouping;
    protected resetForTest(): void;
    private discardFrame;
    targetAdded(_target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    private targetNameChanged;
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
    private populated;
    isMerged: boolean;
    parent: NavigatorTreeNode | null;
    title: string;
    tooltip?: string;
    recursiveProperties: NavigatorRecursiveTreeNodeProperties;
    constructor(navigatorView: NavigatorView, id: string, type: string, tooltip?: string);
    computedTooltip(): string;
    updateTooltip(treeElement?: UI.TreeOutline.TreeElement): void;
    protected createFolderTreeElement(title: string, node: NavigatorTreeNode, expandable?: boolean): UI.TreeOutline.TreeElement;
    treeNode(): UI.TreeOutline.TreeElement;
    dispose(): void;
    updateTitle(): void;
    updateTitleRecursive(): void;
    updateTitleBubbleUp(): void;
    isRoot(): boolean;
    hasChildren(): boolean;
    onattach(): void;
    setTitle(_title: string): void;
    populate(): void;
    wasPopulated(): void;
    didAddChild(node: NavigatorTreeNode): void;
    willRemoveChild(node: NavigatorTreeNode): void;
    isPopulated(): boolean;
    isEmpty(): boolean;
    children(): readonly NavigatorTreeNode[];
    child(id: string): NavigatorTreeNode | null;
    appendChild(node: NavigatorTreeNode): void;
    removeChild(node: NavigatorTreeNode): void;
    reset(): void;
    updateId(newId: string): void;
}
export declare class NavigatorRootTreeNode extends NavigatorTreeNode {
    constructor(navigatorView: NavigatorView);
    isRoot(): boolean;
    treeNode(): UI.TreeOutline.TreeElement;
}
export declare class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
    #private;
    treeElement: UI.TreeOutline.TreeElement | null;
    private eventListeners;
    constructor(navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, frame: SDK.ResourceTreeModel.ResourceTreeFrame | null);
    frame(): SDK.ResourceTreeModel.ResourceTreeFrame | null;
    uiSourceCode(): Workspace.UISourceCode.UISourceCode;
    updateIcon(): void;
    updateAccessibleName(): void;
    updateTrailingIcons(): void;
    onattach(): void;
    treeNode(): UI.TreeOutline.TreeElement;
    private updateTreeElement;
    updateTitle(ignoreIsDirty?: boolean): void;
    hasChildren(): boolean;
    dispose(): void;
    reveal(select?: boolean): void;
    rename(callback?: ((committed: boolean) => void)): void;
}
export declare class NavigatorFolderTreeNode extends NavigatorTreeNode {
    project: Workspace.Workspace.Project | null;
    readonly folderPath: Platform.DevToolsPath.EncodedPathString;
    readonly origin: Platform.DevToolsPath.UrlString;
    title: string;
    treeElement: UI.TreeOutline.TreeElement | null;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, folderPath: Platform.DevToolsPath.EncodedPathString, title: string, origin: Platform.DevToolsPath.UrlString);
    treeNode(): UI.TreeOutline.TreeElement;
    private computeHasMappedFiles;
    private updateTreeElement;
    updateTitle(): void;
    private createTreeElement;
    wasPopulated(): void;
    private addChildrenRecursive;
    private shouldMerge;
    didAddChild(node: NavigatorTreeNode): void;
    willRemoveChild(node: NavigatorTreeNode): void;
}
export declare class NavigatorGroupTreeNode extends NavigatorTreeNode {
    readonly project: Workspace.Workspace.Project | null;
    title: string;
    readonly frame?: SDK.ResourceTreeModel.ResourceTreeFrame;
    treeElement?: UI.TreeOutline.TreeElement;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, title: string, tooltip?: string, frame?: SDK.ResourceTreeModel.ResourceTreeFrame);
    treeNode(): UI.TreeOutline.TreeElement;
    updateTrailingIcons(): void;
    onattach(): void;
    private computeHasMappedFiles;
    updateTitle(): void;
    setTitle(title: string): void;
}
export {};
