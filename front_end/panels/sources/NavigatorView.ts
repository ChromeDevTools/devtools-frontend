/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Snippets from '../snippets/snippets.js';

import navigatorTreeStyles from './navigatorTree.css.js';
import navigatorViewStyles from './navigatorView.css.js';
import {SearchSources} from './SearchSourcesView.js';

const UIStrings = {
  /**
   *@description Text in Navigator View of the Sources panel
   */
  searchInFolder: 'Search in folder',
  /**
   *@description Search label in Navigator View of the Sources panel
   */
  searchInAllFiles: 'Search in all files',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  noDomain: '(no domain)',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  authored: 'Authored',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  authoredTooltip: 'Contains original sources',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  deployed: 'Deployed',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  deployedTooltip: 'Contains final sources the browser sees',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  areYouSureYouWantToExcludeThis: 'Are you sure you want to exclude this folder?',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  areYouSureYouWantToDeleteThis: 'Are you sure you want to delete this file?',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  rename: 'Rename…',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  makeACopy: 'Make a copy…',
  /**
   *@description Text to delete something
   */
  delete: 'Delete',
  /**
   *@description A button text to confirm an action to remove a folder. This is not the same as delete. It removes the folder from UI but do not delete them.
   */
  remove: 'Remove',
  /**
   *@description Text in Navigator View of the Sources panel
   */
  areYouSureYouWantToDeleteFolder: 'Are you sure you want to delete this folder and its contents?',
  /**
   *@description Text in Navigator View of the Sources panel. A confirmation message on action to delete a folder.
   */
  actionCannotBeUndone: 'This action cannot be undone.',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  openFolder: 'Open folder',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  newFile: 'New file',
  /**
   *@description A context menu item in the Navigator View of the Sources panel to exclude a folder from workspace
   */
  excludeFolder: 'Exclude from workspace',
  /**
   *@description A context menu item in the Navigator View of the Sources panel
   */
  removeFolderFromWorkspace: 'Remove from workspace',
  /**
   *@description Text in Navigator View of the Sources panel
   * @example {a-folder-name} PH1
   */
  areYouSureYouWantToRemoveThis: 'Remove ‘{PH1}’ from Workspace?',
  /**
   *@description Text in Navigator View of the Sources panel. Warning message when user remove a folder.
   */
  workspaceStopSyncing: 'This will stop syncing changes from DevTools to your sources.',
  /**
   *@description Name of an item from source map
   *@example {compile.html} PH1
   */
  sFromSourceMap: '{PH1} (from source map)',
  /**
   *@description Name of an item that is on the ignore list
   *@example {compile.html} PH1
   */
  sIgnoreListed: '{PH1} (ignore listed)',
};

const str_ = i18n.i18n.registerUIStrings('panels/sources/NavigatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const Types = {
  Authored: 'authored',
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
  [Types.FileSystem, 100],
]);

export class NavigatorView extends UI.Widget.VBox implements SDK.TargetManager.Observer {
  private placeholder: UI.Widget.Widget|null;
  scriptsTree: UI.TreeOutline.TreeOutlineInShadow;
  private readonly uiSourceCodeNodes:
      Platform.MapUtilities.Multimap<Workspace.UISourceCode.UISourceCode, NavigatorUISourceCodeTreeNode>;
  private readonly subfolderNodes: Map<string, NavigatorFolderTreeNode>;
  private readonly rootNode: NavigatorRootTreeNode;
  private readonly frameNodes: Map<SDK.ResourceTreeModel.ResourceTreeFrame, NavigatorGroupTreeNode>;
  private authoredNode?: NavigatorGroupTreeNode;
  private deployedNode?: NavigatorGroupTreeNode;
  private navigatorGroupByFolderSetting: Common.Settings.Setting<boolean>;
  private navigatorGroupByAuthoredExperiment?: string;
  private workspaceInternal!: Workspace.Workspace.WorkspaceImpl;
  private groupByFrame?: boolean;
  private groupByAuthored?: boolean;
  private groupByDomain?: boolean;
  private groupByFolder?: boolean;
  constructor(jslogContext: string, enableAuthoredGrouping?: boolean) {
    super(true);

    this.placeholder = null;
    this.scriptsTree = new UI.TreeOutline.TreeOutlineInShadow(UI.TreeOutline.TreeVariant.NAVIGATION_TREE);

    this.scriptsTree.hideOverflow();
    this.scriptsTree.setComparator(NavigatorView.treeElementsCompare);
    this.scriptsTree.setFocusable(false);
    this.contentElement.setAttribute('jslog', `${VisualLogging.pane(jslogContext).track({resize: true})}`);
    this.contentElement.appendChild(this.scriptsTree.element);
    this.setDefaultFocusedElement(this.scriptsTree.element);

    this.uiSourceCodeNodes = new Platform.MapUtilities.Multimap();
    this.subfolderNodes = new Map();

    this.rootNode = new NavigatorRootTreeNode(this);
    this.rootNode.populate();

    this.frameNodes = new Map();

    this.contentElement.addEventListener('contextmenu', this.handleContextMenu.bind(this), false);
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(
        this.contentElement, {'sources.rename': this.renameShortcut.bind(this)});

    this.navigatorGroupByFolderSetting = Common.Settings.Settings.instance().moduleSetting('navigator-group-by-folder');
    this.navigatorGroupByFolderSetting.addChangeListener(this.groupingChanged.bind(this));
    if (enableAuthoredGrouping) {
      this.navigatorGroupByAuthoredExperiment = Root.Runtime.ExperimentName.AUTHORED_DEPLOYED_GROUPING;
    }

    Bindings.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.ignoreListChanged.bind(this));

    this.initGrouping();

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingCreated, this.onBindingChanged, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this.onBindingChanged, this);
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener(
        Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED,
        this.#onRequestsForHeaderOverridesFileChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NAME_CHANGED, this.targetNameChanged, this);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this.resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
    this.workspaceInternal.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    Bindings.NetworkProject.NetworkProjectManager.instance().addEventListener(
        Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_ADDED, this.frameAttributionAdded, this);
    Bindings.NetworkProject.NetworkProjectManager.instance().addEventListener(
        Bindings.NetworkProject.Events.FRAME_ATTRIBUTION_REMOVED, this.frameAttributionRemoved, this);
  }

  private static treeElementOrder(treeElement: UI.TreeOutline.TreeElement): number {
    if (boostOrderForNode.has(treeElement)) {
      return 0;
    }

    const actualElement = (treeElement as NavigatorSourceTreeElement);

    let order = TYPE_ORDERS.get(actualElement.nodeType) || 0;
    if (actualElement.uiSourceCode) {
      const contentType = actualElement.uiSourceCode.contentType();
      if (contentType.isDocument()) {
        order += 3;
      } else if (contentType.isScript()) {
        order += 5;
      } else if (contentType.isStyleSheet()) {
        order += 10;
      } else {
        order += 15;
      }
    }

    return order;
  }

  static appendSearchItem(contextMenu: UI.ContextMenu.ContextMenu, path: string): void {
    const searchLabel = path ? i18nString(UIStrings.searchInFolder) : i18nString(UIStrings.searchInAllFiles);
    const searchSources = new SearchSources(path && `file:${path}`);
    contextMenu.viewSection().appendItem(
        searchLabel, () => Common.Revealer.reveal(searchSources),
        {jslogContext: path ? 'search-in-folder' : 'search-in-all-files'});
  }

  private static treeElementsCompare(
      treeElement1: UI.TreeOutline.TreeElement, treeElement2: UI.TreeOutline.TreeElement): number {
    const typeWeight1 = NavigatorView.treeElementOrder(treeElement1);
    const typeWeight2 = NavigatorView.treeElementOrder(treeElement2);

    if (typeWeight1 > typeWeight2) {
      return 1;
    }
    if (typeWeight1 < typeWeight2) {
      return -1;
    }
    return Platform.StringUtilities.naturalOrderComparator(treeElement1.titleAsText(), treeElement2.titleAsText());
  }

  setPlaceholder(placeholder: UI.Widget.Widget): void {
    console.assert(!this.placeholder, 'A placeholder widget was already set');
    this.placeholder = placeholder;
    placeholder.show(this.contentElement, this.contentElement.firstChild);
    updateVisibility.call(this);
    this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementAttached, updateVisibility.bind(this));
    this.scriptsTree.addEventListener(UI.TreeOutline.Events.ElementsDetached, updateVisibility.bind(this));

    function updateVisibility(this: NavigatorView): void {
      const showTree = this.scriptsTree.firstChild();
      if (showTree) {
        placeholder.hideWidget();
      } else {
        placeholder.showWidget();
      }
      this.scriptsTree.element.classList.toggle('hidden', !showTree);
    }
  }

  private onBindingChanged(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
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
    const pathTokens =
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
    let folderPath = Platform.DevToolsPath.EmptyEncodedPathString;
    for (let i = 0; i < pathTokens.length - 1; ++i) {
      folderPath = Common.ParsedURL.ParsedURL.concatenate(folderPath, pathTokens[i]);
      const folderId = this.folderNodeId(
          binding.fileSystem.project(), null, null, binding.fileSystem.origin(), isFromSourceMap, folderPath);
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

  #onRequestsForHeaderOverridesFileChanged(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const headersFileUiSourceCode = event.data;
    const networkNodes = this.uiSourceCodeNodes.get(headersFileUiSourceCode);
    for (const networkNode of networkNodes) {
      networkNode.updateTitle();
    }
  }

  override focus(): void {
    this.scriptsTree.focus();
  }

  /**
   * Central place to add elements to the tree to
   * enable focus if the tree has elements
   */
  appendChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void {
    this.scriptsTree.setFocusable(true);
    parent.appendChild(child);
  }

  /**
   * Central place to remove elements from the tree to
   * disable focus if the tree is empty
   */
  removeChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void {
    parent.removeChild(child);
    if (this.scriptsTree.rootElement().childCount() === 0) {
      this.scriptsTree.setFocusable(false);
    }
  }

  private resetWorkspace(workspace: Workspace.Workspace.WorkspaceImpl): void {
    // Clear old event listeners first.
    if (this.workspaceInternal) {
      this.workspaceInternal.removeEventListener(
          Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
      this.workspaceInternal.removeEventListener(
          Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
      this.workspaceInternal.removeEventListener(
          Workspace.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
      this.workspaceInternal.removeEventListener(
          Workspace.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
    }

    this.workspaceInternal = workspace;
    this.workspaceInternal.addEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAddedCallback, this);
    this.workspaceInternal.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemovedCallback, this);
    this.workspaceInternal.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.projectAddedCallback, this);
    this.workspaceInternal.addEventListener(
        Workspace.Workspace.Events.ProjectRemoved, this.projectRemovedCallback, this);
    this.workspaceInternal.projects().forEach(this.projectAdded.bind(this));
    this.computeUniqueFileSystemProjectNames();
  }

  private projectAddedCallback(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    this.projectAdded(project);
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      this.computeUniqueFileSystemProjectNames();
    }
  }

  private projectRemovedCallback(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    this.removeProject(project);
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      this.computeUniqueFileSystemProjectNames();
    }
  }

  workspace(): Workspace.Workspace.WorkspaceImpl {
    return this.workspaceInternal;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return !project.isServiceProject();
  }

  private frameAttributionAdded(
      event: Common.EventTarget.EventTargetEvent<Bindings.NetworkProject.FrameAttributionEvent>): void {
    const {uiSourceCode} = event.data;
    if (!this.acceptsUISourceCode(uiSourceCode)) {
      return;
    }

    const addedFrame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame | null);
    // This event does not happen for UISourceCodes without initial attribution.
    this.addUISourceCodeNode(uiSourceCode, addedFrame);
  }

  private frameAttributionRemoved(
      event: Common.EventTarget.EventTargetEvent<Bindings.NetworkProject.FrameAttributionEvent>): void {
    const {uiSourceCode} = event.data;
    if (!this.acceptsUISourceCode(uiSourceCode)) {
      return;
    }

    const removedFrame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame | null);
    const node = Array.from(this.uiSourceCodeNodes.get(uiSourceCode)).find(node => node.frame() === removedFrame);
    if (node) {
      this.removeUISourceCodeNode(node);
    }
  }

  private acceptsUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.acceptProject(uiSourceCode.project());
  }

  private addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE) &&
        Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
            uiSourceCode)) {
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
    } else {
      this.addUISourceCodeNode(uiSourceCode, null);
    }
    this.uiSourceCodeAdded(uiSourceCode);
  }

  private addUISourceCodeNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): void {
    const isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
    let path;
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      path =
          Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1) as
          Platform.DevToolsPath.EncodedPathString[];
    } else {
      path = Common.ParsedURL.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1) as
          Platform.DevToolsPath.EncodedPathString[];
    }

    const project = uiSourceCode.project();
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    const folderNode =
        this.folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
    const uiSourceCodeNode = new NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
    const existingNode = folderNode.child(uiSourceCodeNode.id);
    if (existingNode && existingNode instanceof NavigatorUISourceCodeTreeNode) {
      this.uiSourceCodeNodes.set(uiSourceCode, existingNode);
    } else {
      folderNode.appendChild(uiSourceCodeNode);
      this.uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
      uiSourceCodeNode.updateTitleBubbleUp();
    }
    this.selectDefaultTreeNode();
  }

  uiSourceCodeAdded(_uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
  }

  private uiSourceCodeAddedCallback(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      void {
    const uiSourceCode = event.data;
    this.addUISourceCode(uiSourceCode);
  }

  private uiSourceCodeRemovedCallback(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      void {
    this.removeUISourceCodes([event.data]);
  }

  tryAddProject(project: Workspace.Workspace.Project): void {
    this.projectAdded(project);
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.addUISourceCode(uiSourceCode);
    }
  }

  private projectAdded(project: Workspace.Workspace.Project): void {
    const rootOrDeployed = this.rootOrDeployedNode();
    if (!this.acceptProject(project) || project.type() !== Workspace.Workspace.projectTypes.FileSystem ||
        Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) || rootOrDeployed.child(project.id())) {
      return;
    }
    rootOrDeployed.appendChild(
        new NavigatorGroupTreeNode(this, project, project.id(), Types.FileSystem, project.displayName()));
    this.selectDefaultTreeNode();
  }

  // TODO(einbinder) remove this code after crbug.com/964075 is fixed
  private selectDefaultTreeNode(): void {
    const children = this.rootNode.children();
    if (children.length && !this.scriptsTree.selectedTreeElement) {
      children[0].treeNode().select(true /* omitFocus */, false /* selectedByUser */);
    }
  }

  private computeUniqueFileSystemProjectNames(): void {
    const fileSystemProjects = this.workspaceInternal.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
    if (!fileSystemProjects.length) {
      return;
    }

    const reversedIndex = Common.Trie.Trie.newArrayTrie<string[]>();
    const reversedPaths = [];
    for (const project of fileSystemProjects) {
      const fileSystem = (project as Persistence.FileSystemWorkspaceBinding.FileSystem);
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
      const path = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(
          prefixPath.reverse().join('/') as Platform.DevToolsPath.EncodedPathString);

      const fileSystemNode = rootOrDeployed.child(project.id());
      if (fileSystemNode) {
        fileSystemNode.setTitle(path);
      }
    }
  }

  removeProject(project: Workspace.Workspace.Project): void {
    this.removeUISourceCodes(project.uiSourceCodes());
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemNode = this.rootNode.child(project.id());
    if (!fileSystemNode) {
      return;
    }
    this.rootNode.removeChild(fileSystemNode);
  }

  private folderNodeId(
      project: Workspace.Workspace.Project, target: SDK.Target.Target|null,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null, projectOrigin: string, isFromSourceMap: boolean,
      path: Platform.DevToolsPath.EncodedPathString): string {
    const projectId = project.type() === Workspace.Workspace.projectTypes.FileSystem ? project.id() : '';
    let targetId = target && !(this.groupByAuthored && isFromSourceMap) ? target.id() : '';
    let frameId = this.groupByFrame && frame ? frame.id : '';
    if (this.groupByAuthored) {
      if (isFromSourceMap) {
        targetId = 'Authored';
        frameId = '';
      } else {
        targetId = 'Deployed:' + targetId;
      }
    }
    return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
  }

  private folderNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Workspace.Workspace.Project,
      target: SDK.Target.Target|null, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null,
      projectOrigin: Platform.DevToolsPath.UrlString, path: Platform.DevToolsPath.EncodedPathString[],
      fromSourceMap: boolean): NavigatorTreeNode {
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
      return this.rootOrDeployedNode().child(project.id()) as NavigatorTreeNode;
    }

    const parentNode =
        this.folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
    let type: string = Types.NetworkFolder;
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      type = Types.FileSystemFolder;
    }
    const name = Common.ParsedURL.ParsedURL.encodedPathToRawPathString(path[path.length - 1]);

    folderNode = new NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name, projectOrigin);
    this.subfolderNodes.set(folderId, folderNode);
    parentNode.appendChild(folderNode);
    return folderNode;
  }

  private domainNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Workspace.Workspace.Project,
      target: SDK.Target.Target, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null,
      projectOrigin: string): NavigatorTreeNode {
    const isAuthored = uiSourceCode.contentType().isFromSourceMap();
    const frameNode = this.frameNode(project, target, frame, isAuthored);
    if (!this.groupByDomain) {
      return frameNode;
    }
    let domainNode = frameNode.child(projectOrigin);
    if (domainNode) {
      return domainNode;
    }

    domainNode = new NavigatorGroupTreeNode(
        this, project, projectOrigin, Types.Domain, this.computeProjectDisplayName(target, projectOrigin));
    if (frame && projectOrigin === Common.ParsedURL.ParsedURL.extractOrigin(frame.url)) {
      boostOrderForNode.add(domainNode.treeNode());
    }
    frameNode.appendChild(domainNode);
    if (isAuthored && this.groupByAuthored) {
      domainNode.treeNode().expand();
    }
    return domainNode;
  }

  private frameNode(
      project: Workspace.Workspace.Project, target: SDK.Target.Target,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null, isAuthored: boolean): NavigatorTreeNode {
    if (!this.groupByFrame || !frame || (this.groupByAuthored && isAuthored)) {
      return this.targetNode(project, target, isAuthored);
    }

    let frameNode = this.frameNodes.get(frame);
    if (frameNode) {
      return frameNode;
    }

    frameNode =
        new NavigatorGroupTreeNode(this, project, target.id() + ':' + frame.id, Types.Frame, frame.displayName());
    frameNode.setHoverCallback(hoverCallback);
    this.frameNodes.set(frame, frameNode);

    const parentFrame = frame.parentFrame();
    this.frameNode(project, parentFrame ? parentFrame.resourceTreeModel().target() : target, parentFrame, isAuthored)
        .appendChild(frameNode);
    if (!parentFrame) {
      boostOrderForNode.add(frameNode.treeNode());
      frameNode.treeNode().expand();
    }

    function hoverCallback(hovered: boolean): void {
      if (hovered) {
        const overlayModel = target.model(SDK.OverlayModel.OverlayModel);
        if (overlayModel && frame) {
          overlayModel.highlightFrame(frame.id);
        }
      } else {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    }
    return frameNode;
  }

  private targetNode(project: Workspace.Workspace.Project, target: SDK.Target.Target, isAuthored: boolean):
      NavigatorTreeNode {
    if (this.groupByAuthored && isAuthored) {
      if (!this.authoredNode) {
        this.authoredNode = new NavigatorGroupTreeNode(
            this, null, 'group:Authored', Types.Authored, i18nString(UIStrings.authored),
            i18nString(UIStrings.authoredTooltip));
        this.rootNode.appendChild(this.authoredNode);
        this.authoredNode.treeNode().expand();
      }
      return this.authoredNode;
    }

    const rootOrDeployed = this.rootOrDeployedNode();
    if (target === SDK.TargetManager.TargetManager.instance().scopeTarget()) {
      return rootOrDeployed;
    }

    let targetNode = rootOrDeployed.child('target:' + target.id());
    if (!targetNode) {
      targetNode = new NavigatorGroupTreeNode(
          this, project, 'target:' + target.id(), target.type() === SDK.Target.Type.FRAME ? Types.Frame : Types.Worker,
          target.name());
      rootOrDeployed.appendChild(targetNode);
    }
    return targetNode;
  }

  private rootOrDeployedNode(): NavigatorTreeNode {
    if (this.groupByAuthored) {
      if (!this.deployedNode) {
        this.deployedNode = new NavigatorGroupTreeNode(
            this, null, 'group:Deployed', Types.Deployed, i18nString(UIStrings.deployed),
            i18nString(UIStrings.deployedTooltip));
        this.rootNode.appendChild(this.deployedNode);
      }
      return this.deployedNode;
    }
    return this.rootNode;
  }

  private computeProjectDisplayName(target: SDK.Target.Target, projectOrigin: string): string {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];

    let matchingContextName: string|null = null;

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

  revealUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode, select?: boolean): NavigatorUISourceCodeTreeNode
      |null {
    const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
    if (nodes.size === 0) {
      return null;
    }
    const node = nodes.values().next().value;
    if (!node) {
      return null;
    }
    if (this.scriptsTree.selectedTreeElement) {
      // If the tree outline is being marked as "being edited" (i.e. we're renaming a file
      // or chosing the name for a new snippet), we shall not proceed with revealing here,
      // as that will steal focus from the input widget and thus cancel editing. The
      // test/e2e/snippets/breakpoint_test.ts exercises this.
      if (UI.UIUtils.isBeingEdited(this.scriptsTree.selectedTreeElement.treeOutline?.element)) {
        return null;
      }
      this.scriptsTree.selectedTreeElement.deselect();
    }
    // TODO(dgozman): figure out revealing multiple.
    node.reveal(select);
    return node;
  }

  sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void {
    void Common.Revealer.reveal(uiSourceCode, !focusSource);
  }

  #isUISourceCodeOrAnyAncestorSelected(node: NavigatorUISourceCodeTreeNode): boolean {
    const selectedTreeElement = (this.scriptsTree.selectedTreeElement as NavigatorSourceTreeElement | null);
    const selectedNode = selectedTreeElement && selectedTreeElement.node;
    let currentNode: NavigatorTreeNode|null = node;
    while (currentNode) {
      if (currentNode === selectedNode) {
        return true;
      }
      currentNode = currentNode.parent;
      if (!(node instanceof NavigatorGroupTreeNode || node instanceof NavigatorFolderTreeElement)) {
        break;
      }
    }
    return false;
  }

  private removeUISourceCodes(uiSourceCodes: Iterable<Workspace.UISourceCode.UISourceCode>): void {
    const nodesWithSelectionOnPath: NavigatorUISourceCodeTreeNode[] = [];
    // First we remove source codes without any selection on their path to root, and only then
    // the ones with selection. This to avoid layout work associated with moving the selection
    // around (crbug.com/1409025).
    for (const uiSourceCode of uiSourceCodes) {
      const nodes = this.uiSourceCodeNodes.get(uiSourceCode);
      for (const node of nodes) {
        if (this.#isUISourceCodeOrAnyAncestorSelected(node)) {
          nodesWithSelectionOnPath.push(node);
        } else {
          this.removeUISourceCodeNode(node);
        }
      }
    }
    nodesWithSelectionOnPath.forEach(this.removeUISourceCodeNode.bind(this));
  }

  private removeUISourceCodeNode(node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    this.uiSourceCodeNodes.delete(uiSourceCode, node);
    const project = uiSourceCode.project();
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    let frame = node.frame();

    let parentNode: (NavigatorTreeNode|null) = node.parent;
    if (!parentNode) {
      return;
    }
    parentNode.removeChild(node);
    let currentNode: (NavigatorTreeNode|null) = parentNode;

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
        this.discardFrame(
            frame as SDK.ResourceTreeModel.ResourceTreeFrame,
            Boolean(this.groupByAuthored) && uiSourceCode.contentType().isFromSourceMap());
        frame = (frame as SDK.ResourceTreeModel.ResourceTreeFrame).parentFrame();
      } else {
        const folderId = this.folderNodeId(
            project, target, frame, uiSourceCode.origin(), uiSourceCode.contentType().isFromSourceMap(),
            currentNode instanceof NavigatorFolderTreeNode && currentNode.folderPath ||
                Platform.DevToolsPath.EmptyEncodedPathString);
        this.subfolderNodes.delete(folderId);
        parentNode.removeChild(currentNode);
      }

      if (currentNode === this.authoredNode) {
        this.authoredNode = undefined;
      } else if (currentNode === this.deployedNode) {
        this.deployedNode = undefined;
      }

      currentNode = parentNode;
    }
  }

  reset(tearDownOnly?: boolean): void {
    for (const node of this.uiSourceCodeNodes.valuesArray()) {
      node.dispose();
    }

    this.scriptsTree.removeChildren();
    this.scriptsTree.setFocusable(false);
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

  handleContextMenu(_event: Event): void {
  }

  private async renameShortcut(): Promise<boolean> {
    const selectedTreeElement = (this.scriptsTree.selectedTreeElement as NavigatorSourceTreeElement | null);
    const node = selectedTreeElement && selectedTreeElement.node;
    if (!node || !node.uiSourceCode() || !node.uiSourceCode().canRename()) {
      return false;
    }
    this.rename(node, false);
    return true;
  }

  private handleContextMenuCreate(
      project: Workspace.Workspace.Project, path: Platform.DevToolsPath.EncodedPathString,
      uiSourceCode?: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode) {
      const relativePath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
      relativePath.pop();
      path = Common.ParsedURL.ParsedURL.join(relativePath, '/');
    }
    void this.create(project, path, uiSourceCode);
  }

  private handleContextMenuRename(node: NavigatorUISourceCodeTreeNode): void {
    this.rename(node, false);
  }

  private async handleContextMenuExclude(
      project: Workspace.Workspace.Project, path: Platform.DevToolsPath.EncodedPathString): Promise<void> {
    const shouldExclude = await UI.UIUtils.ConfirmDialog.show(
        i18nString(UIStrings.areYouSureYouWantToExcludeThis), undefined, {jslogContext: 'exclude-folder-confirmation'});
    if (shouldExclude) {
      UI.UIUtils.startBatchUpdate();
      project.excludeFolder(
          Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path));
      UI.UIUtils.endBatchUpdate();
    }
  }

  private async handleContextMenuDelete(uiSourceCode: Workspace.UISourceCode.UISourceCode): Promise<void> {
    const shouldDelete = await UI.UIUtils.ConfirmDialog.show(
        i18nString(UIStrings.areYouSureYouWantToDeleteThis), undefined, {jslogContext: 'delete-file-confirmation'});
    if (shouldDelete) {
      uiSourceCode.project().deleteFile(uiSourceCode);
    }
  }

  handleFileContextMenu(event: Event, node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(uiSourceCode);

    const project = uiSourceCode.project();
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.rename), this.handleContextMenuRename.bind(this, node), {jslogContext: 'rename'});
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.makeACopy),
          this.handleContextMenuCreate.bind(this, project, Platform.DevToolsPath.EmptyEncodedPathString, uiSourceCode),
          {jslogContext: 'make-a-copy'});
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.delete), this.handleContextMenuDelete.bind(this, uiSourceCode),
          {jslogContext: 'delete'});
    }

    void contextMenu.show();
  }

  private async handleDeleteFolder(node: NavigatorTreeNode): Promise<void> {
    const warningMsg =
        `${i18nString(UIStrings.areYouSureYouWantToDeleteFolder)}\n${i18nString(UIStrings.actionCannotBeUndone)}`;
    const shouldRemove =
        await UI.UIUtils.ConfirmDialog.show(warningMsg, undefined, {jslogContext: 'delete-folder-confirmation'});
    if (shouldRemove) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.OverrideTabDeleteFolderContextMenu);
      const topNode = this.findTopNonMergedNode(node);
      await this.removeUISourceCodeFromProject(topNode);
      await this.deleteDirectoryRecursively(topNode);
    }
  }

  private async removeUISourceCodeFromProject(node: NavigatorTreeNode): Promise<void> {
    node.children().forEach(async child => {
      await this.removeUISourceCodeFromProject(child);
    });

    if (node instanceof NavigatorUISourceCodeTreeNode) {
      node.uiSourceCode().project().removeUISourceCode(node.uiSourceCode().url());
    }
  }

  private async deleteDirectoryRecursively(node: NavigatorTreeNode): Promise<void> {
    if (!(node instanceof NavigatorFolderTreeNode)) {
      return;
    }

    await Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance()
        .project()
        ?.deleteDirectoryRecursively(node.folderPath);
  }

  private findTopNonMergedNode(node: NavigatorTreeNode): NavigatorTreeNode {
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

  handleFolderContextMenu(event: Event, node: NavigatorFolderTreeNode): void {
    const path = node.folderPath || Platform.DevToolsPath.EmptyEncodedPathString;
    const project = node.project || null;

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    NavigatorView.appendSearchItem(contextMenu, path);

    if (!project) {
      return;
    }

    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      const folderPath = Common.ParsedURL.ParsedURL.urlToRawPathString(
          Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path),
          Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(folderPath),
          {jslogContext: 'open-folder'});
      if (project.canCreateFile()) {
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.newFile), () => {
          this.handleContextMenuCreate(project, path, undefined);
        }, {jslogContext: 'new-file'});
      }
    } else if (node.origin && node.folderPath) {
      const url = Common.ParsedURL.ParsedURL.concatenate(node.origin, '/', node.folderPath);
      const options = {
        isContentScript: node.recursiveProperties.exclusivelyContentScripts || false,
        isKnownThirdParty: node.recursiveProperties.exclusivelyThirdParty || false,
        isCurrentlyIgnoreListed: node.recursiveProperties.exclusivelyIgnored || false,
      };
      for (const {text, callback, jslogContext} of Bindings.IgnoreListManager.IgnoreListManager.instance()
               .getIgnoreListFolderContextMenuItems(url, options)) {
        contextMenu.defaultSection().appendItem(text, callback, {jslogContext});
      }
    }

    if (project.canExcludeFolder(path)) {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.excludeFolder), this.handleContextMenuExclude.bind(this, project, path),
          {jslogContext: 'exclude-folder'});
    }

    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      const isFileOverrides =
          (project as Persistence.FileSystemWorkspaceBinding.FileSystem).fileSystem().type() === 'overrides';

      if (!isFileOverrides) {
        if (node instanceof NavigatorGroupTreeNode) {
          contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeFolderFromWorkspace), async () => {
            const warningMessage = `${i18nString(UIStrings.areYouSureYouWantToRemoveThis, {
              PH1: (node as NavigatorGroupTreeNode).title,
            })}\n${i18nString(UIStrings.workspaceStopSyncing)}`;
            const shouldRemove = await UI.UIUtils.ConfirmDialog.show(warningMessage, undefined, {
              okButtonLabel: i18nString(UIStrings.remove),
              jslogContext: 'remove-folder-from-workspace-confirmation',
            });
            if (shouldRemove) {
              project.remove();
            }
          }, {jslogContext: 'remove-folder-from-workspace'});
        }
      } else {
        if (!(node instanceof NavigatorGroupTreeNode)) {
          contextMenu.defaultSection().appendItem(
              i18nString(UIStrings.delete), this.handleDeleteFolder.bind(this, node), {jslogContext: 'delete'});
        }
      }
    }

    void contextMenu.show();
  }

  rename(node: NavigatorUISourceCodeTreeNode, creatingNewUISourceCode: boolean): void {
    const uiSourceCode = node.uiSourceCode();
    node.rename(callback.bind(this));

    function callback(this: NavigatorView, committed: boolean): void {
      if (!creatingNewUISourceCode) {
        return;
      }
      if (!committed) {
        uiSourceCode.remove();
      } else if (node.treeElement && node.treeElement.listItemElement.hasFocus()) {
        this.sourceSelected(uiSourceCode, true);
      }
    }
  }

  async create(
      project: Workspace.Workspace.Project, path: Platform.DevToolsPath.EncodedPathString,
      uiSourceCodeToCopy?: Workspace.UISourceCode.UISourceCode): Promise<void> {
    let content = '';
    if (uiSourceCodeToCopy) {
      content = (await uiSourceCodeToCopy.requestContent()).content || '';
    }
    const uiSourceCode = await project.createFile(path, null, content);
    if (!uiSourceCode) {
      return;
    }
    this.sourceSelected(uiSourceCode, false);
    const node = this.revealUISourceCode(uiSourceCode, true);
    if (node) {
      this.rename(node, true);
    }
  }

  private groupingChanged(): void {
    this.reset(true);
    this.initGrouping();
    // Reset the workspace to repopulate filesystem folders.
    this.resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
    this.workspaceInternal.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
  }

  private ignoreListChanged(): void {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.JUST_MY_CODE)) {
      this.groupingChanged();
    } else {
      this.rootNode.updateTitleRecursive();
    }
  }

  private initGrouping(): void {
    this.groupByFrame = true;
    this.groupByDomain = this.navigatorGroupByFolderSetting.get();
    this.groupByFolder = this.groupByDomain;
    if (this.navigatorGroupByAuthoredExperiment) {
      this.groupByAuthored = Root.Runtime.experiments.isEnabled(this.navigatorGroupByAuthoredExperiment);
    } else {
      this.groupByAuthored = false;
    }
  }

  private resetForTest(): void {
    this.reset();
    this.workspaceInternal.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
  }

  private discardFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame, isAuthored: boolean): void {
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

  targetAdded(_target: SDK.Target.Target): void {
  }

  targetRemoved(target: SDK.Target.Target): void {
    const rootOrDeployed = this.rootOrDeployedNode();
    const targetNode = rootOrDeployed.child('target:' + target.id());
    if (targetNode) {
      rootOrDeployed.removeChild(targetNode);
    }
  }

  private targetNameChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;
    const targetNode = this.rootOrDeployedNode().child('target:' + target.id());
    if (targetNode) {
      targetNode.setTitle(target.name());
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.scriptsTree.registerCSSFiles([navigatorTreeStyles]);
    this.registerCSSFiles([navigatorViewStyles]);
  }
}

const boostOrderForNode = new WeakSet<UI.TreeOutline.TreeElement>();

export class NavigatorFolderTreeElement extends UI.TreeOutline.TreeElement {
  private readonly nodeType: string;
  private readonly navigatorView: NavigatorView;
  private hoverCallback: ((arg0: boolean) => void)|undefined;
  node!: NavigatorTreeNode;
  private hovered?: boolean;
  private isIgnoreListed?: boolean;
  private isFromSourceMap: boolean;

  constructor(navigatorView: NavigatorView, type: string, title: string, hoverCallback?: ((arg0: boolean) => void)) {
    super('', true, NavigatorFolderTreeElement.#contextForType(type));
    this.listItemElement.classList.add('navigator-' + type + '-tree-item', 'navigator-folder-tree-item');
    UI.ARIAUtils.setLabel(this.listItemElement, `${title}, ${type}`);
    this.nodeType = type;
    this.title = title;
    this.tooltip = title;
    this.navigatorView = navigatorView;
    this.hoverCallback = hoverCallback;
    this.isFromSourceMap = false;

    let iconType = 'folder';

    if (type === Types.Domain) {
      iconType = 'cloud';
    } else if (type === Types.Frame) {
      iconType = 'frame';
    } else if (type === Types.Worker) {
      iconType = 'gears';
    } else if (type === Types.Authored) {
      iconType = 'code';
    } else if (type === Types.Deployed) {
      iconType = 'deployed';
    }

    const icon = IconButton.Icon.create(iconType);
    this.setLeadingIcons([icon]);
  }

  override async onpopulate(): Promise<void> {
    this.node.populate();
  }

  override onattach(): void {
    this.collapse();
    this.node.onattach();
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('mousemove', this.mouseMove.bind(this), false);
    this.listItemElement.addEventListener('mouseleave', this.mouseLeave.bind(this), false);
  }

  setIgnoreListed(isIgnoreListed: boolean): void {
    if (this.isIgnoreListed !== isIgnoreListed) {
      this.isIgnoreListed = isIgnoreListed;
      this.listItemElement.classList.toggle('is-ignore-listed', isIgnoreListed);
      this.updateTooltip();
    }
  }

  setFromSourceMap(isFromSourceMap: boolean): void {
    this.isFromSourceMap = isFromSourceMap;
    this.listItemElement.classList.toggle('is-from-source-map', isFromSourceMap);
  }

  setNode(node: NavigatorTreeNode): void {
    this.node = node;
    this.updateTooltip();
    UI.ARIAUtils.setLabel(this.listItemElement, `${this.title}, ${this.nodeType}`);
  }

  private updateTooltip(): void {
    if (this.node.tooltip) {
      this.tooltip = this.node.tooltip;
    } else {
      const paths = [];
      let currentNode: NavigatorTreeNode|null = this.node;
      while (currentNode && !currentNode.isRoot() && currentNode.type === this.node.type) {
        paths.push(currentNode.title);
        currentNode = currentNode.parent;
      }
      paths.reverse();
      let tooltip = paths.join('/');
      if (this.isIgnoreListed) {
        tooltip = i18nString(UIStrings.sIgnoreListed, {PH1: tooltip});
      }
      this.tooltip = tooltip;
    }
  }

  private handleContextMenuEvent(event: Event): void {
    if (!this.node) {
      return;
    }
    this.select();
    this.navigatorView.handleFolderContextMenu(event, this.node as NavigatorFolderTreeNode);
  }

  private mouseMove(_event: Event): void {
    if (this.hovered || !this.hoverCallback) {
      return;
    }
    this.hovered = true;
    this.hoverCallback(true);
  }

  private mouseLeave(_event: Event): void {
    if (!this.hoverCallback) {
      return;
    }
    this.hovered = false;
    this.hoverCallback(false);
  }

  static #contextForType(type: string): string {
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

export class NavigatorSourceTreeElement extends UI.TreeOutline.TreeElement {
  readonly nodeType: string;
  readonly node: NavigatorUISourceCodeTreeNode;
  private readonly navigatorView: NavigatorView;
  uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;

  constructor(
      navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, title: string,
      node: NavigatorUISourceCodeTreeNode) {
    super('', false, uiSourceCode.contentType().name());
    this.nodeType = Types.File;
    this.node = node;
    this.title = title;
    this.listItemElement.classList.add(
        'navigator-' + uiSourceCode.contentType().name() + '-tree-item', 'navigator-file-tree-item');
    this.tooltip = uiSourceCode.url();
    UI.ARIAUtils.setLabel(this.listItemElement, `${uiSourceCode.name()}, ${this.nodeType}`);
    Common.EventTarget.fireEvent('source-tree-file-added', uiSourceCode.fullDisplayName());
    this.navigatorView = navigatorView;
    this.uiSourceCodeInternal = uiSourceCode;
    this.updateIcon();
    (this.titleElement as HTMLElement).setAttribute('jslog', `${VisualLogging.value('title').track({change: true})}`);
  }

  updateIcon(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    let iconType = 'document';
    let iconStyles: string[] = [];
    if (binding) {
      if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(binding.fileSystem)) {
        iconType = 'snippet';
      }
      const badgeIsPurple = networkPersistenceManager.project() === binding.fileSystem.project();
      iconStyles = badgeIsPurple ? ['dot', 'purple'] : ['dot', 'green'];
    } else if (networkPersistenceManager.isActiveHeaderOverrides(this.uiSourceCode)) {
      iconStyles = ['dot', 'purple'];
    } else {
      if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.uiSourceCodeInternal)) {
        iconType = 'snippet';
      }
    }

    const icon = IconButton.Icon.create(iconType, iconStyles.join(' '));
    if (binding) {
      UI.Tooltip.Tooltip.install(
          icon, Persistence.PersistenceUtils.PersistenceUtils.tooltipForUISourceCode(this.uiSourceCodeInternal));
    }
    this.setLeadingIcons([icon]);
  }

  updateAccessibleName(): void {
    UI.ARIAUtils.setLabel(this.listItemElement, `${this.uiSourceCodeInternal.name()}, ${this.nodeType}`);
  }

  get uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.uiSourceCodeInternal;
  }

  override onattach(): void {
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('click', this.onclick.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('dragstart', this.ondragstart.bind(this), false);
  }

  private shouldRenameOnMouseDown(): boolean {
    if (!this.uiSourceCodeInternal.canRename()) {
      return false;
    }
    if (!this.treeOutline) {
      return false;
    }
    const isSelected = this === this.treeOutline.selectedTreeElement;
    return isSelected && this.treeOutline.element.hasFocus() && !UI.UIUtils.isBeingEdited(this.treeOutline.element);
  }

  override selectOnMouseDown(event: MouseEvent): void {
    if (event.which !== 1 || !this.shouldRenameOnMouseDown()) {
      super.selectOnMouseDown(event);
      return;
    }
    window.setTimeout(rename.bind(this), 300);

    function rename(this: NavigatorSourceTreeElement): void {
      if (this.shouldRenameOnMouseDown()) {
        this.navigatorView.rename(this.node, false);
      }
    }
  }

  private ondragstart(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData('text/plain', this.uiSourceCodeInternal.url());
    event.dataTransfer.effectAllowed = 'copy';
  }

  override onspace(): boolean {
    this.navigatorView.sourceSelected(this.uiSourceCode, true);
    return true;
  }

  private onclick(_event: Event): void {
    this.navigatorView.sourceSelected(this.uiSourceCode, false);
  }

  override ondblclick(event: Event): boolean {
    const middleClick = (event as MouseEvent).button === 1;
    this.navigatorView.sourceSelected(this.uiSourceCode, !middleClick);
    return false;
  }

  override onenter(): boolean {
    this.navigatorView.sourceSelected(this.uiSourceCode, true);
    return true;
  }

  override ondelete(): boolean {
    return true;
  }

  private handleContextMenuEvent(event: Event): void {
    this.select();
    this.navigatorView.handleFileContextMenu(event, this.node);
  }
}

export type NavigatorRecursiveTreeNodeProperties = {
  exclusivelySourceMapped: boolean|null,
  exclusivelyIgnored: boolean|null,
  exclusivelyThirdParty: boolean|null,
  exclusivelyContentScripts: boolean|null,
};

export class NavigatorTreeNode {
  id: string;
  protected navigatorView: NavigatorView;
  type: string;
  childrenInternal: Map<string, NavigatorTreeNode>;
  private populated: boolean;
  isMerged: boolean;
  parent!: NavigatorTreeNode|null;
  title!: string;
  tooltip?: string;
  recursiveProperties: NavigatorRecursiveTreeNodeProperties;

  constructor(navigatorView: NavigatorView, id: string, type: string, tooltip?: string) {
    this.id = id;
    this.navigatorView = navigatorView;
    this.type = type;
    this.childrenInternal = new Map();
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

  treeNode(): UI.TreeOutline.TreeElement {
    throw 'Not implemented';
  }

  dispose(): void {
  }

  updateTitle(): void {
  }

  updateTitleRecursive(): void {
    for (const child of this.children()) {
      child.updateTitleRecursive();
    }
    this.updateTitle();
  }

  updateTitleBubbleUp(): void {
    this.updateTitle();
    if (this.parent) {
      this.parent.updateTitleBubbleUp();
    }
  }

  isRoot(): boolean {
    return false;
  }

  hasChildren(): boolean {
    return true;
  }

  onattach(): void {
  }

  setTitle(_title: string): void {
    throw 'Not implemented';
  }

  populate(): void {
    if (this.isPopulated()) {
      return;
    }
    if (this.parent) {
      this.parent.populate();
    }
    this.populated = true;
    this.wasPopulated();
  }

  wasPopulated(): void {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      this.navigatorView.appendChild(this.treeNode(), (children[i].treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  didAddChild(node: NavigatorTreeNode): void {
    if (this.isPopulated()) {
      this.navigatorView.appendChild(this.treeNode(), (node.treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  willRemoveChild(node: NavigatorTreeNode): void {
    if (this.isPopulated()) {
      this.navigatorView.removeChild(this.treeNode(), (node.treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  isPopulated(): boolean {
    return this.populated;
  }

  isEmpty(): boolean {
    return !this.childrenInternal.size;
  }

  children(): NavigatorTreeNode[] {
    return [...this.childrenInternal.values()];
  }

  child(id: string): NavigatorTreeNode|null {
    return this.childrenInternal.get(id) || null;
  }

  appendChild(node: NavigatorTreeNode): void {
    this.childrenInternal.set(node.id, node);
    node.parent = this;
    this.didAddChild(node);
  }

  removeChild(node: NavigatorTreeNode): void {
    this.willRemoveChild(node);
    this.childrenInternal.delete(node.id);
    node.parent = null;
    node.dispose();
  }

  reset(): void {
    this.childrenInternal.clear();
  }
}

export class NavigatorRootTreeNode extends NavigatorTreeNode {
  constructor(navigatorView: NavigatorView) {
    super(navigatorView, '', Types.Root);
  }

  override isRoot(): boolean {
    return true;
  }

  override treeNode(): UI.TreeOutline.TreeElement {
    return this.navigatorView.scriptsTree.rootElement();
  }
}

export class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
  uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;
  treeElement: NavigatorSourceTreeElement|null;
  private eventListeners: Common.EventTarget.EventDescriptor[];
  private readonly frameInternal: SDK.ResourceTreeModel.ResourceTreeFrame|null;
  constructor(
      navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null) {
    super(navigatorView, 'UISourceCode:' + uiSourceCode.canononicalScriptId(), Types.File);
    this.uiSourceCodeInternal = uiSourceCode;
    this.treeElement = null;
    this.eventListeners = [];
    this.frameInternal = frame;
    this.recursiveProperties.exclusivelySourceMapped = uiSourceCode.contentType().isFromSourceMap();
    if (uiSourceCode.contentType().isScript()) {
      // These properties affect ignore-listing menus and only matter when the UISourceCode is a script
      this.recursiveProperties.exclusivelyThirdParty = uiSourceCode.isKnownThirdParty();
      this.recursiveProperties.exclusivelyContentScripts =
          uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;
    }
  }

  frame(): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    return this.frameInternal;
  }

  uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.uiSourceCodeInternal;
  }

  override treeNode(): UI.TreeOutline.TreeElement {
    if (this.treeElement) {
      return this.treeElement;
    }

    this.treeElement = new NavigatorSourceTreeElement(this.navigatorView, this.uiSourceCodeInternal, '', this);
    this.updateTitle();

    const updateTitleBound = this.updateTitle.bind(this, undefined);
    this.eventListeners = [
      this.uiSourceCodeInternal.addEventListener(Workspace.UISourceCode.Events.TitleChanged, updateTitleBound),
      this.uiSourceCodeInternal.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
      this.uiSourceCodeInternal.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound),
    ];
    return this.treeElement;
  }

  override updateTitle(ignoreIsDirty?: boolean): void {
    const isIgnoreListed =
        Bindings.IgnoreListManager.IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(
            this.uiSourceCodeInternal);
    if (this.uiSourceCodeInternal.contentType().isScript() || isIgnoreListed) {
      this.recursiveProperties.exclusivelyIgnored = isIgnoreListed;
    }

    if (!this.treeElement) {
      return;
    }

    let titleText = this.uiSourceCodeInternal.displayName();
    if (!ignoreIsDirty && this.uiSourceCodeInternal.isDirty()) {
      titleText = '*' + titleText;
    }

    this.treeElement.title = titleText;
    this.treeElement.updateIcon();

    this.treeElement.listItemElement.classList.toggle('is-ignore-listed', isIgnoreListed);

    let tooltip: string = this.uiSourceCodeInternal.url();
    if (this.uiSourceCodeInternal.contentType().isFromSourceMap()) {
      tooltip = i18nString(UIStrings.sFromSourceMap, {PH1: this.uiSourceCodeInternal.displayName()});
    }
    if (isIgnoreListed) {
      tooltip = i18nString(UIStrings.sIgnoreListed, {PH1: tooltip});
    }

    this.treeElement.tooltip = tooltip;
    this.treeElement.updateAccessibleName();

    this.parent?.childrenInternal.delete(this.id);
    this.id = 'UISourceCode:' + this.uiSourceCodeInternal.canononicalScriptId();
    this.parent?.childrenInternal.set(this.id, this);
  }

  override hasChildren(): boolean {
    return false;
  }

  override dispose(): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
  }

  reveal(select?: boolean): void {
    if (this.parent) {
      this.parent.populate();
      this.parent.treeNode().expand();
    }
    if (this.treeElement) {
      this.treeElement.reveal(true);
      if (select) {
        this.treeElement.select(true);
      }
    }
  }

  rename(callback?: ((arg0: boolean) => void)): void {
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

    function commitHandler(
        this: NavigatorUISourceCodeTreeNode, element: Element, newTitle: string, oldTitle: string): void {
      if (newTitle !== oldTitle) {
        if (this.treeElement) {
          this.treeElement.title = newTitle;
        }
        // necessary cast to RawPathString as alternative would be altering type of Config<T>
        void this.uiSourceCodeInternal.rename(newTitle as Platform.DevToolsPath.RawPathString)
            .then(renameCallback.bind(this));
        return;
      }
      afterEditing.call(this, true);
    }

    function renameCallback(this: NavigatorUISourceCodeTreeNode, success: boolean): void {
      if (!success) {
        UI.UIUtils.markBeingEdited(treeOutlineElement, false);
        this.updateTitle();
        this.rename(callback);
        return;
      }
      if (this.treeElement) {
        const {parent} = this.treeElement;
        if (parent) {
          parent.removeChild(this.treeElement);
          parent.appendChild(this.treeElement);
          this.treeElement.select();
        }
      }
      afterEditing.call(this, true);
    }

    function afterEditing(this: NavigatorUISourceCodeTreeNode, committed: boolean): void {
      UI.UIUtils.markBeingEdited(treeOutlineElement, false);
      this.updateTitle();
      if (callback) {
        callback(committed);
      }
    }

    this.updateTitle(true);
    this.treeElement.startEditingTitle(
        new UI.InplaceEditor.Config(commitHandler.bind(this), afterEditing.bind(this, false)));
  }
}

export class NavigatorFolderTreeNode extends NavigatorTreeNode {
  project: Workspace.Workspace.Project|null;
  readonly folderPath: Platform.DevToolsPath.EncodedPathString;
  readonly origin: Platform.DevToolsPath.UrlString;
  override title: string;
  treeElement!: NavigatorFolderTreeElement|null;
  constructor(
      navigatorView: NavigatorView, project: Workspace.Workspace.Project|null, id: string, type: string,
      folderPath: Platform.DevToolsPath.EncodedPathString, title: string, origin: Platform.DevToolsPath.UrlString) {
    super(navigatorView, id, type);
    this.project = project;
    this.folderPath = folderPath;
    this.title = title;
    this.origin = origin;
  }

  override treeNode(): UI.TreeOutline.TreeElement {
    if (this.treeElement) {
      return this.treeElement;
    }
    this.treeElement = this.createTreeElement(this.title, this);
    this.updateTitle();
    return this.treeElement;
  }

  override updateTitle(): void {
    let propName: keyof NavigatorRecursiveTreeNodeProperties;
    for (propName in this.recursiveProperties) {
      let propValue: boolean|null = null;
      for (const child of this.children()) {
        if (child.recursiveProperties[propName] === false) {
          propValue = false;
          break;
        } else if (child.recursiveProperties[propName]) {
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

    const absoluteFileSystemPath = Common.ParsedURL.ParsedURL.concatenate(
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(
            this.project.id() as Platform.DevToolsPath.UrlString),
        '/', this.folderPath);
    const hasMappedFiles =
        Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(absoluteFileSystemPath);
    this.treeElement.listItemElement.classList.toggle('has-mapped-files', hasMappedFiles);
  }

  private createTreeElement(title: string, node: NavigatorTreeNode): NavigatorFolderTreeElement {
    const treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, title);
    treeElement.setNode(node);
    return treeElement;
  }

  override wasPopulated(): void {
    // @ts-ignore These types are invalid, but removing this check causes wrong behavior
    if (!this.treeElement || this.treeElement.node !== this) {
      return;
    }
    this.addChildrenRecursive();
  }

  private addChildrenRecursive(): void {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      this.didAddChild(child);
      if (child instanceof NavigatorFolderTreeNode) {
        child.addChildrenRecursive();
      }
    }
  }

  private shouldMerge(node: NavigatorTreeNode): boolean {
    return this.type !== Types.Domain && node instanceof NavigatorFolderTreeNode;
  }

  override didAddChild(node: NavigatorTreeNode): void {
    if (!this.treeElement) {
      return;
    }

    let children = this.children();

    if (children.length === 1 && this.shouldMerge(node)) {
      node.isMerged = true;
      this.treeElement.title = this.treeElement.title + '/' + node.title;
      (node as NavigatorFolderTreeNode).treeElement = this.treeElement;
      node.updateTitle();
      this.treeElement.setNode(node);
      return;
    }

    let oldNode;
    if (children.length === 2) {
      oldNode = children[0] !== node ? children[0] : children[1];
    }
    if (oldNode && oldNode.isMerged) {
      oldNode.isMerged = false;
      const mergedToNodes = [];
      mergedToNodes.push(this);
      let treeNode: (NavigatorTreeNode|null)|NavigatorTreeNode|this = this;
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
      } while (treeNode && treeNode.isMerged);

      if (!this.isPopulated()) {
        this.treeElement.title = titleText;
        this.treeElement.setNode(this);
        for (let i = 0; i < nodes.length; ++i) {
          (nodes[i] as NavigatorFolderTreeNode).treeElement = null;
          nodes[i].isMerged = false;
        }
        this.updateTitle();
        return;
      }
      const oldTreeElement = this.treeElement;
      const treeElement = this.createTreeElement(titleText, this);
      for (let i = 0; i < mergedToNodes.length; ++i) {
        (mergedToNodes[i] as NavigatorFolderTreeNode).treeElement = treeElement;
        mergedToNodes[i].updateTitle();
      }
      if (oldTreeElement.parent) {
        this.navigatorView.appendChild(oldTreeElement.parent, treeElement);
      }

      oldTreeElement.setNode(nodes[nodes.length - 1]);
      oldTreeElement.title = nodes.map(node => node.title).join('/');
      if (oldTreeElement.parent) {
        this.navigatorView.removeChild(oldTreeElement.parent, oldTreeElement);
      }
      this.navigatorView.appendChild(this.treeElement, oldTreeElement);
      if (oldTreeElement.expanded) {
        treeElement.expand();
      }
      this.updateTitle();
    }
    if (this.isPopulated()) {
      this.navigatorView.appendChild(this.treeElement, node.treeNode());
    }
  }

  override willRemoveChild(node: NavigatorTreeNode): void {
    const actualNode = (node as NavigatorFolderTreeNode);
    if (actualNode.isMerged || !this.isPopulated() || !this.treeElement || !actualNode.treeElement) {
      return;
    }
    this.navigatorView.removeChild(this.treeElement, actualNode.treeElement);
  }
}

export class NavigatorGroupTreeNode extends NavigatorTreeNode {
  private readonly project: Workspace.Workspace.Project|null;
  override title: string;
  private hoverCallback?: ((arg0: boolean) => void);
  private treeElement?: NavigatorFolderTreeElement;
  constructor(
      navigatorView: NavigatorView, project: Workspace.Workspace.Project|null, id: string, type: string, title: string,
      tooltip?: string) {
    super(navigatorView, id, type, tooltip);
    this.project = project;
    this.title = title;
    this.populate();
  }

  setHoverCallback(hoverCallback: (arg0: boolean) => void): void {
    this.hoverCallback = hoverCallback;
  }

  override treeNode(): UI.TreeOutline.TreeElement {
    if (this.treeElement) {
      return this.treeElement;
    }
    this.treeElement = new NavigatorFolderTreeElement(this.navigatorView, this.type, this.title, this.hoverCallback);
    this.treeElement.setNode(this);
    return this.treeElement;
  }

  override onattach(): void {
    this.updateTitle();
  }

  override updateTitle(): void {
    if (!this.treeElement || !this.project || this.project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemPath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(
        this.project.id() as Platform.DevToolsPath.UrlString);
    const wasActive = this.treeElement.listItemElement.classList.contains('has-mapped-files');
    const isActive = Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(fileSystemPath);
    if (wasActive === isActive) {
      return;
    }
    this.treeElement.listItemElement.classList.toggle('has-mapped-files', isActive);
    if (this.treeElement.childrenListElement.hasFocus()) {
      return;
    }
    if (isActive) {
      this.treeElement.expand();
    } else {
      this.treeElement.collapse();
    }
  }

  override setTitle(title: string): void {
    this.title = title;
    if (this.treeElement) {
      this.treeElement.title = this.title;
    }
  }
}
