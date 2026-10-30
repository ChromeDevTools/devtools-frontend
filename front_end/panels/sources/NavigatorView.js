// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/components/spinners/spinners.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';
import { PanelUtils } from '../utils/utils.js';
import navigatorTreeStyles from './navigatorTree.css.js';
import navigatorViewStyles from './navigatorView.css.js';
import { SearchSources } from './SearchSourcesView.js';
const { html, render } = Lit;
const UIStrings = {
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    searchInFolder: 'Search in folder',
    /**
     * @description Search label in Navigator view of the Sources panel.
     */
    searchInAllFiles: 'Search in all files',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    noDomain: '(no domain)',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    authored: 'Authored',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    authoredTooltip: 'Contains original sources',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deployed: 'Deployed',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deployedTooltip: 'Contains final sources the browser sees',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    excludeThisFolder: 'Exclude this folder?',
    /**
     * @description Text in a dialog which appears when users click on 'Exclude from workspace' menu item.
     */
    folderWillNotBeShown: 'This folder and its contents won’t be shown in workspace',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deleteThisFile: 'Delete this file?',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    rename: 'Rename…',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    makeACopy: 'Make a copy…',
    /**
     * @description Text to delete something.
     */
    delete: 'Delete',
    /**
     * @description A button text to confirm an action to remove a folder. This is not the same as delete. It removes the folder from the UI but does not delete it.
     */
    remove: 'Remove',
    /**
     * @description Text in Navigator view of the Sources panel.
     */
    deleteFolder: 'Delete this folder and its contents?',
    /**
     * @description Text in Navigator view of the Sources panel. A confirmation message on action to delete a folder or file.
     */
    actionCannotBeUndone: 'This action can’t be undone',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    openFolder: 'Open folder',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    newFile: 'New file',
    /**
     * @description A context menu item in the Navigator view of the Sources panel to exclude a folder from workspace.
     */
    excludeFolder: 'Exclude from workspace',
    /**
     * @description A context menu item in the Navigator view of the Sources panel.
     */
    removeFolderFromWorkspace: 'Remove from workspace',
    /**
     * @description Text in Navigator view of the Sources panel.
     * @example {a-folder-name} PH1
     */
    areYouSureYouWantToRemoveThis: 'Remove ‘{PH1}’ from workspace?',
    /**
     * @description Text in Navigator view of the Sources panel. Warning message when user removes a folder.
     */
    workspaceStopSyncing: 'This will stop syncing changes from DevTools to your sources',
    /**
     * @description Name of an item from a source map.
     * @example {compile.html} PH1
     */
    sFromSourceMap: '{PH1} (from source map)',
    /**
     * @description Name of an item that is on the ignore list.
     * @example {compile.html} PH1
     */
    sIgnoreListed: '{PH1} (ignore listed)',
    /**
     * @description Text for the button in the Workspace tab of the Sources panel,
     *              which allows the user to connect automatic workspace folders.
     */
    connect: 'Connect',
    /**
     * @description A context menu item in the Workspace tab of the Sources panel, which
     *              shows up for disconnected automatic workspace folders.
     */
    connectFolderToWorkspace: 'Connect to workspace',
    /**
     * @description A context menu item in the Sources navigator of the Sources panel.
     */
    run: 'Run',
    /**
     * @description Text to save content as a specific file type.
     */
    saveAs: 'Save as…',
    /**
     * @description An error message logged to the Console panel when the user uses
     *              the "Save as…" context menu in the Sources panel and the operation
     *              fails.
     */
    saveAsFailed: 'Failed to save file to disk',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/NavigatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const Types = {
    Authored: 'authored',
    AutomaticFileSystem: 'automatic-fs',
    Deployed: 'deployed',
    Domain: 'domain',
    File: 'file',
    FileSystem: 'fs',
    FileSystemFolder: 'fs-folder',
    Frame: 'frame',
    NetworkFolder: 'nw-folder',
    Root: 'root',
    Worker: 'worker',
};
const TYPE_ORDERS = new Map([
    [Types.Root, 1],
    [Types.Authored, 1],
    [Types.Deployed, 5],
    [Types.Domain, 10],
    [Types.FileSystemFolder, 1],
    [Types.NetworkFolder, 1],
    [Types.File, 10],
    [Types.Frame, 70],
    [Types.Worker, 90],
    [Types.AutomaticFileSystem, 99],
    [Types.FileSystem, 100],
]);
export const DEFAULT_VIEW = (input, _output, target) => {
    const showPlaceholder = !input.showTree;
    // clang-format off
    render(html `
        <style>${navigatorViewStyles}</style>
        <slot name="header"></slot>
        <div class="vbox flex-auto" ?hidden=${!showPlaceholder}>
          <slot name="placeholder"></slot>
        </div>
        <div class="vbox flex-auto" ?hidden=${showPlaceholder}>
          ${input.treeElement}
        </div>
      `, target);
    // clang-format on
};
export var Events;
(function (Events) {
    Events["UI_SOURCE_CODE_ADDED"] = "ui-source-code-added";
    Events["SOURCE_SELECTED"] = "source-selected";
})(Events || (Events = {}));
const NavigatorViewBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class NavigatorView extends NavigatorViewBase {
    static INJECT = [Bindings.NetworkProject.NetworkProjectManager];
    scriptsTree;
    uiSourceCodeNodes;
    subfolderNodes;
    rootNode;
    frameNodes;
    authoredNode;
    deployedNode;
    navigatorGroupByFolderSetting;
    navigatorJustMyCodeSetting;
    navigatorGroupByAuthoredSetting;
    #navigatorGroupByAuthoredChangeListener;
    #enableAuthoredGrouping = false;
    #projectFilter;
    #workspace = Workspace.Workspace.WorkspaceImpl.instance();
    #initialized = false;
    groupByFrame;
    groupByAuthored;
    groupByDomain;
    groupByFolder;
    selectedNode = null;
    expandedNodes = new WeakSet();
    treeElementNodes = new WeakMap();
    #view;
    constructor(element, [networkProjectManager] = [Bindings.NetworkProject.NetworkProjectManager.instance()], view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.scriptsTree = new UI.TreeOutline.TreeOutlineInShadow("NavigationTree" /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */);
        this.scriptsTree.registerRequiredCSS(navigatorTreeStyles);
        this.scriptsTree.setHideOverflow(true);
        this.scriptsTree.setComparator(this.treeElementsCompare.bind(this));
        this.scriptsTree.setFocusable(false);
        this.setDefaultFocusedElement(this.scriptsTree.element);
        this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementAttached, () => this.requestUpdate());
        this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementsDetached, () => this.requestUpdate());
        this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementSelected, event => {
            const node = this.nodeForTreeElement(event.data);
            this.selectedNode = node ?? null;
        });
        this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementExpanded, event => {
            const node = this.nodeForTreeElement(event.data);
            if (node) {
                this.expandedNodes.add(node);
                node.populate();
            }
        });
        this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementCollapsed, event => {
            const node = this.nodeForTreeElement(event.data);
            if (node) {
                this.expandedNodes.delete(node);
            }
        });
        this.uiSourceCodeNodes = new Platform.MapUtilities.Multimap();
        this.subfolderNodes = new Map();
        this.rootNode = new NavigatorRootTreeNode(this);
        this.rootNode.populate();
        this.frameNodes = new Map();
        UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.contentElement, { 'sources.rename': this.renameShortcut.bind(this) });
        this.navigatorGroupByFolderSetting =
            Common.Settings.Settings.instance().resolve(SettingsUI.SourcesSettings.navigatorGroupByFolderSettingDescriptor);
        this.navigatorGroupByFolderSetting.addChangeListener(this.groupingChanged.bind(this));
        this.navigatorJustMyCodeSetting =
            Common.Settings.Settings.instance().resolve(SettingsUI.SourcesSettings.navigatorJustMyCodeSettingDescriptor);
        this.navigatorJustMyCodeSetting.addChangeListener(this.groupingChanged.bind(this));
        Workspace.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.ignoreListChanged.bind(this));
        this.initGrouping();
        Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingCreated, this.onBindingChanged, this);
        Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingRemoved, this.onBindingChanged, this);
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener("RequestsForHeaderOverridesFileChanged" /* Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED */, this.#onRequestsForHeaderOverridesFileChanged, this);
        SDK.TargetManager.TargetManager.instance().addEventListener("NameChanged" /* SDK.TargetManager.Events.NAME_CHANGED */, this.targetNameChanged, this);
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
        networkProjectManager.addEventListener("FrameAttributionAdded" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_ADDED */, this.frameAttributionAdded, this);
        networkProjectManager.addEventListener("FrameAttributionRemoved" /* Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_REMOVED */, this.frameAttributionRemoved, this);
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    get enableAuthoredGrouping() {
        return this.#enableAuthoredGrouping;
    }
    set enableAuthoredGrouping(enableAuthoredGrouping) {
        if (this.#enableAuthoredGrouping === enableAuthoredGrouping) {
            return;
        }
        this.#enableAuthoredGrouping = enableAuthoredGrouping;
        if (this.navigatorGroupByAuthoredSetting && this.#navigatorGroupByAuthoredChangeListener) {
            this.navigatorGroupByAuthoredSetting.removeChangeListener(this.#navigatorGroupByAuthoredChangeListener);
            this.navigatorGroupByAuthoredSetting = undefined;
            this.#navigatorGroupByAuthoredChangeListener = undefined;
        }
        if (enableAuthoredGrouping) {
            this.navigatorGroupByAuthoredSetting = Common.Settings.Settings.instance().resolve(SettingsUI.SourcesSettings.navigatorGroupByAuthoredSettingDescriptor);
            this.#navigatorGroupByAuthoredChangeListener = this.groupingChanged.bind(this);
            this.navigatorGroupByAuthoredSetting.addChangeListener(this.#navigatorGroupByAuthoredChangeListener);
        }
        if (this.#initialized && Boolean(this.groupByAuthored) !== Boolean(this.navigatorGroupByAuthoredSetting?.get())) {
            this.groupingChanged();
        }
        this.requestUpdate();
    }
    get projectFilter() {
        return this.#projectFilter;
    }
    set projectFilter(projectFilter) {
        if (this.#projectFilter === projectFilter) {
            return;
        }
        this.#projectFilter = projectFilter;
        if (this.#initialized) {
            this.groupingChanged();
        }
        this.requestUpdate();
    }
    static nodeOrder(node) {
        if (node.boostOrder) {
            return 0;
        }
        let order = TYPE_ORDERS.get(node.type) || 0;
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            const contentType = node.uiSourceCode().contentType();
            if (contentType.isDocument()) {
                order += 3;
            }
            else if (contentType.isScript()) {
                order += 5;
            }
            else if (contentType.isStyleSheet()) {
                order += 10;
            }
            else {
                order += 15;
            }
        }
        return order;
    }
    static compareNodes(node1, node2) {
        const order1 = NavigatorView.nodeOrder(node1);
        const order2 = NavigatorView.nodeOrder(node2);
        if (order1 > order2) {
            return 1;
        }
        if (order1 < order2) {
            return -1;
        }
        return 0;
    }
    static appendSearchItem(contextMenu, path) {
        const searchLabel = path ? i18nString(UIStrings.searchInFolder) : i18nString(UIStrings.searchInAllFiles);
        const searchSources = new SearchSources(path && `file:${path}`);
        contextMenu.viewSection().appendItem(searchLabel, () => Common.Revealer.reveal(searchSources), { jslogContext: path ? 'search-in-folder' : 'search-in-all-files' });
    }
    treeElementsCompare(treeElement1, treeElement2) {
        const node1 = this.nodeForTreeElement(treeElement1);
        const node2 = this.nodeForTreeElement(treeElement2);
        if (node1 && node2) {
            const order = NavigatorView.compareNodes(node1, node2);
            if (order !== 0) {
                return order;
            }
        }
        return Platform.StringUtilities.naturalOrderComparator(treeElement1.titleAsText(), treeElement2.titleAsText());
    }
    performUpdate() {
        if (!this.#initialized) {
            this.#initialized = true;
            this.initGrouping();
            this.resetWorkspace(this.#workspace);
            this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
        }
        this.#view({
            treeElement: this.scriptsTree.element,
            showTree: Boolean(this.scriptsTree.firstChild()),
        }, undefined, this.contentElement);
    }
    onBindingChanged(event) {
        const binding = event.data;
        let isFromSourceMap = false;
        // Update UISourceCode titles.
        const networkNodes = this.uiSourceCodeNodes.get(binding.network);
        for (const networkNode of networkNodes) {
            networkNode.updateTitle();
            isFromSourceMap ||= networkNode.uiSourceCode().contentType().isFromSourceMap();
        }
        const fileSystemNodes = this.uiSourceCodeNodes.get(binding.fileSystem);
        for (const fileSystemNode of fileSystemNodes) {
            fileSystemNode.updateTitle();
            isFromSourceMap ||= fileSystemNode.uiSourceCode().contentType().isFromSourceMap();
        }
        // Update folder titles.
        const pathTokens = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
        let folderPath = Platform.DevToolsPath.EmptyEncodedPathString;
        for (let i = 0; i < pathTokens.length - 1; ++i) {
            folderPath = Common.ParsedURL.ParsedURL.concatenate(folderPath, pathTokens[i]);
            const folderId = this.folderNodeId(binding.fileSystem.project(), null, null, binding.fileSystem.origin(), isFromSourceMap, folderPath);
            const folderNode = this.subfolderNodes.get(folderId);
            if (folderNode) {
                folderNode.updateTitle();
            }
            folderPath = Common.ParsedURL.ParsedURL.concatenate(folderPath, '/');
        }
        // Update fileSystem root title.
        const fileSystemRoot = this.rootOrDeployedNode().child(binding.fileSystem.project().id());
        if (fileSystemRoot) {
            fileSystemRoot.updateTitle();
        }
    }
    #onRequestsForHeaderOverridesFileChanged(event) {
        const headersFileUiSourceCode = event.data;
        const networkNodes = this.uiSourceCodeNodes.get(headersFileUiSourceCode);
        for (const networkNode of networkNodes) {
            networkNode.updateTitle();
        }
    }
    focus() {
        this.scriptsTree.focus();
    }
    selectNode(node, omitFocus, selectedByUser) {
        node.treeNode().select(omitFocus, selectedByUser);
    }
    expandNode(node) {
        node.treeNode().expand();
    }
    collapseNode(node) {
        node.treeNode().collapse();
    }
    isNodeExpanded(node) {
        return this.expandedNodes.has(node);
    }
    isNodeSelected(node) {
        return this.selectedNode === node;
    }
    setNodeSelected(node) {
        this.selectedNode = node;
    }
    setNodeExpanded(node) {
        this.expandedNodes.add(node);
    }
    setNodeForTreeElement(treeElement, node) {
        this.treeElementNodes.set(treeElement, node);
    }
    nodeForTreeElement(treeElement) {
        return this.treeElementNodes.get(treeElement);
    }
    /**
     * Central place to add elements to the tree to
     * enable focus if the tree has elements
     */
    appendChild(parent, child) {
        this.scriptsTree.setFocusable(true);
        parent.appendChild(child);
    }
    /**
     * Central place to remove elements from the tree to
     * disable focus if the tree is empty
     */
    removeChild(parent, child) {
        parent.removeChild(child);
        if (!this.scriptsTree.selectedTreeElement) {
            this.selectedNode = null;
        }
        if (this.scriptsTree.rootElement().childCount() === 0) {
            this.scriptsTree.setFocusable(false);
        }
    }
    resetWorkspace(workspace) {
        // Clear old event listeners first.
        if (this.#workspace) {
            this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
            this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
        }
        this.#workspace = workspace;
        this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
        this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
        this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
        this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
        this.#workspace.projects().forEach(this.projectAdded.bind(this));
        this.computeUniqueFileSystemProjectNames();
    }
    projectAddedCallback(event) {
        const project = event.data;
        this.projectAdded(project);
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            this.computeUniqueFileSystemProjectNames();
        }
    }
    projectRemovedCallback(event) {
        const project = event.data;
        this.removeProject(project);
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            this.computeUniqueFileSystemProjectNames();
        }
    }
    acceptProject(project) {
        if (this.#projectFilter) {
            return this.#projectFilter(project);
        }
        return !project.isServiceProject();
    }
    frameAttributionAdded(event) {
        const { uiSourceCode } = event.data;
        if (!this.acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        const addedFrame = event.data.frame;
        // This event does not happen for UISourceCodes without initial attribution.
        this.addUISourceCodeNode(uiSourceCode, addedFrame);
    }
    frameAttributionRemoved(event) {
        const { uiSourceCode } = event.data;
        if (!this.acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        const removedFrame = event.data.frame;
        const node = Array.from(this.uiSourceCodeNodes.get(uiSourceCode)).find(node => node.frame() === removedFrame);
        if (node) {
            this.removeUISourceCodeNode(node);
        }
    }
    acceptsUISourceCode(uiSourceCode) {
        return this.acceptProject(uiSourceCode.project());
    }
    addUISourceCode(uiSourceCode) {
        if (this.navigatorJustMyCodeSetting.get() &&
            Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode)) {
            return;
        }
        if (!this.acceptsUISourceCode(uiSourceCode)) {
            return;
        }
        if (uiSourceCode.isFetchXHR()) {
            return;
        }
        const frames = Bindings.NetworkProject.NetworkProject.framesForUISourceCode(uiSourceCode);
        if (frames.length) {
            for (const frame of frames) {
                this.addUISourceCodeNode(uiSourceCode, frame);
            }
        }
        else {
            this.addUISourceCodeNode(uiSourceCode, null);
        }
        this.dispatchEventToListeners("ui-source-code-added" /* Events.UI_SOURCE_CODE_ADDED */, uiSourceCode);
    }
    addUISourceCodeNode(uiSourceCode, frame) {
        const isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
        let path;
        if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
            path = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
        }
        else {
            path = Common.ParsedURL.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1);
        }
        const project = uiSourceCode.project();
        const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        const folderNode = this.folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
        const uiSourceCodeNode = new NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
        const existingNode = folderNode.child(uiSourceCodeNode.id);
        if (existingNode && existingNode instanceof NavigatorUISourceCodeTreeNode) {
            this.uiSourceCodeNodes.set(uiSourceCode, existingNode);
        }
        else {
            folderNode.appendChild(uiSourceCodeNode);
            this.uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
            uiSourceCodeNode.updateTitleBubbleUp();
        }
        this.selectDefaultTreeNode();
    }
    uiSourceCodeAddedCallback(event) {
        const uiSourceCode = event.data;
        this.addUISourceCode(uiSourceCode);
    }
    uiSourceCodeRemovedCallback(event) {
        this.removeUISourceCodes([event.data]);
    }
    tryAddProject(project) {
        this.projectAdded(project);
        for (const uiSourceCode of project.uiSourceCodes()) {
            this.addUISourceCode(uiSourceCode);
        }
    }
    projectAdded(project) {
        const rootOrDeployed = this.rootOrDeployedNode();
        const FILE_SYSTEM_TYPES = [
            Workspace.Workspace.projectTypes.ConnectableFileSystem,
            Workspace.Workspace.projectTypes.FileSystem,
        ];
        if (!this.acceptProject(project) || !FILE_SYSTEM_TYPES.includes(project.type()) ||
            Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) || rootOrDeployed.child(project.id())) {
            return;
        }
        const type = (project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem ||
            (project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem && project.fileSystem().automatic)) ?
            Types.AutomaticFileSystem :
            Types.FileSystem;
        rootOrDeployed.appendChild(new NavigatorGroupTreeNode(this, project, project.id(), type, project.displayName()));
        this.selectDefaultTreeNode();
    }
    // TODO(einbinder) remove this code after crbug.com/964075 is fixed
    selectDefaultTreeNode() {
        const children = this.rootNode.children();
        if (children.length && !this.selectedNode) {
            this.selectNode(children[0], true /* omitFocus */, false /* selectedByUser */);
        }
    }
    computeUniqueFileSystemProjectNames() {
        const fileSystemProjects = this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
        if (!fileSystemProjects.length) {
            return;
        }
        const reversedIndex = Common.Trie.Trie.newArrayTrie();
        const reversedPaths = [];
        for (const project of fileSystemProjects) {
            const fileSystem = project;
            const reversedPathParts = fileSystem.fileSystemPath().split('/').reverse();
            reversedPaths.push(reversedPathParts);
            reversedIndex.add(reversedPathParts);
        }
        const rootOrDeployed = this.rootOrDeployedNode();
        for (let i = 0; i < fileSystemProjects.length; ++i) {
            const reversedPath = reversedPaths[i];
            const project = fileSystemProjects[i];
            reversedIndex.remove(reversedPath);
            const commonPrefix = reversedIndex.longestPrefix(reversedPath, false /* fullWordOnly */);
            reversedIndex.add(reversedPath);
            const prefixPath = reversedPath.slice(0, commonPrefix.length + 1);
            const path = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(prefixPath.reverse().join('/'));
            const fileSystemNode = rootOrDeployed.child(project.id());
            if (fileSystemNode) {
                fileSystemNode.setTitle(path);
            }
        }
    }
    removeProject(project) {
        this.removeUISourceCodes(project.uiSourceCodes());
        if (project.type() !== Workspace.Workspace.projectTypes.ConnectableFileSystem &&
            project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return;
        }
        const fileSystemNode = this.rootNode.child(project.id());
        if (!fileSystemNode) {
            return;
        }
        this.rootNode.removeChild(fileSystemNode);
    }
    folderNodeId(project, target, frame, projectOrigin, isFromSourceMap, path) {
        const projectId = project.type() === Workspace.Workspace.projectTypes.FileSystem ? project.id() : '';
        let targetId = target && !(this.groupByAuthored && isFromSourceMap) ? target.id() : '';
        let frameId = this.groupByFrame && frame ? frame.id : '';
        if (this.groupByAuthored) {
            if (isFromSourceMap) {
                targetId = 'Authored';
                frameId = '';
            }
            else {
                targetId = 'Deployed:' + targetId;
            }
        }
        return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
    }
    folderNode(uiSourceCode, project, target, frame, projectOrigin, path, fromSourceMap) {
        if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
            return this.rootNode;
        }
        if (target && !this.groupByFolder && !fromSourceMap) {
            return this.domainNode(uiSourceCode, project, target, frame, projectOrigin);
        }
        const folderPath = Common.ParsedURL.ParsedURL.join(path, '/');
        const folderId = this.folderNodeId(project, target, frame, projectOrigin, fromSourceMap, folderPath);
        let folderNode = this.subfolderNodes.get(folderId);
        if (folderNode) {
            return folderNode;
        }
        if (!path.length) {
            if (target) {
                return this.domainNode(uiSourceCode, project, target, frame, projectOrigin);
            }
            return this.rootOrDeployedNode().child(project.id());
        }
        const parentNode = this.folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
        let type = Types.NetworkFolder;
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            type = Types.FileSystemFolder;
        }
        const name = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path[path.length - 1]);
        folderNode = new NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name, projectOrigin);
        this.subfolderNodes.set(folderId, folderNode);
        parentNode.appendChild(folderNode);
        return folderNode;
    }
    domainNode(uiSourceCode, project, target, frame, projectOrigin) {
        const isAuthored = uiSourceCode.contentType().isFromSourceMap();
        const frameNode = this.frameNode(project, target, frame, isAuthored);
        if (!this.groupByDomain) {
            return frameNode;
        }
        let domainNode = frameNode.child(projectOrigin);
        if (domainNode) {
            return domainNode;
        }
        domainNode = new NavigatorGroupTreeNode(this, project, projectOrigin, Types.Domain, this.computeProjectDisplayName(target, projectOrigin));
        if (frame && projectOrigin === Common.ParsedURL.ParsedURL.extractOrigin(frame.url)) {
            domainNode.boostOrder = true;
        }
        frameNode.appendChild(domainNode);
        if (isAuthored && this.groupByAuthored) {
            this.expandNode(domainNode);
        }
        return domainNode;
    }
    frameNode(project, target, frame, isAuthored) {
        if (!this.groupByFrame || !frame || (this.groupByAuthored && isAuthored)) {
            return this.targetNode(project, target, isAuthored);
        }
        let frameNode = this.frameNodes.get(frame);
        if (frameNode) {
            return frameNode;
        }
        frameNode = new NavigatorGroupTreeNode(this, project, target.id() + ':' + frame.id, Types.Frame, frame.displayName(), undefined, frame);
        this.frameNodes.set(frame, frameNode);
        const parentFrame = frame.parentFrame();
        if (!parentFrame) {
            frameNode.boostOrder = true;
        }
        this.frameNode(project, parentFrame ? parentFrame.resourceTreeModel().target() : target, parentFrame, isAuthored)
            .appendChild(frameNode);
        if (!parentFrame) {
            this.expandNode(frameNode);
        }
        return frameNode;
    }
    targetNode(project, target, isAuthored) {
        if (this.groupByAuthored && isAuthored) {
            if (!this.authoredNode) {
                this.authoredNode = new NavigatorGroupTreeNode(this, null, 'group:Authored', Types.Authored, i18nString(UIStrings.authored), i18nString(UIStrings.authoredTooltip));
                this.rootNode.appendChild(this.authoredNode);
                this.expandNode(this.authoredNode);
            }
            return this.authoredNode;
        }
        const rootOrDeployed = this.rootOrDeployedNode();
        if (target === SDK.TargetManager.TargetManager.instance().scopeTarget()) {
            return rootOrDeployed;
        }
        let targetNode = rootOrDeployed.child('target:' + target.id());
        if (!targetNode) {
            targetNode = new NavigatorGroupTreeNode(this, project, 'target:' + target.id(), target.type() === SDK.Target.Type.FRAME ? Types.Frame : Types.Worker, target.name());
            rootOrDeployed.appendChild(targetNode);
        }
        return targetNode;
    }
    rootOrDeployedNode() {
        if (this.groupByAuthored) {
            if (!this.deployedNode) {
                this.deployedNode = new NavigatorGroupTreeNode(this, null, 'group:Deployed', Types.Deployed, i18nString(UIStrings.deployed), i18nString(UIStrings.deployedTooltip));
                this.rootNode.appendChild(this.deployedNode);
            }
            return this.deployedNode;
        }
        return this.rootNode;
    }
    computeProjectDisplayName(target, projectOrigin) {
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
        let matchingContextName = null;
        for (const context of executionContexts) {
            if (!context.origin || !projectOrigin.startsWith(context.origin)) {
                continue;
            }
            // If the project origin matches the default context origin then we should break out and use the
            // project origin for the display name.
            if (context.isDefault) {
                matchingContextName = null;
                break;
            }
            if (!context.name) {
                continue;
            }
            matchingContextName = context.name;
        }
        if (matchingContextName) {
            return matchingContextName;
        }
        if (!projectOrigin) {
            return i18nString(UIStrings.noDomain);
        }
        const parsedURL = new Common.ParsedURL.ParsedURL(projectOrigin);
        const prettyURL = parsedURL.isValid ? parsedURL.host + (parsedURL.port ? (':' + parsedURL.port) : '') : '';
        return (prettyURL || projectOrigin);
    }
    revealUISourceCode(uiSourceCode, select) {
        const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
        if (nodes.size === 0) {
            return null;
        }
        const node = nodes.values().next().value;
        if (!node) {
            return null;
        }
        if (this.selectedNode) {
            // If the tree outline is being marked as "being edited" (i.e. we're renaming a file
            // or choosing the name for a new snippet), we shall not proceed with revealing here,
            // as that will steal focus from the input widget and thus cancel editing. The
            // test/e2e/snippets/breakpoint.test.ts exercises this.
            if (UI.UIUtils.isBeingEdited(this.scriptsTree.element)) {
                return null;
            }
            this.selectedNode.treeNode().deselect();
            this.selectedNode = null;
        }
        // TODO(dgozman): figure out revealing multiple.
        node.reveal(select);
        return node;
    }
    sourceSelected(uiSourceCode, focusSource) {
        this.dispatchEventToListeners("source-selected" /* Events.SOURCE_SELECTED */, { uiSourceCode, focusSource });
        void Common.Revealer.reveal(uiSourceCode, !focusSource);
    }
    #isUISourceCodeOrAnyAncestorSelected(node) {
        let currentNode = node;
        while (currentNode) {
            if (currentNode === this.selectedNode) {
                return true;
            }
            currentNode = currentNode.parent;
            if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
                break;
            }
        }
        return false;
    }
    removeUISourceCodes(uiSourceCodes) {
        const nodesWithSelectionOnPath = [];
        // First we remove source codes without any selection on their path to root, and only then
        // the ones with selection. This to avoid layout work associated with moving the selection
        // around (crbug.com/1409025).
        for (const uiSourceCode of uiSourceCodes) {
            const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
            for (const node of nodes) {
                if (this.#isUISourceCodeOrAnyAncestorSelected(node)) {
                    nodesWithSelectionOnPath.push(node);
                }
                else {
                    this.removeUISourceCodeNode(node);
                }
            }
        }
        nodesWithSelectionOnPath.forEach(this.removeUISourceCodeNode.bind(this));
    }
    removeUISourceCodeNode(node) {
        const uiSourceCode = node.uiSourceCode();
        this.uiSourceCodeNodes.delete(uiSourceCode, node);
        const project = uiSourceCode.project();
        const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        let frame = node.frame();
        let parentNode = node.parent;
        if (!parentNode) {
            return;
        }
        parentNode.removeChild(node);
        let currentNode = parentNode;
        while (currentNode) {
            parentNode = currentNode.parent;
            if (!parentNode) {
                break;
            }
            if ((parentNode === this.rootNode || parentNode === this.deployedNode) &&
                project.type() === Workspace.Workspace.projectTypes.FileSystem) {
                break;
            }
            if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
                break;
            }
            if (!currentNode.isEmpty()) {
                currentNode.updateTitleBubbleUp();
                break;
            }
            if (currentNode.type === Types.Frame) {
                this.discardFrame(frame, Boolean(this.groupByAuthored) && uiSourceCode.contentType().isFromSourceMap());
                frame = frame.parentFrame();
            }
            else {
                const folderId = this.folderNodeId(project, target, frame, uiSourceCode.origin(), uiSourceCode.contentType().isFromSourceMap(), currentNode instanceof NavigatorFolderTreeNode && currentNode.folderPath ||
                    Platform.DevToolsPath.EmptyEncodedPathString);
                this.subfolderNodes.delete(folderId);
                parentNode.removeChild(currentNode);
            }
            if (currentNode === this.authoredNode) {
                this.authoredNode = undefined;
            }
            else if (currentNode === this.deployedNode) {
                this.deployedNode = undefined;
            }
            currentNode = parentNode;
        }
    }
    reset(tearDownOnly) {
        for (const node of this.uiSourceCodeNodes.valuesArray()) {
            node.dispose();
        }
        this.scriptsTree.removeChildren();
        this.scriptsTree.setFocusable(false);
        this.selectedNode = null;
        this.expandedNodes = new WeakSet();
        this.uiSourceCodeNodes.clear();
        this.subfolderNodes.clear();
        this.frameNodes.clear();
        this.rootNode.reset();
        this.authoredNode = undefined;
        this.deployedNode = undefined;
        if (!tearDownOnly) {
            // Reset the workspace to repopulate filesystem folders.
            this.resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
        }
    }
    async renameShortcut() {
        if (!(this.selectedNode instanceof NavigatorUISourceCodeTreeNode) ||
            !this.selectedNode.uiSourceCode().canRename()) {
            return false;
        }
        this.rename(this.selectedNode, false);
        return true;
    }
    handleContextMenuCreate(project, path, uiSourceCode) {
        if (uiSourceCode) {
            const relativePath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
            relativePath.pop();
            path = Common.ParsedURL.ParsedURL.join(relativePath, '/');
        }
        void this.create(project, path, uiSourceCode);
    }
    handleContextMenuRename(node) {
        this.rename(node, false);
    }
    async handleContextMenuExclude(project, path) {
        const shouldExclude = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.folderWillNotBeShown), i18nString(UIStrings.excludeThisFolder), undefined, { jslogContext: 'exclude-folder-confirmation' });
        if (shouldExclude) {
            UI.UIUtils.startBatchUpdate();
            project.excludeFolder(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path));
            UI.UIUtils.endBatchUpdate();
        }
    }
    async handleContextMenuDelete(uiSourceCode) {
        const shouldDelete = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.actionCannotBeUndone), i18nString(UIStrings.deleteThisFile), undefined, { jslogContext: 'delete-file-confirmation' });
        if (shouldDelete) {
            uiSourceCode.project().deleteFile(uiSourceCode);
        }
    }
    fileDragStarted(node, event) {
        if (!event.dataTransfer) {
            return;
        }
        event.dataTransfer.setData('text/plain', node.uiSourceCode().url());
        event.dataTransfer.effectAllowed = 'copy';
    }
    shouldRenameOnMouseDown(node) {
        if (!node.uiSourceCode().canRename() || !node.treeElement) {
            return false;
        }
        return this.selectedNode === node && this.scriptsTree.element.hasFocus() &&
            !UI.UIUtils.isBeingEdited(this.scriptsTree.element);
    }
    handleFileContextMenu(event, node) {
        const uiSourceCode = node.uiSourceCode();
        if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
            const contextMenu = new UI.ContextMenu.ContextMenu(event);
            contextMenu.headerSection().appendItem(i18nString(UIStrings.run), () => Snippets.ScriptSnippetFileSystem.evaluateScriptSnippet(uiSourceCode), { jslogContext: 'run' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.rename), () => this.rename(node, false), { jslogContext: 'rename' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.remove), () => uiSourceCode.project().deleteFile(uiSourceCode), { jslogContext: 'remove' });
            contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this.handleSaveAs.bind(this, uiSourceCode), { jslogContext: 'save-as' });
            void contextMenu.show();
            return;
        }
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(uiSourceCode);
        const project = uiSourceCode.project();
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.rename), this.handleContextMenuRename.bind(this, node), { jslogContext: 'rename' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.makeACopy), this.handleContextMenuCreate.bind(this, project, Platform.DevToolsPath.EmptyEncodedPathString, uiSourceCode), { jslogContext: 'make-a-copy' });
            contextMenu.editSection().appendItem(i18nString(UIStrings.delete), this.handleContextMenuDelete.bind(this, uiSourceCode), { jslogContext: 'delete' });
        }
        void contextMenu.show();
    }
    async handleSaveAs(uiSourceCode) {
        uiSourceCode.commitWorkingCopy();
        const contentData = await uiSourceCode.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            console.error(`Failed to retrieve content for ${uiSourceCode.url()}: ${contentData}`);
            Common.Console.Console.instance().error(i18nString(UIStrings.saveAsFailed), /* show=*/ false);
            return;
        }
        await Workspace.FileManager.FileManager.instance().save(this.addJSExtension(uiSourceCode.url()), contentData, 
        /* forceSaveAs=*/ true);
        Workspace.FileManager.FileManager.instance().close(uiSourceCode.url());
    }
    addJSExtension(url) {
        return Common.ParsedURL.ParsedURL.concatenate(url, '.js');
    }
    async handleDeleteFolder(node) {
        const shouldRemove = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.actionCannotBeUndone), i18nString(UIStrings.deleteFolder), undefined, { jslogContext: 'delete-folder-confirmation' });
        if (shouldRemove) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideTabDeleteFolderContextMenu);
            const topNode = this.findTopNonMergedNode(node);
            await this.removeUISourceCodeFromProject(topNode);
            await this.deleteDirectoryRecursively(topNode);
        }
    }
    async removeUISourceCodeFromProject(node) {
        node.children().slice(0).forEach(async (child) => {
            await this.removeUISourceCodeFromProject(child);
        });
        if (node instanceof NavigatorUISourceCodeTreeNode) {
            node.uiSourceCode().project().removeUISourceCode(node.uiSourceCode().url());
        }
    }
    async deleteDirectoryRecursively(node) {
        if (!(node instanceof NavigatorFolderTreeNode)) {
            return;
        }
        await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance()
            .project()
            ?.deleteDirectoryRecursively(node.folderPath);
    }
    findTopNonMergedNode(node) {
        // multiple folder nodes can be merged into one if it only contains one file
        // e.g. the folder of "abc.com/assets/css/button.css" can be "abc.com/assets/css"
        // find the top non-merged node (abc.com) recursively
        if (!node.isMerged) {
            return node;
        }
        if (!(node.parent instanceof NavigatorFolderTreeNode)) {
            return node;
        }
        return this.findTopNonMergedNode(node.parent);
    }
    folderHovered(node, hovered) {
        if (node instanceof NavigatorGroupTreeNode && node.frame) {
            if (hovered) {
                const overlayModel = node.frame.resourceTreeModel().target().model(SDK.OverlayModel.OverlayModel);
                if (overlayModel) {
                    overlayModel.highlightFrame(node.frame.id);
                }
            }
            else {
                SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
            }
        }
    }
    handleFolderContextMenu(event, node) {
        const path = node instanceof NavigatorFolderTreeNode ? node.folderPath : Platform.DevToolsPath.EmptyEncodedPathString;
        const project = node.project || null;
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        if (project?.type() !== Workspace.Workspace.projectTypes.ConnectableFileSystem) {
            NavigatorView.appendSearchItem(contextMenu, path);
        }
        if (!project) {
            return;
        }
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            const folderPath = Common.ParsedURL.ParsedURL.urlToRawPathString(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path), Host.Platform.isWin());
            contextMenu.revealSection().appendItem(i18nString(UIStrings.openFolder), () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(folderPath), { jslogContext: 'open-folder' });
            if (project.canCreateFile()) {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.newFile), () => {
                    this.handleContextMenuCreate(project, path, undefined);
                }, { jslogContext: 'new-file' });
            }
        }
        else if (node instanceof NavigatorFolderTreeNode && node.origin && node.folderPath) {
            const url = Common.ParsedURL.ParsedURL.concatenate(node.origin, '/', node.folderPath);
            const options = {
                isContentScript: node.recursiveProperties.exclusivelyContentScripts || false,
                isKnownThirdParty: node.recursiveProperties.exclusivelyThirdParty || false,
                isCurrentlyIgnoreListed: node.recursiveProperties.exclusivelyIgnored || false,
            };
            for (const { text, callback, jslogContext } of Workspace.IgnoreListManager.IgnoreListManager.instance()
                .getIgnoreListFolderContextMenuItems(url, options)) {
                contextMenu.defaultSection().appendItem(text, callback, { jslogContext });
            }
        }
        if (project.canExcludeFolder(path)) {
            contextMenu.defaultSection().appendItem(i18nString(UIStrings.excludeFolder), this.handleContextMenuExclude.bind(this, project, path), { jslogContext: 'exclude-folder' });
        }
        if (project.type() === Workspace.Workspace.projectTypes.ConnectableFileSystem) {
            const automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
            const { automaticFileSystem } = automaticFileSystemManager;
            if (automaticFileSystem?.state === 'disconnected') {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.connectFolderToWorkspace), async () => {
                    await automaticFileSystemManager.connectAutomaticFileSystem(
                    /* addIfMissing= */ true);
                }, { jslogContext: 'automatic-workspace-folders.connect' });
            }
        }
        if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
            if (Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) !==
                Persistence.PlatformFileSystem.PlatformFileSystemType.OVERRIDES) {
                if (node instanceof NavigatorGroupTreeNode) {
                    contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeFolderFromWorkspace), async () => {
                        const header = i18nString(UIStrings.areYouSureYouWantToRemoveThis, { PH1: node.title });
                        const shouldRemove = await UI.UIUtils.ConfirmDialog.show(i18nString(UIStrings.workspaceStopSyncing), header, undefined, {
                            okButtonLabel: i18nString(UIStrings.remove),
                            jslogContext: 'remove-folder-from-workspace-confirmation',
                        });
                        if (shouldRemove) {
                            project.remove();
                        }
                    }, { jslogContext: 'remove-folder-from-workspace' });
                }
            }
            else if (!(node instanceof NavigatorGroupTreeNode)) {
                contextMenu.defaultSection().appendItem(i18nString(UIStrings.delete), this.handleDeleteFolder.bind(this, node), { jslogContext: 'delete' });
            }
        }
        void contextMenu.show();
    }
    rename(node, creatingNewUISourceCode) {
        const uiSourceCode = node.uiSourceCode();
        node.rename(callback.bind(this));
        function callback(committed) {
            if (!creatingNewUISourceCode) {
                return;
            }
            if (!committed) {
                uiSourceCode.remove();
            }
            else if (node.treeElement?.listItemElement.hasFocus()) {
                this.sourceSelected(uiSourceCode, true);
            }
        }
    }
    async create(project, path, uiSourceCodeToCopy) {
        let content = '';
        if (uiSourceCodeToCopy) {
            const contentDataOrError = await uiSourceCodeToCopy.requestContentData();
            content = TextUtils.ContentData.ContentData.textOr(contentDataOrError, '');
        }
        const uiSourceCode = await project.createFile(path, null, content);
        if (!uiSourceCode) {
            return;
        }
        this.sourceSelected(uiSourceCode, false);
        const node = this.revealUISourceCode(uiSourceCode, true);
        if (node) {
            await this.updateComplete;
            this.rename(node, true);
        }
    }
    groupingChanged() {
        this.reset(true);
        this.initGrouping();
        // Reset the workspace to repopulate filesystem folders.
        this.resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
        this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    }
    ignoreListChanged() {
        if (this.navigatorJustMyCodeSetting.get()) {
            this.groupingChanged();
        }
        else {
            this.rootNode.updateTitleRecursive();
        }
    }
    initGrouping() {
        this.groupByFrame = true;
        this.groupByDomain = this.navigatorGroupByFolderSetting.get();
        this.groupByFolder = this.groupByDomain;
        if (this.navigatorGroupByAuthoredSetting) {
            this.groupByAuthored = this.navigatorGroupByAuthoredSetting.get();
        }
        else {
            this.groupByAuthored = false;
        }
    }
    resetForTest() {
        this.reset();
        this.#workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    }
    discardFrame(frame, isAuthored) {
        if (isAuthored) {
            return;
        }
        const node = this.frameNodes.get(frame);
        if (!node) {
            return;
        }
        if (node.parent) {
            node.parent.removeChild(node);
        }
        this.frameNodes.delete(frame);
        for (const child of frame.childFrames) {
            this.discardFrame(child, isAuthored);
        }
    }
    targetAdded(_target) {
    }
    targetRemoved(target) {
        const rootOrDeployed = this.rootOrDeployedNode();
        const targetNode = rootOrDeployed.child('target:' + target.id());
        if (targetNode) {
            rootOrDeployed.removeChild(targetNode);
        }
    }
    targetNameChanged(event) {
        const target = event.data;
        const targetNode = this.rootOrDeployedNode().child('target:' + target.id());
        if (targetNode) {
            targetNode.setTitle(target.name());
        }
    }
}
export class NavigatorFolderTreeElement extends UI.TreeOutline.TreeElement {
    nodeType;
    navigatorView;
    node;
    hovered;
    isIgnoreListed;
    constructor(navigatorView, type, title, expandable = true) {
        super('', expandable, NavigatorFolderTreeElement.#contextForType(type));
        this.listItemElement.classList.add('navigator-' + type + '-tree-item', 'navigator-folder-tree-item');
        UI.ARIAUtils.setLabel(this.listItemElement, `${title}, ${type}`);
        this.nodeType = type;
        this.title = title;
        this.tooltip = title;
        this.navigatorView = navigatorView;
        this.updateIcon();
    }
    updateIcon() {
        const iconType = NavigatorFolderTreeElement.#iconTypeForType(this.nodeType);
        this.setLeadingIcons([html `<devtools-icon name=${iconType}></devtools-icon>`]);
    }
    static #iconTypeForType(type) {
        switch (type) {
            case Types.Domain:
                return 'cloud';
            case Types.Frame:
                return 'frame';
            case Types.Worker:
                return 'gears';
            case Types.Authored:
                return 'code';
            case Types.Deployed:
                return 'deployed';
            case Types.AutomaticFileSystem:
                return 'folder-asterisk';
        }
        return 'folder';
    }
    onattach() {
        this.collapse();
        this.node.onattach();
        this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), false);
        this.listItemElement.addEventListener('mousemove', this.mouseMove.bind(this), false);
        this.listItemElement.addEventListener('mouseleave', this.mouseLeave.bind(this), false);
    }
    setIgnoreListed(isIgnoreListed) {
        if (this.isIgnoreListed !== isIgnoreListed) {
            this.isIgnoreListed = isIgnoreListed;
            this.listItemElement.classList.toggle('is-ignore-listed', isIgnoreListed);
            this.updateTooltip();
        }
    }
    setFromSourceMap(isFromSourceMap) {
        this.listItemElement.classList.toggle('is-from-source-map', isFromSourceMap);
    }
    setNode(node) {
        this.navigatorView.setNodeForTreeElement(this, node);
        this.node = node;
        this.updateTooltip();
        UI.ARIAUtils.setLabel(this.listItemElement, `${this.title}, ${this.nodeType}`);
        if (this.selected) {
            this.navigatorView.setNodeSelected(node);
        }
        if (this.expanded) {
            this.navigatorView.setNodeExpanded(node);
        }
    }
    updateTooltip() {
        if (this.node.tooltip) {
            this.tooltip = this.node.tooltip;
        }
        else {
            const paths = [];
            let currentNode = this.node;
            while (currentNode && !currentNode.isRoot() && currentNode.type === this.node.type) {
                paths.push(currentNode.title);
                currentNode = currentNode.parent;
            }
            paths.reverse();
            let tooltip = paths.join('/');
            if (this.isIgnoreListed) {
                tooltip = i18nString(UIStrings.sIgnoreListed, { PH1: tooltip });
            }
            this.tooltip = tooltip;
        }
    }
    handleContextMenuEvent(event) {
        if (!this.node || !(this.node instanceof NavigatorFolderTreeNode || this.node instanceof NavigatorGroupTreeNode)) {
            return;
        }
        this.navigatorView.selectNode(this.node);
        this.navigatorView.handleFolderContextMenu(event, this.node);
    }
    mouseMove(_event) {
        if (this.hovered || !this.node) {
            return;
        }
        this.hovered = true;
        this.navigatorView.folderHovered(this.node, true);
    }
    mouseLeave(_event) {
        if (!this.node) {
            return;
        }
        this.hovered = false;
        this.navigatorView.folderHovered(this.node, false);
    }
    static #contextForType(type) {
        switch (type) {
            case Types.Domain:
                return 'domain';
            case Types.Frame:
                return 'frame';
            case Types.Worker:
                return 'worker';
            case Types.Authored:
                return 'authored';
            case Types.Deployed:
                return 'deployed';
        }
        return 'folder';
    }
}
export class NavigatorTreeNode {
    id;
    navigatorView;
    type;
    boostOrder = false;
    populated;
    isMerged;
    parent;
    title;
    tooltip;
    recursiveProperties;
    #children = [];
    #childById = new Map();
    constructor(navigatorView, id, type, tooltip) {
        this.id = id;
        this.navigatorView = navigatorView;
        this.type = type;
        this.tooltip = tooltip;
        this.populated = false;
        this.isMerged = false;
        this.recursiveProperties = {
            exclusivelySourceMapped: null,
            exclusivelyIgnored: null,
            exclusivelyContentScripts: null,
            exclusivelyThirdParty: null,
        };
    }
    treeNode() {
        throw new Error('Not implemented');
    }
    dispose() {
    }
    updateTitle() {
    }
    updateTitleRecursive() {
        for (const child of this.children()) {
            child.updateTitleRecursive();
        }
        this.updateTitle();
    }
    updateTitleBubbleUp() {
        this.updateTitle();
        if (this.parent) {
            this.parent.updateTitleBubbleUp();
        }
    }
    isRoot() {
        return false;
    }
    hasChildren() {
        return true;
    }
    onattach() {
    }
    setTitle(_title) {
        throw new Error('Not implemented');
    }
    populate() {
        if (this.isPopulated()) {
            return;
        }
        if (this.parent) {
            this.parent.populate();
        }
        this.populated = true;
        this.wasPopulated();
    }
    wasPopulated() {
        const children = this.children();
        for (let i = 0; i < children.length; ++i) {
            this.navigatorView.appendChild(this.treeNode(), (children[i].treeNode()));
        }
    }
    didAddChild(node) {
        if (this.isPopulated()) {
            this.navigatorView.appendChild(this.treeNode(), (node.treeNode()));
        }
    }
    willRemoveChild(node) {
        if (this.isPopulated()) {
            this.navigatorView.removeChild(this.treeNode(), (node.treeNode()));
        }
    }
    isPopulated() {
        return this.populated;
    }
    isEmpty() {
        return !this.#children.length;
    }
    children() {
        return this.#children;
    }
    child(id) {
        return this.#childById.get(id) ?? null;
    }
    appendChild(node) {
        this.#children.push(node);
        this.#childById.set(node.id, node);
        node.parent = this;
        this.didAddChild(node);
    }
    removeChild(node) {
        this.willRemoveChild(node);
        const idx = this.#children.findIndex(n => n.id === node.id);
        if (idx >= 0) {
            this.#children.splice(idx, 1);
        }
        this.#childById.delete(node.id);
        node.parent = null;
        node.dispose();
    }
    reset() {
        this.#children = [];
        this.#childById.clear();
    }
    updateId(newId) {
        if (this.parent) {
            this.parent.#childById.delete(this.id);
            this.parent.#childById.set(newId, this);
        }
        this.id = newId;
    }
}
export class NavigatorRootTreeNode extends NavigatorTreeNode {
    constructor(navigatorView) {
        super(navigatorView, '', Types.Root);
    }
    isRoot() {
        return true;
    }
    treeNode() {
        return this.navigatorView.scriptsTree.rootElement();
    }
}
export class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
    #uiSourceCode;
    treeElement;
    eventListeners;
    #frame;
    constructor(navigatorView, uiSourceCode, frame) {
        super(navigatorView, 'UISourceCode:' + uiSourceCode.canonicalScriptId(), Types.File);
        this.#uiSourceCode = uiSourceCode;
        this.treeElement = null;
        this.eventListeners = [];
        this.#frame = frame;
        this.recursiveProperties.exclusivelySourceMapped = uiSourceCode.contentType().isFromSourceMap();
        if (uiSourceCode.contentType().isScript()) {
            // These properties affect ignore-listing menus and only matter when the UISourceCode is a script
            this.recursiveProperties.exclusivelyThirdParty = uiSourceCode.isKnownThirdParty();
            this.recursiveProperties.exclusivelyContentScripts =
                uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;
        }
    }
    frame() {
        return this.#frame;
    }
    uiSourceCode() {
        return this.#uiSourceCode;
    }
    updateIcon() {
        if (!this.treeElement) {
            return;
        }
        const icon = PanelUtils.getIconForSourceFile(this.#uiSourceCode);
        this.treeElement.setLeadingIcons([icon]);
    }
    updateAccessibleName() {
        if (!this.treeElement) {
            return;
        }
        UI.ARIAUtils.setLabel(this.treeElement.listItemElement, `${this.#uiSourceCode.name()}, ${this.type}`);
    }
    renderAiButton() {
        if (!UI.ActionRegistry.ActionRegistry.instance().hasAction('drjones.sources-floating-button')) {
            return null;
        }
        if (!this.#uiSourceCode.contentType().isTextType() ||
            Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.#uiSourceCode)) {
            return null;
        }
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('drjones.sources-floating-button');
        const icon = AiAssistance.AiUtils.getIconName();
        // clang-format off
        return html `<span class="ai-button-container">
      <devtools-floating-button
        .iconName=${icon}
        .title=${action.title()}
        .jslogContext=${'ask-ai'}
        @click=${{
            handleEvent: (ev) => {
                ev.stopPropagation();
                this.navigatorView.sourceSelected(this.#uiSourceCode, false);
                void action.execute();
            },
            capture: true,
        }}
        @mousedown=${{
            handleEvent: (ev) => {
                ev.stopPropagation();
            },
            capture: true,
        }}
      ></devtools-floating-button>
    </span>`;
        // clang-format on
    }
    updateTrailingIcons() {
        if (!this.treeElement) {
            return;
        }
        const aiButton = this.renderAiButton();
        this.treeElement.setTrailingIcons(aiButton ? [aiButton] : []);
    }
    onattach() {
        this.updateTrailingIcons();
    }
    treeNode() {
        if (this.treeElement) {
            return this.treeElement;
        }
        this.treeElement = new UI.TreeOutline.TreeElement('', false, this.#uiSourceCode.contentType().name());
        this.treeElement.listItemElement.classList.add('navigator-' + this.#uiSourceCode.contentType().name() + '-tree-item', 'navigator-file-tree-item');
        this.treeElement.listItemElement.draggable = true;
        this.treeElement.titleElement.setAttribute('jslog', `${VisualLogging.value('title').track({
            change: true,
        })}`);
        this.navigatorView.setNodeForTreeElement(this.treeElement, this);
        const treeElement = this.treeElement;
        treeElement.selectOnMouseDown = (event) => {
            if (event.which !== 1 || !this.navigatorView.shouldRenameOnMouseDown(this)) {
                UI.TreeOutline.TreeElement.prototype.selectOnMouseDown.call(treeElement, event);
                return;
            }
            window.setTimeout(() => {
                if (this.navigatorView.shouldRenameOnMouseDown(this)) {
                    this.navigatorView.rename(this, false);
                }
            }, 300);
        };
        treeElement.onspace = () => {
            this.navigatorView.sourceSelected(this.#uiSourceCode, true);
            return true;
        };
        treeElement.ondblclick = (event) => {
            const middleClick = event.button === 1;
            this.navigatorView.sourceSelected(this.#uiSourceCode, !middleClick);
            return false;
        };
        treeElement.onenter = () => {
            this.navigatorView.sourceSelected(this.#uiSourceCode, true);
            return true;
        };
        treeElement.ondelete = () => true;
        treeElement.onattach = () => {
            this.onattach();
        };
        treeElement.listItemElement.addEventListener('click', () => {
            this.navigatorView.sourceSelected(this.#uiSourceCode, false);
        }, false);
        treeElement.listItemElement.addEventListener('contextmenu', (event) => {
            this.navigatorView.selectNode(this);
            this.navigatorView.handleFileContextMenu(event, this);
        }, false);
        treeElement.listItemElement.addEventListener('dragstart', (event) => {
            this.navigatorView.fileDragStarted(this, event);
        }, false);
        window.dispatchEvent(new CustomEvent('source-tree-file-added', { bubbles: true, cancelable: true, detail: this.#uiSourceCode.fullDisplayName() }));
        this.updateTitle();
        const updateTitleBound = this.updateTitle.bind(this, undefined);
        this.eventListeners = [
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, updateTitleBound),
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
            this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound),
        ];
        return this.treeElement;
    }
    updateTitle(ignoreIsDirty) {
        const isIgnoreListed = Workspace.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(this.#uiSourceCode);
        if (this.#uiSourceCode.contentType().isScript() || isIgnoreListed) {
            this.recursiveProperties.exclusivelyIgnored = isIgnoreListed;
        }
        if (!this.treeElement) {
            return;
        }
        let titleText = this.#uiSourceCode.displayName();
        if (!ignoreIsDirty && this.#uiSourceCode.isDirty()) {
            titleText = '*' + titleText;
        }
        this.treeElement.title = titleText;
        this.updateIcon();
        this.updateTrailingIcons();
        this.treeElement.listItemElement.classList.toggle('is-ignore-listed', isIgnoreListed);
        let tooltip = this.#uiSourceCode.url();
        if (this.#uiSourceCode.contentType().isFromSourceMap()) {
            tooltip = i18nString(UIStrings.sFromSourceMap, { PH1: this.#uiSourceCode.displayName() });
        }
        if (isIgnoreListed) {
            tooltip = i18nString(UIStrings.sIgnoreListed, { PH1: tooltip });
        }
        this.treeElement.tooltip = tooltip;
        this.updateAccessibleName();
        this.updateId('UISourceCode:' + this.#uiSourceCode.canonicalScriptId());
    }
    hasChildren() {
        return false;
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.eventListeners);
    }
    reveal(select) {
        if (this.parent) {
            this.parent.populate();
            this.navigatorView.expandNode(this.parent);
        }
        if (this.treeElement) {
            this.treeElement.reveal(true);
            if (select) {
                this.navigatorView.selectNode(this, true);
            }
        }
    }
    rename(callback) {
        if (!this.treeElement) {
            return;
        }
        this.treeElement.listItemElement.focus();
        if (!this.treeElement.treeOutline) {
            return;
        }
        // Tree outline should be marked as edited as well as the tree element to prevent search from starting.
        const treeOutlineElement = this.treeElement.treeOutline.element;
        UI.UIUtils.markBeingEdited(treeOutlineElement, true);
        const commitHandler = (_element, newTitle, oldTitle) => {
            if (newTitle !== oldTitle) {
                if (this.treeElement) {
                    this.treeElement.title = newTitle;
                }
                // necessary cast to RawPathString as alternative would be altering type of Config<T>
                void this.#uiSourceCode.rename(newTitle).then(renameCallback);
                return;
            }
            afterEditing(true);
        };
        const renameCallback = (success) => {
            if (!success) {
                UI.UIUtils.markBeingEdited(treeOutlineElement, false);
                this.updateTitle();
                this.rename(callback);
                return;
            }
            if (this.treeElement) {
                const { parent } = this.treeElement;
                if (parent) {
                    parent.removeChild(this.treeElement);
                    parent.appendChild(this.treeElement);
                    this.navigatorView.selectNode(this);
                }
            }
            afterEditing(true);
        };
        const afterEditing = (committed) => {
            UI.UIUtils.markBeingEdited(treeOutlineElement, false);
            this.updateTitle();
            if (callback) {
                callback(committed);
            }
        };
        this.updateTitle(true);
        this.treeElement.startEditingTitle(new UI.InplaceEditor.Config(commitHandler, () => afterEditing(false), undefined));
    }
}
export class NavigatorFolderTreeNode extends NavigatorTreeNode {
    project;
    folderPath;
    origin;
    title;
    treeElement;
    constructor(navigatorView, project, id, type, folderPath, title, origin) {
        super(navigatorView, id, type);
        this.project = project;
        this.folderPath = folderPath;
        this.title = title;
        this.origin = origin;
    }
    treeNode() {
        if (this.treeElement) {
            return this.treeElement;
        }
        this.treeElement = this.createTreeElement(this.title, this);
        this.updateTitle();
        return this.treeElement;
    }
    updateTitle() {
        let propName;
        for (propName in this.recursiveProperties) {
            let propValue = null;
            for (const child of this.children()) {
                if (child.recursiveProperties[propName] === false) {
                    propValue = false;
                    break;
                }
                else if (child.recursiveProperties[propName]) {
                    propValue = true;
                }
            }
            this.recursiveProperties[propName] = propValue;
        }
        if (!this.treeElement) {
            return;
        }
        this.treeElement.setFromSourceMap(this.recursiveProperties.exclusivelySourceMapped || false);
        this.treeElement.setIgnoreListed(this.recursiveProperties.exclusivelyIgnored || false);
        if (!this.project || this.project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return;
        }
        const absoluteFileSystemPath = Common.ParsedURL.ParsedURL.concatenate(Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id()), '/', this.folderPath);
        const isOverrides = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(this.project) === 'overrides';
        const hasMappedFiles = isOverrides ?
            Common.Settings.Settings.instance()
                .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
                .get() :
            Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(absoluteFileSystemPath);
        this.treeElement.listItemElement.classList.toggle('has-mapped-files', hasMappedFiles);
    }
    createTreeElement(title, node) {
        const treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, title);
        treeElement.setNode(node);
        return treeElement;
    }
    wasPopulated() {
        if (this.treeElement?.node !== this) {
            return;
        }
        this.addChildrenRecursive();
    }
    addChildrenRecursive() {
        const children = this.children();
        for (let i = 0; i < children.length; ++i) {
            const child = children[i];
            this.didAddChild(child);
            if (child instanceof NavigatorFolderTreeNode) {
                child.addChildrenRecursive();
            }
        }
    }
    shouldMerge(node) {
        return this.type !== Types.Domain && node instanceof NavigatorFolderTreeNode;
    }
    didAddChild(node) {
        if (!this.treeElement) {
            return;
        }
        let children = this.children();
        if (children.length === 1 && this.shouldMerge(node)) {
            node.isMerged = true;
            this.treeElement.title = this.treeElement.title + '/' + node.title;
            node.treeElement = this.treeElement;
            node.updateTitle();
            this.treeElement.setNode(node);
            return;
        }
        let oldNode;
        if (children.length === 2) {
            oldNode = children[0] !== node ? children[0] : children[1];
        }
        if (oldNode?.isMerged) {
            oldNode.isMerged = false;
            const mergedToNodes = [];
            mergedToNodes.push(this);
            let treeNode = this;
            while (treeNode && treeNode.isMerged) {
                treeNode = treeNode.parent;
                if (treeNode) {
                    mergedToNodes.push(treeNode);
                }
            }
            mergedToNodes.reverse();
            const titleText = mergedToNodes.map(node => node.title).join('/');
            const nodes = [];
            treeNode = oldNode;
            do {
                nodes.push(treeNode);
                children = treeNode.children();
                treeNode = children.length === 1 ? children[0] : null;
            } while (treeNode?.isMerged);
            if (!this.isPopulated()) {
                this.treeElement.title = titleText;
                this.treeElement.setNode(this);
                for (let i = 0; i < nodes.length; ++i) {
                    nodes[i].treeElement = null;
                    nodes[i].isMerged = false;
                }
                this.updateTitle();
                return;
            }
            const oldTreeElement = this.treeElement;
            const treeElement = this.createTreeElement(titleText, this);
            for (let i = 0; i < mergedToNodes.length; ++i) {
                mergedToNodes[i].treeElement = treeElement;
                mergedToNodes[i].updateTitle();
            }
            if (oldTreeElement.parent) {
                this.navigatorView.appendChild(oldTreeElement.parent, treeElement);
            }
            const wasExpanded = this.navigatorView.isNodeExpanded(oldTreeElement.node);
            oldTreeElement.setNode(nodes[nodes.length - 1]);
            oldTreeElement.title = nodes.map(node => node.title).join('/');
            if (oldTreeElement.parent) {
                this.navigatorView.removeChild(oldTreeElement.parent, oldTreeElement);
            }
            this.navigatorView.appendChild(this.treeElement, oldTreeElement);
            if (wasExpanded) {
                this.navigatorView.expandNode(this);
            }
            this.updateTitle();
        }
        if (this.isPopulated()) {
            this.navigatorView.appendChild(this.treeElement, node.treeNode());
        }
    }
    willRemoveChild(node) {
        const actualNode = node;
        if (actualNode.isMerged || !this.isPopulated() || !this.treeElement || !actualNode.treeElement) {
            return;
        }
        this.navigatorView.removeChild(this.treeElement, actualNode.treeElement);
    }
}
export class NavigatorGroupTreeNode extends NavigatorTreeNode {
    project;
    title;
    frame;
    treeElement;
    constructor(navigatorView, project, id, type, title, tooltip, frame) {
        super(navigatorView, id, type, tooltip);
        this.project = project;
        this.title = title;
        this.frame = frame;
        this.populate();
    }
    treeNode() {
        if (this.treeElement) {
            return this.treeElement;
        }
        const expandable = !(this.project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem);
        this.treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, this.title, expandable);
        this.treeElement.setNode(this);
        this.updateTrailingIcons();
        return this.treeElement;
    }
    renderTrailingIcons() {
        if (!(this.project instanceof Persistence.AutomaticFileSystemWorkspaceBinding.FileSystem)) {
            return null;
        }
        const { automaticFileSystem, automaticFileSystemManager } = this.project;
        switch (automaticFileSystem?.state) {
            case 'connecting': {
                // clang-format off
                return html `<devtools-spinner></devtools-spinner>`;
                // clang-format on
            }
            case 'disconnected': {
                // clang-format off
                return html `<devtools-button
          .data=${{
                    variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
                    size: "MICRO" /* Buttons.Button.Size.MICRO */,
                    title: i18nString(UIStrings.connectFolderToWorkspace),
                    jslogContext: 'automatic-workspace-folders.connect',
                }}
          @click=${async (event) => {
                    event.consume();
                    await automaticFileSystemManager.connectAutomaticFileSystem(
                    /* addIfMissing= */ true);
                }}
        >${i18nString(UIStrings.connect)}</devtools-button>`;
                // clang-format on
            }
        }
        return null;
    }
    updateTrailingIcons() {
        if (!this.treeElement) {
            return;
        }
        const trailingIcon = this.renderTrailingIcons();
        this.treeElement.setTrailingIcons(trailingIcon ? [trailingIcon] : []);
    }
    onattach() {
        this.updateTitle();
    }
    updateTitle() {
        this.updateTrailingIcons();
        if (!this.treeElement || !this.project || this.project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
            return;
        }
        const fileSystemPath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this.project.id());
        const wasActive = this.treeElement.listItemElement.classList.contains('has-mapped-files');
        const isOverrides = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(this.project) === 'overrides';
        const isActive = isOverrides ?
            Common.Settings.Settings.instance()
                .resolve(Persistence.NetworkPersistenceManager.persistenceNetworkOverridesEnabledSettingDescriptor)
                .get() :
            Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(fileSystemPath);
        if (wasActive === isActive) {
            return;
        }
        this.treeElement.listItemElement.classList.toggle('has-mapped-files', isActive);
        if (this.treeElement.childrenListElement.hasFocus()) {
            return;
        }
        if (isActive) {
            this.navigatorView.expandNode(this);
        }
        else {
            this.navigatorView.collapseNode(this);
        }
    }
    setTitle(title) {
        this.title = title;
        if (this.treeElement) {
            this.treeElement.title = this.title;
        }
    }
}
//# sourceMappingURL=NavigatorView.js.map