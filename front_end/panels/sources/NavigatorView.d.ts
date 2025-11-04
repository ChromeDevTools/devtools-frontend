import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
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
export declare class NavigatorView extends UI.Widget.VBox implements SDK.TargetManager.Observer {
    #private;
    private placeholder;
    scriptsTree: UI.TreeOutline.TreeOutlineInShadow;
    private readonly uiSourceCodeNodes;
    private readonly subfolderNodes;
    private readonly rootNode;
    private readonly frameNodes;
    private authoredNode?;
    private deployedNode?;
    private navigatorGroupByFolderSetting;
    private navigatorGroupByAuthoredExperiment?;
    private groupByFrame?;
    private groupByAuthored?;
    private groupByDomain?;
    private groupByFolder?;
    constructor(jslogContext: string, enableAuthoredGrouping?: boolean);
    private static treeElementOrder;
    static appendSearchItem(contextMenu: UI.ContextMenu.ContextMenu, path: string): void;
    private static treeElementsCompare;
    setPlaceholder(placeholder: UI.Widget.Widget): void;
    private onBindingChanged;
    focus(): void;
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
    workspace(): Workspace.Workspace.WorkspaceImpl;
    acceptProject(project: Workspace.Workspace.Project): boolean;
    private frameAttributionAdded;
    private frameAttributionRemoved;
    private acceptsUISourceCode;
    private addUISourceCode;
    private addUISourceCodeNode;
    uiSourceCodeAdded(_uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
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
    handleContextMenu(_event: Event): void;
    private renameShortcut;
    private handleContextMenuCreate;
    private handleContextMenuRename;
    private handleContextMenuExclude;
    private handleContextMenuDelete;
    handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void;
    private handleDeleteFolder;
    private removeUISourceCodeFromProject;
    private deleteDirectoryRecursively;
    private findTopNonMergedNode;
    handleFolderContextMenu(event: Event, node: NavigatorFolderTreeNode): void;
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
export declare class NavigatorFolderTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    private readonly nodeType;
    private readonly navigatorView;
    private hoverCallback;
    node: NavigatorTreeNode;
    private hovered?;
    private isIgnoreListed?;
    constructor(navigatorView: NavigatorView, type: string, title: string, hoverCallback?: ((arg0: boolean) => void), expandable?: boolean);
    onpopulate(): Promise<void>;
    onattach(): void;
    setIgnoreListed(isIgnoreListed: boolean): void;
    setFromSourceMap(isFromSourceMap: boolean): void;
    setNode(node: NavigatorTreeNode): void;
    private updateTooltip;
    private handleContextMenuEvent;
    private mouseMove;
    private mouseLeave;
}
export declare class NavigatorSourceTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    readonly nodeType: string;
    readonly node: NavigatorUISourceCodeTreeNode;
    private readonly navigatorView;
    private aiButtonContainer?;
    constructor(navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, title: string, node: NavigatorUISourceCodeTreeNode);
    updateIcon(): void;
    updateAccessibleName(): void;
    private createAiButton;
    get uiSourceCode(): Workspace.UISourceCode.UISourceCode;
    onattach(): void;
    private shouldRenameOnMouseDown;
    selectOnMouseDown(event: MouseEvent): void;
    private ondragstart;
    onspace(): boolean;
    private onclick;
    ondblclick(event: Event): boolean;
    onenter(): boolean;
    ondelete(): boolean;
    private handleContextMenuEvent;
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
    private populated;
    isMerged: boolean;
    parent: NavigatorTreeNode | null;
    title: string;
    tooltip?: string;
    recursiveProperties: NavigatorRecursiveTreeNodeProperties;
    constructor(navigatorView: NavigatorView, id: string, type: string, tooltip?: string);
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
    treeElement: NavigatorSourceTreeElement | null;
    private eventListeners;
    constructor(navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, frame: SDK.ResourceTreeModel.ResourceTreeFrame | null);
    frame(): SDK.ResourceTreeModel.ResourceTreeFrame | null;
    uiSourceCode(): Workspace.UISourceCode.UISourceCode;
    treeNode(): UI.TreeOutline.TreeElement;
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
    treeElement: NavigatorFolderTreeElement | null;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, folderPath: Platform.DevToolsPath.EncodedPathString, title: string, origin: Platform.DevToolsPath.UrlString);
    treeNode(): UI.TreeOutline.TreeElement;
    updateTitle(): void;
    private createTreeElement;
    wasPopulated(): void;
    private addChildrenRecursive;
    private shouldMerge;
    didAddChild(node: NavigatorTreeNode): void;
    willRemoveChild(node: NavigatorTreeNode): void;
}
export declare class NavigatorGroupTreeNode extends NavigatorTreeNode {
    private readonly project;
    title: string;
    private hoverCallback?;
    private treeElement?;
    constructor(navigatorView: NavigatorView, project: Workspace.Workspace.Project | null, id: string, type: string, title: string, tooltip?: string);
    setHoverCallback(hoverCallback: (arg0: boolean) => void): void;
    treeNode(): UI.TreeOutline.TreeElement;
    onattach(): void;
    updateTitle(): void;
    setTitle(title: string): void;
}
