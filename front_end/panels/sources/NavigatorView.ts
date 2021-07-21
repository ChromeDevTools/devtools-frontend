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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Snippets from '../snippets/snippets.js';

import {SearchSourcesView} from './SearchSourcesView.js';

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
  *@description Text in Navigator View of the Sources panel
  */
  areYouSureYouWantToDeleteAll: 'Are you sure you want to delete all overrides contained in this folder?',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  openFolder: 'Open folder',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  newFile: 'New file',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  excludeFolder: 'Exclude folder',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  removeFolderFromWorkspace: 'Remove folder from workspace',
  /**
  *@description Text in Navigator View of the Sources panel
  */
  areYouSureYouWantToRemoveThis: 'Are you sure you want to remove this folder?',
  /**
  *@description A context menu item in the Navigator View of the Sources panel
  */
  deleteAllOverrides: 'Delete all overrides',
  /**
  *@description Name of an item from source map
  *@example {compile.html} PH1
  */
  sFromSourceMap: '{PH1} (from source map)',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/NavigatorView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const Types = {
  Domain: 'domain',
  File: 'file',
  FileSystem: 'fs',
  FileSystemFolder: 'fs-folder',
  Frame: 'frame',
  NetworkFolder: 'nw-folder',
  Root: 'root',
  SourceMapFolder: 'sm-folder',
  Worker: 'worker',
};

const TYPE_ORDERS = new Map([
  [Types.Root, 1],
  [Types.Domain, 10],
  [Types.FileSystemFolder, 1],
  [Types.NetworkFolder, 1],
  [Types.SourceMapFolder, 2],
  [Types.File, 10],
  [Types.Frame, 70],
  [Types.Worker, 90],
  [Types.FileSystem, 100],
]);

export class NavigatorView extends UI.Widget.VBox implements SDK.TargetManager.Observer {
  _placeholder: UI.Widget.Widget|null;
  _scriptsTree: UI.TreeOutline.TreeOutlineInShadow;
  _uiSourceCodeNodes:
      Platform.MapUtilities.Multimap<Workspace.UISourceCode.UISourceCode, NavigatorUISourceCodeTreeNode>;
  _subfolderNodes: Map<string, NavigatorFolderTreeNode>;
  _rootNode: NavigatorRootTreeNode;
  _frameNodes: Map<SDK.ResourceTreeModel.ResourceTreeFrame, NavigatorGroupTreeNode>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _navigatorGroupByFolderSetting: Common.Settings.Setting<any>;
  _workspace!: Workspace.Workspace.WorkspaceImpl;
  _lastSelectedUISourceCode?: Workspace.UISourceCode.UISourceCode;
  _groupByFrame?: boolean;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _groupByDomain?: any;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _groupByFolder?: any;
  constructor() {
    super(true);
    this.registerRequiredCSS('panels/sources/navigatorView.css');

    this._placeholder = null;
    this._scriptsTree = new UI.TreeOutline.TreeOutlineInShadow();
    this._scriptsTree.registerRequiredCSS('panels/sources/navigatorTree.css');
    this._scriptsTree.setComparator(NavigatorView._treeElementsCompare);
    this._scriptsTree.setFocusable(false);
    this.contentElement.appendChild(this._scriptsTree.element);
    this.setDefaultFocusedElement(this._scriptsTree.element);

    this._uiSourceCodeNodes = new Platform.MapUtilities.Multimap();
    this._subfolderNodes = new Map();

    this._rootNode = new NavigatorRootTreeNode(this);
    this._rootNode.populate();

    this._frameNodes = new Map();

    this.contentElement.addEventListener('contextmenu', this.handleContextMenu.bind(this), false);
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(
        this.contentElement, {'sources.rename': this._renameShortcut.bind(this)});

    this._navigatorGroupByFolderSetting = Common.Settings.Settings.instance().moduleSetting('navigatorGroupByFolder');
    this._navigatorGroupByFolderSetting.addChangeListener(this._groupingChanged.bind(this));

    this._initGrouping();

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingCreated, this._onBindingChanged, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(
        Persistence.Persistence.Events.BindingRemoved, this._onBindingChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.NameChanged, this._targetNameChanged, this);

    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this._resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    Bindings.NetworkProject.NetworkProjectManager.instance().addEventListener(
        Bindings.NetworkProject.Events.FrameAttributionAdded, this._frameAttributionAdded, this);
    Bindings.NetworkProject.NetworkProjectManager.instance().addEventListener(
        Bindings.NetworkProject.Events.FrameAttributionRemoved, this._frameAttributionRemoved, this);
  }

  static _treeElementOrder(treeElement: UI.TreeOutline.TreeElement): number {
    if (boostOrderForNode.has(treeElement)) {
      return 0;
    }

    const actualElement = (treeElement as NavigatorSourceTreeElement);

    let order = TYPE_ORDERS.get(actualElement._nodeType) || 0;
    if (actualElement._uiSourceCode) {
      const contentType = actualElement._uiSourceCode.contentType();
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

  static appendSearchItem(contextMenu: UI.ContextMenu.ContextMenu, path?: string): void {
    let searchLabel = i18nString(UIStrings.searchInFolder);
    if (!path || !path.trim()) {
      path = '*';
      searchLabel = i18nString(UIStrings.searchInAllFiles);
    }
    contextMenu.viewSection().appendItem(searchLabel, () => {
      if (path) {
        SearchSourcesView.openSearch(`file:${path.trim()}`);
      }
    });
  }

  static _treeElementsCompare(treeElement1: UI.TreeOutline.TreeElement, treeElement2: UI.TreeOutline.TreeElement):
      number {
    const typeWeight1 = NavigatorView._treeElementOrder(treeElement1);
    const typeWeight2 = NavigatorView._treeElementOrder(treeElement2);

    if (typeWeight1 > typeWeight2) {
      return 1;
    }
    if (typeWeight1 < typeWeight2) {
      return -1;
    }
    return Platform.StringUtilities.compare(treeElement1.titleAsText(), treeElement2.titleAsText());
  }

  setPlaceholder(placeholder: UI.Widget.Widget): void {
    console.assert(!this._placeholder, 'A placeholder widget was already set');
    this._placeholder = placeholder;
    placeholder.show(this.contentElement, this.contentElement.firstChild);
    updateVisibility.call(this);
    this._scriptsTree.addEventListener(UI.TreeOutline.Events.ElementAttached, updateVisibility.bind(this));
    this._scriptsTree.addEventListener(UI.TreeOutline.Events.ElementsDetached, updateVisibility.bind(this));

    function updateVisibility(this: NavigatorView): void {
      const showTree = this._scriptsTree.firstChild();
      if (showTree) {
        placeholder.hideWidget();
      } else {
        placeholder.showWidget();
      }
      this._scriptsTree.element.classList.toggle('hidden', !showTree);
    }
  }

  _onBindingChanged(event: Common.EventTarget.EventTargetEvent): void {
    const binding = (event.data as Persistence.Persistence.PersistenceBinding);

    // Update UISourceCode titles.
    const networkNodes = this._uiSourceCodeNodes.get(binding.network);
    for (const networkNode of networkNodes) {
      networkNode.updateTitle();
    }
    const fileSystemNodes = this._uiSourceCodeNodes.get(binding.fileSystem);
    for (const fileSystemNode of fileSystemNodes) {
      fileSystemNode.updateTitle();
    }

    // Update folder titles.
    const pathTokens =
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
    let folderPath = '';
    for (let i = 0; i < pathTokens.length - 1; ++i) {
      folderPath += pathTokens[i];
      const folderId =
          this._folderNodeId(binding.fileSystem.project(), null, null, binding.fileSystem.origin(), folderPath);
      const folderNode = this._subfolderNodes.get(folderId);
      if (folderNode) {
        folderNode.updateTitle();
      }
      folderPath += '/';
    }

    // Update fileSystem root title.
    const fileSystemRoot = this._rootNode.child(binding.fileSystem.project().id());
    if (fileSystemRoot) {
      fileSystemRoot.updateTitle();
    }
  }

  focus(): void {
    this._scriptsTree.focus();
  }

  /**
   * Central place to add elements to the tree to
   * enable focus if the tree has elements
   */
  appendChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void {
    this._scriptsTree.setFocusable(true);
    parent.appendChild(child);
  }

  /**
   * Central place to remove elements from the tree to
   * disable focus if the tree is empty
   */
  removeChild(parent: UI.TreeOutline.TreeElement, child: UI.TreeOutline.TreeElement): void {
    parent.removeChild(child);
    if (this._scriptsTree.rootElement().childCount() === 0) {
      this._scriptsTree.setFocusable(false);
    }
  }

  _resetWorkspace(workspace: Workspace.Workspace.WorkspaceImpl): void {
    // Clear old event listeners first.
    if (this._workspace) {
      this._workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
      this._workspace.removeEventListener(
          Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
      this._workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this._projectAddedCallback, this);
      this._workspace.removeEventListener(
          Workspace.Workspace.Events.ProjectRemoved, this._projectRemovedCallback, this);
    }

    this._workspace = workspace;
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this._projectAddedCallback, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemovedCallback, this);
    this._workspace.projects().forEach(this._projectAdded.bind(this));
    this._computeUniqueFileSystemProjectNames();
  }

  _projectAddedCallback(event: Common.EventTarget.EventTargetEvent): void {
    const project = (event.data as Workspace.Workspace.Project);
    this._projectAdded(project);
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      this._computeUniqueFileSystemProjectNames();
    }
  }

  _projectRemovedCallback(event: Common.EventTarget.EventTargetEvent): void {
    const project = (event.data as Workspace.Workspace.Project);
    this._removeProject(project);
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      this._computeUniqueFileSystemProjectNames();
    }
  }

  workspace(): Workspace.Workspace.WorkspaceImpl {
    return this._workspace;
  }

  acceptProject(project: Workspace.Workspace.Project): boolean {
    return !project.isServiceProject();
  }

  _frameAttributionAdded(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode);
    if (!this._acceptsUISourceCode(uiSourceCode)) {
      return;
    }

    const addedFrame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame | null);
    // This event does not happen for UISourceCodes without initial attribution.
    this._addUISourceCodeNode(uiSourceCode, addedFrame);
  }

  _frameAttributionRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data.uiSourceCode as Workspace.UISourceCode.UISourceCode);
    if (!this._acceptsUISourceCode(uiSourceCode)) {
      return;
    }

    const removedFrame = (event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame | null);
    const node = Array.from(this._uiSourceCodeNodes.get(uiSourceCode)).find(node => node.frame() === removedFrame);
    this._removeUISourceCodeNode((node as NavigatorUISourceCodeTreeNode));
  }

  _acceptsUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return this.acceptProject(uiSourceCode.project());
  }

  _addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (!this._acceptsUISourceCode(uiSourceCode)) {
      return;
    }

    const frames = Bindings.NetworkProject.NetworkProject.framesForUISourceCode(uiSourceCode);
    if (frames.length) {
      for (const frame of frames) {
        this._addUISourceCodeNode(uiSourceCode, frame);
      }
    } else {
      this._addUISourceCodeNode(uiSourceCode, null);
    }
    this.uiSourceCodeAdded(uiSourceCode);
  }

  _addUISourceCodeNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): void {
    const isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
    let path;
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      path = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
    } else {
      path = Common.ParsedURL.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1);
    }

    const project = uiSourceCode.project();
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    const folderNode =
        this._folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
    const uiSourceCodeNode = new NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
    folderNode.appendChild(uiSourceCodeNode);
    this._uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
    this._selectDefaultTreeNode();
  }

  uiSourceCodeAdded(_uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
  }

  _uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._addUISourceCode(uiSourceCode);
  }

  _uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._removeUISourceCode(uiSourceCode);
  }

  tryAddProject(project: Workspace.Workspace.Project): void {
    this._projectAdded(project);
    project.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  _projectAdded(project: Workspace.Workspace.Project): void {
    if (!this.acceptProject(project) || project.type() !== Workspace.Workspace.projectTypes.FileSystem ||
        Snippets.ScriptSnippetFileSystem.isSnippetsProject(project) || this._rootNode.child(project.id())) {
      return;
    }
    this._rootNode.appendChild(
        new NavigatorGroupTreeNode(this, project, project.id(), Types.FileSystem, project.displayName()));
    this._selectDefaultTreeNode();
  }

  // TODO(einbinder) remove this code after crbug.com/964075 is fixed
  _selectDefaultTreeNode(): void {
    const children = this._rootNode.children();
    if (children.length && !this._scriptsTree.selectedTreeElement) {
      children[0].treeNode().select(true /* omitFocus */, false /* selectedByUser */);
    }
  }

  _computeUniqueFileSystemProjectNames(): void {
    const fileSystemProjects = this._workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem);
    if (!fileSystemProjects.length) {
      return;
    }
    const encoder = new Persistence.Persistence.PathEncoder();
    const reversedPaths = fileSystemProjects.map(project => {
      const fileSystem = (project as Persistence.FileSystemWorkspaceBinding.FileSystem);
      return Platform.StringUtilities.reverse(encoder.encode(fileSystem.fileSystemPath()));
    });
    const reversedIndex = new Common.Trie.Trie();
    for (const reversedPath of reversedPaths) {
      reversedIndex.add(reversedPath);
    }

    for (let i = 0; i < fileSystemProjects.length; ++i) {
      const reversedPath = reversedPaths[i];
      const project = fileSystemProjects[i];
      reversedIndex.remove(reversedPath);
      const commonPrefix = reversedIndex.longestPrefix(reversedPath, false /* fullWordOnly */);
      reversedIndex.add(reversedPath);
      const prefixPath = reversedPath.substring(0, commonPrefix.length + 1);
      const path = encoder.decode(Platform.StringUtilities.reverse(prefixPath));

      const fileSystemNode = this._rootNode.child(project.id());
      if (fileSystemNode) {
        fileSystemNode.setTitle(path);
      }
    }
  }

  _removeProject(project: Workspace.Workspace.Project): void {
    const uiSourceCodes = project.uiSourceCodes();
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      this._removeUISourceCode(uiSourceCodes[i]);
    }
    if (project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemNode = this._rootNode.child(project.id());
    if (!fileSystemNode) {
      return;
    }
    this._rootNode.removeChild(fileSystemNode);
  }

  _folderNodeId(
      project: Workspace.Workspace.Project, target: SDK.Target.Target|null,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null, projectOrigin: string, path: string): string {
    const targetId = target ? target.id() : '';
    const projectId = project.type() === Workspace.Workspace.projectTypes.FileSystem ? project.id() : '';
    const frameId = this._groupByFrame && frame ? frame.id : '';
    return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
  }

  _folderNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Workspace.Workspace.Project,
      target: SDK.Target.Target|null, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null, projectOrigin: string,
      path: string[], fromSourceMap: boolean): NavigatorTreeNode {
    if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode)) {
      return this._rootNode;
    }

    if (target && !this._groupByFolder && !fromSourceMap) {
      return this._domainNode(uiSourceCode, project, target, frame, projectOrigin);
    }

    const folderPath = path.join('/');
    const folderId = this._folderNodeId(project, target, frame, projectOrigin, folderPath);
    let folderNode = this._subfolderNodes.get(folderId);
    if (folderNode) {
      return folderNode;
    }

    if (!path.length) {
      if (target) {
        return this._domainNode(uiSourceCode, project, target, frame, projectOrigin);
      }
      return /** @type {!NavigatorTreeNode} */ this._rootNode.child(project.id()) as NavigatorTreeNode;
    }

    const parentNode =
        this._folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
    let type: string = fromSourceMap ? Types.SourceMapFolder : Types.NetworkFolder;
    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      type = Types.FileSystemFolder;
    }
    const name = path[path.length - 1];

    folderNode = new NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name);
    this._subfolderNodes.set(folderId, folderNode);
    parentNode.appendChild(folderNode);
    return folderNode;
  }

  _domainNode(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, project: Workspace.Workspace.Project,
      target: SDK.Target.Target, frame: SDK.ResourceTreeModel.ResourceTreeFrame|null,
      projectOrigin: string): NavigatorTreeNode {
    const frameNode = this._frameNode(project, target, frame);
    if (!this._groupByDomain) {
      return frameNode;
    }
    let domainNode = frameNode.child(projectOrigin);
    if (domainNode) {
      return domainNode;
    }

    domainNode = new NavigatorGroupTreeNode(
        this, project, projectOrigin, Types.Domain, this._computeProjectDisplayName(target, projectOrigin));
    if (frame && projectOrigin === Common.ParsedURL.ParsedURL.extractOrigin(frame.url)) {
      boostOrderForNode.add(domainNode.treeNode());
    }
    frameNode.appendChild(domainNode);
    return domainNode;
  }

  _frameNode(
      project: Workspace.Workspace.Project, target: SDK.Target.Target,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null): NavigatorTreeNode {
    if (!this._groupByFrame || !frame) {
      return this._targetNode(project, target);
    }

    let frameNode = this._frameNodes.get(frame);
    if (frameNode) {
      return frameNode;
    }

    frameNode =
        new NavigatorGroupTreeNode(this, project, target.id() + ':' + frame.id, Types.Frame, frame.displayName());
    frameNode.setHoverCallback(hoverCallback);
    this._frameNodes.set(frame, frameNode);

    const parentFrame = frame.parentFrame();
    this._frameNode(project, parentFrame ? parentFrame.resourceTreeModel().target() : target, parentFrame)
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

  _targetNode(project: Workspace.Workspace.Project, target: SDK.Target.Target): NavigatorTreeNode {
    if (target === SDK.TargetManager.TargetManager.instance().mainTarget()) {
      return this._rootNode;
    }

    let targetNode = this._rootNode.child('target:' + target.id());
    if (!targetNode) {
      targetNode = new NavigatorGroupTreeNode(
          this, project, 'target:' + target.id(), target.type() === SDK.Target.Type.Frame ? Types.Frame : Types.Worker,
          target.name());
      this._rootNode.appendChild(targetNode);
    }
    return targetNode;
  }

  _computeProjectDisplayName(target: SDK.Target.Target, projectOrigin: string): string {
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    for (const context of executionContexts) {
      if (context.name && context.origin && projectOrigin.startsWith(context.origin)) {
        return context.name;
      }
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
    const nodes = this._uiSourceCodeNodes.get(uiSourceCode);
    if (nodes.size === 0) {
      return null;
    }
    const node = nodes.values().next().value;
    if (!node) {
      return null;
    }
    if (this._scriptsTree.selectedTreeElement) {
      this._scriptsTree.selectedTreeElement.deselect();
    }
    this._lastSelectedUISourceCode = uiSourceCode;
    // TODO(dgozman): figure out revealing multiple.
    node.reveal(select);
    return node;
  }

  _sourceSelected(uiSourceCode: Workspace.UISourceCode.UISourceCode, focusSource: boolean): void {
    this._lastSelectedUISourceCode = uiSourceCode;
    Common.Revealer.reveal(uiSourceCode, !focusSource);
  }

  _removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const nodes = this._uiSourceCodeNodes.get(uiSourceCode);
    for (const node of nodes) {
      this._removeUISourceCodeNode(node);
    }
  }

  _removeUISourceCodeNode(node: NavigatorUISourceCodeTreeNode): void {
    const uiSourceCode = node.uiSourceCode();
    this._uiSourceCodeNodes.delete(uiSourceCode, node);
    const project = uiSourceCode.project();
    const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
    const frame = node.frame();

    let parentNode: (NavigatorTreeNode|null) = node.parent;
    if (!parentNode) {
      return;
    }
    parentNode.removeChild(node);
    let currentNode: (NavigatorUISourceCodeTreeNode|null) = (parentNode as NavigatorUISourceCodeTreeNode | null);

    while (currentNode) {
      parentNode = currentNode.parent;
      if (!parentNode || !currentNode.isEmpty()) {
        break;
      }
      if (parentNode === this._rootNode && project.type() === Workspace.Workspace.projectTypes.FileSystem) {
        break;
      }
      if (!(currentNode instanceof NavigatorGroupTreeNode || currentNode instanceof NavigatorFolderTreeNode)) {
        break;
      }
      if (currentNode._type === Types.Frame) {
        this._discardFrame((frame as SDK.ResourceTreeModel.ResourceTreeFrame));
        break;
      }

      const folderId = this._folderNodeId(
          project, target, frame, uiSourceCode.origin(),
          currentNode instanceof NavigatorFolderTreeNode && currentNode._folderPath || '');
      this._subfolderNodes.delete(folderId);
      parentNode.removeChild(currentNode);
      currentNode = (parentNode as NavigatorUISourceCodeTreeNode | null);
    }
  }

  reset(): void {
    for (const node of this._uiSourceCodeNodes.valuesArray()) {
      node.dispose();
    }

    this._scriptsTree.removeChildren();
    this._scriptsTree.setFocusable(false);
    this._uiSourceCodeNodes.clear();
    this._subfolderNodes.clear();
    this._frameNodes.clear();
    this._rootNode.reset();
    // Reset the workspace to repopulate filesystem folders.
    this._resetWorkspace(Workspace.Workspace.WorkspaceImpl.instance());
  }

  handleContextMenu(_event: Event): void {
  }

  async _renameShortcut(): Promise<boolean> {
    const selectedTreeElement = (this._scriptsTree.selectedTreeElement as NavigatorSourceTreeElement | null);
    const node = selectedTreeElement && selectedTreeElement._node;
    if (!node || !node._uiSourceCode || !node._uiSourceCode.canRename()) {
      return false;
    }
    this.rename(node, false);
    return true;
  }

  _handleContextMenuCreate(
      project: Workspace.Workspace.Project, path: string, uiSourceCode?: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode) {
      const relativePath = Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
      relativePath.pop();
      path = relativePath.join('/');
    }
    this.create(project, path, uiSourceCode);
  }

  _handleContextMenuRename(node: NavigatorUISourceCodeTreeNode): void {
    this.rename(node, false);
  }

  _handleContextMenuExclude(project: Workspace.Workspace.Project, path: string): void {
    const shouldExclude = window.confirm(i18nString(UIStrings.areYouSureYouWantToExcludeThis));
    if (shouldExclude) {
      UI.UIUtils.startBatchUpdate();
      project.excludeFolder(
          Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path));
      UI.UIUtils.endBatchUpdate();
    }
  }

  _handleContextMenuDelete(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const shouldDelete = window.confirm(i18nString(UIStrings.areYouSureYouWantToDeleteThis));
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
          i18nString(UIStrings.rename), this._handleContextMenuRename.bind(this, node));
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.makeACopy), this._handleContextMenuCreate.bind(this, project, '', uiSourceCode));
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.delete), this._handleContextMenuDelete.bind(this, uiSourceCode));
    }

    contextMenu.show();
  }

  _handleDeleteOverrides(node: NavigatorTreeNode): void {
    const shouldRemove = window.confirm(i18nString(UIStrings.areYouSureYouWantToDeleteAll));
    if (shouldRemove) {
      this._handleDeleteOverridesHelper(node);
    }
  }

  _handleDeleteOverridesHelper(node: NavigatorTreeNode): void {
    node._children.forEach(child => {
      this._handleDeleteOverridesHelper(child);
    });
    if (node instanceof NavigatorUISourceCodeTreeNode) {
      // Only delete confirmed overrides and not just any file that happens to be in the folder.
      const binding = Persistence.Persistence.PersistenceImpl.instance().binding(node.uiSourceCode());
      if (binding) {
        node.uiSourceCode().project().deleteFile(node.uiSourceCode());
      }
    }
  }

  handleFolderContextMenu(event: Event, node: NavigatorTreeNode): void {
    const path = (node as NavigatorFolderTreeNode)._folderPath || '';
    const project = (node as NavigatorFolderTreeNode)._project || null;

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    NavigatorView.appendSearchItem(contextMenu, path);

    if (!project) {
      return;
    }

    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      const folderPath = Common.ParsedURL.ParsedURL.urlToPlatformPath(
          Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.completeURL(project, path),
          Host.Platform.isWin());
      contextMenu.revealSection().appendItem(
          i18nString(UIStrings.openFolder),
          () => Host.InspectorFrontendHost.InspectorFrontendHostInstance.showItemInFolder(folderPath));
      if (project.canCreateFile()) {
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.newFile), () => {
          this._handleContextMenuCreate(project, path, undefined);
        });
      }
    }

    if (project.canExcludeFolder(path)) {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.excludeFolder), this._handleContextMenuExclude.bind(this, project, path));
    }

    if (project.type() === Workspace.Workspace.projectTypes.FileSystem) {
      contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace', undefined, true);
      if (node instanceof NavigatorGroupTreeNode) {
        contextMenu.defaultSection().appendItem(i18nString(UIStrings.removeFolderFromWorkspace), () => {
          const shouldRemove = window.confirm(i18nString(UIStrings.areYouSureYouWantToRemoveThis));
          if (shouldRemove) {
            project.remove();
          }
        });
      }
      if ((project as Persistence.FileSystemWorkspaceBinding.FileSystem).fileSystem().type() === 'overrides') {
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.deleteAllOverrides), this._handleDeleteOverrides.bind(this, node));
      }
    }

    contextMenu.show();
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
      } else if (node._treeElement && node._treeElement.listItemElement.hasFocus()) {
        this._sourceSelected(uiSourceCode, true);
      }
    }
  }

  async create(
      project: Workspace.Workspace.Project, path: string,
      uiSourceCodeToCopy?: Workspace.UISourceCode.UISourceCode): Promise<void> {
    let content = '';
    if (uiSourceCodeToCopy) {
      content = (await uiSourceCodeToCopy.requestContent()).content || '';
    }
    const uiSourceCode = await project.createFile(path, null, content);
    if (!uiSourceCode) {
      return;
    }
    this._sourceSelected(uiSourceCode, false);
    const node = this.revealUISourceCode(uiSourceCode, true);
    if (node) {
      this.rename(node, true);
    }
  }

  _groupingChanged(): void {
    this.reset();
    this._initGrouping();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  _initGrouping(): void {
    this._groupByFrame = true;
    this._groupByDomain = this._navigatorGroupByFolderSetting.get();
    this._groupByFolder = this._groupByDomain;
  }

  _resetForTest(): void {
    this.reset();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  _discardFrame(frame: SDK.ResourceTreeModel.ResourceTreeFrame): void {
    const node = this._frameNodes.get(frame);
    if (!node) {
      return;
    }

    if (node.parent) {
      node.parent.removeChild(node);
    }
    this._frameNodes.delete(frame);
    for (const child of frame.childFrames) {
      this._discardFrame(child);
    }
  }

  targetAdded(_target: SDK.Target.Target): void {
  }

  targetRemoved(target: SDK.Target.Target): void {
    const targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode) {
      this._rootNode.removeChild(targetNode);
    }
  }

  _targetNameChanged(event: Common.EventTarget.EventTargetEvent<SDK.Target.Target>): void {
    const target = event.data;
    const targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode) {
      targetNode.setTitle(target.name());
    }
  }
}

const boostOrderForNode = new WeakSet<UI.TreeOutline.TreeElement>();

export class NavigatorFolderTreeElement extends UI.TreeOutline.TreeElement {
  _nodeType: string;
  _navigatorView: NavigatorView;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _hoverCallback: ((arg0: boolean) => any)|undefined;
  _node!: NavigatorTreeNode;
  _hovered?: boolean;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(navigatorView: NavigatorView, type: string, title: string, hoverCallback?: ((arg0: boolean) => any)) {
    super('', true);
    this.listItemElement.classList.add('navigator-' + type + '-tree-item', 'navigator-folder-tree-item');
    UI.ARIAUtils.setAccessibleName(this.listItemElement, `${title}, ${type}`);
    this._nodeType = type;
    this.title = title;
    this.tooltip = title;
    this._navigatorView = navigatorView;
    this._hoverCallback = hoverCallback;
    let iconType = 'largeicon-navigator-folder';
    if (type === Types.Domain) {
      iconType = 'largeicon-navigator-domain';
    } else if (type === Types.Frame) {
      iconType = 'largeicon-navigator-frame';
    } else if (type === Types.Worker) {
      iconType = 'largeicon-navigator-worker';
    }
    this.setLeadingIcons([UI.Icon.Icon.create(iconType, 'icon')]);
  }

  async onpopulate(): Promise<void> {
    this._node.populate();
  }

  onattach(): void {
    this.collapse();
    this._node.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('mousemove', this._mouseMove.bind(this), false);
    this.listItemElement.addEventListener('mouseleave', this._mouseLeave.bind(this), false);
  }

  setNode(node: NavigatorTreeNode): void {
    this._node = node;
    const paths = [];
    let currentNode: NavigatorTreeNode|null = node;
    while (currentNode && !currentNode.isRoot()) {
      paths.push(currentNode._title);
      currentNode = currentNode.parent;
    }
    paths.reverse();
    this.tooltip = paths.join('/');
    UI.ARIAUtils.setAccessibleName(this.listItemElement, `${this.title}, ${this._nodeType}`);
  }

  _handleContextMenuEvent(event: Event): void {
    if (!this._node) {
      return;
    }
    this.select();
    this._navigatorView.handleFolderContextMenu(event, this._node);
  }

  _mouseMove(_event: Event): void {
    if (this._hovered || !this._hoverCallback) {
      return;
    }
    this._hovered = true;
    this._hoverCallback(true);
  }

  _mouseLeave(_event: Event): void {
    if (!this._hoverCallback) {
      return;
    }
    this._hovered = false;
    this._hoverCallback(false);
  }
}

export class NavigatorSourceTreeElement extends UI.TreeOutline.TreeElement {
  _nodeType: string;
  _node: NavigatorUISourceCodeTreeNode;
  _navigatorView: NavigatorView;
  _uiSourceCode: Workspace.UISourceCode.UISourceCode;

  constructor(
      navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode, title: string,
      node: NavigatorUISourceCodeTreeNode) {
    super('', false);
    this._nodeType = Types.File;
    this._node = node;
    this.title = title;
    this.listItemElement.classList.add(
        'navigator-' + uiSourceCode.contentType().name() + '-tree-item', 'navigator-file-tree-item');
    this.tooltip = uiSourceCode.url();
    UI.ARIAUtils.setAccessibleName(this.listItemElement, `${uiSourceCode.name()}, ${this._nodeType}`);
    Common.EventTarget.fireEvent('source-tree-file-added', uiSourceCode.fullDisplayName());
    this._navigatorView = navigatorView;
    this._uiSourceCode = uiSourceCode;
    this.updateIcon();
  }

  updateIcon(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this._uiSourceCode);
    if (binding) {
      const container = document.createElement('span');
      container.classList.add('icon-stack');
      let iconType = 'largeicon-navigator-file-sync';
      if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(binding.fileSystem)) {
        iconType = 'largeicon-navigator-snippet';
      }
      const icon = UI.Icon.Icon.create(iconType, 'icon');
      const badge = UI.Icon.Icon.create('badge-navigator-file-sync', 'icon-badge');
      // TODO(allada) This does not play well with dark theme. Add an actual icon and use it.
      if (Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project() ===
          binding.fileSystem.project()) {
        badge.style.filter = 'hue-rotate(160deg)';
      }
      container.appendChild(icon);
      container.appendChild(badge);
      UI.Tooltip.Tooltip.install(
          container, Persistence.PersistenceUtils.PersistenceUtils.tooltipForUISourceCode(this._uiSourceCode));
      this.setLeadingIcons([(container as UI.Icon.Icon)]);
    } else {
      let iconType = 'largeicon-navigator-file';
      if (Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this._uiSourceCode)) {
        iconType = 'largeicon-navigator-snippet';
      }
      const defaultIcon = UI.Icon.Icon.create(iconType, 'icon');
      this.setLeadingIcons([defaultIcon]);
    }
  }

  get uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this._uiSourceCode;
  }

  onattach(): void {
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('click', this._onclick.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
  }

  _shouldRenameOnMouseDown(): boolean {
    if (!this._uiSourceCode.canRename()) {
      return false;
    }
    if (!this.treeOutline) {
      return false;
    }
    const isSelected = this === this.treeOutline.selectedTreeElement;
    return isSelected && this.treeOutline.element.hasFocus() && !UI.UIUtils.isBeingEdited(this.treeOutline.element);
  }

  selectOnMouseDown(event: MouseEvent): void {
    if (event.which !== 1 || !this._shouldRenameOnMouseDown()) {
      super.selectOnMouseDown(event);
      return;
    }
    setTimeout(rename.bind(this), 300);

    function rename(this: NavigatorSourceTreeElement): void {
      if (this._shouldRenameOnMouseDown()) {
        this._navigatorView.rename(this._node, false);
      }
    }
  }

  _ondragstart(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData('text/plain', this._uiSourceCode.url());
    event.dataTransfer.effectAllowed = 'copy';
  }

  onspace(): boolean {
    this._navigatorView._sourceSelected(this.uiSourceCode, true);
    return true;
  }

  _onclick(_event: Event): void {
    this._navigatorView._sourceSelected(this.uiSourceCode, false);
  }

  ondblclick(event: Event): boolean {
    const middleClick = (event as MouseEvent).button === 1;
    this._navigatorView._sourceSelected(this.uiSourceCode, !middleClick);
    return false;
  }

  onenter(): boolean {
    this._navigatorView._sourceSelected(this.uiSourceCode, true);
    return true;
  }

  ondelete(): boolean {
    return true;
  }

  _handleContextMenuEvent(event: Event): void {
    this.select();
    this._navigatorView.handleFileContextMenu(event, this._node);
  }
}

export class NavigatorTreeNode {
  id: string;
  _navigatorView: NavigatorView;
  _type: string;
  _children: Map<string, NavigatorTreeNode>;
  _populated: boolean;
  _isMerged: boolean;
  parent!: NavigatorTreeNode|null;
  _title!: string;
  constructor(navigatorView: NavigatorView, id: string, type: string) {
    this.id = id;
    this._navigatorView = navigatorView;
    this._type = type;
    this._children = new Map();

    this._populated = false;
    this._isMerged = false;
  }

  treeNode(): UI.TreeOutline.TreeElement {
    throw 'Not implemented';
  }

  dispose(): void {
  }

  updateTitle(): void {
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
    this._populated = true;
    this.wasPopulated();
  }

  wasPopulated(): void {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      this._navigatorView.appendChild(this.treeNode(), (children[i].treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  didAddChild(node: NavigatorTreeNode): void {
    if (this.isPopulated()) {
      this._navigatorView.appendChild(this.treeNode(), (node.treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  willRemoveChild(node: NavigatorTreeNode): void {
    if (this.isPopulated()) {
      this._navigatorView.removeChild(this.treeNode(), (node.treeNode() as UI.TreeOutline.TreeElement));
    }
  }

  isPopulated(): boolean {
    return this._populated;
  }

  isEmpty(): boolean {
    return !this._children.size;
  }

  children(): NavigatorTreeNode[] {
    return [...this._children.values()];
  }

  child(id: string): NavigatorTreeNode|null {
    return this._children.get(id) || null;
  }

  appendChild(node: NavigatorTreeNode): void {
    this._children.set(node.id, node);
    node.parent = this;
    this.didAddChild(node);
  }

  removeChild(node: NavigatorTreeNode): void {
    this.willRemoveChild(node);
    this._children.delete(node.id);
    node.parent = null;
    node.dispose();
  }

  reset(): void {
    this._children.clear();
  }
}

export class NavigatorRootTreeNode extends NavigatorTreeNode {
  constructor(navigatorView: NavigatorView) {
    super(navigatorView, '', Types.Root);
  }

  isRoot(): boolean {
    return true;
  }

  treeNode(): UI.TreeOutline.TreeElement {
    return this._navigatorView._scriptsTree.rootElement();
  }
}

export class NavigatorUISourceCodeTreeNode extends NavigatorTreeNode {
  _uiSourceCode: Workspace.UISourceCode.UISourceCode;
  _treeElement: NavigatorSourceTreeElement|null;
  _eventListeners: Common.EventTarget.EventDescriptor[];
  _frame: SDK.ResourceTreeModel.ResourceTreeFrame|null;
  constructor(
      navigatorView: NavigatorView, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      frame: SDK.ResourceTreeModel.ResourceTreeFrame|null) {
    super(navigatorView, uiSourceCode.project().id() + ':' + uiSourceCode.url(), Types.File);
    this._uiSourceCode = uiSourceCode;
    this._treeElement = null;
    this._eventListeners = [];
    this._frame = frame;
  }

  frame(): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    return this._frame;
  }

  uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this._uiSourceCode;
  }

  treeNode(): UI.TreeOutline.TreeElement {
    if (this._treeElement) {
      return this._treeElement;
    }

    this._treeElement = new NavigatorSourceTreeElement(this._navigatorView, this._uiSourceCode, '', this);
    this.updateTitle();

    const updateTitleBound = this.updateTitle.bind(this, undefined);
    this._eventListeners = [
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound),
    ];
    return this._treeElement;
  }

  updateTitle(ignoreIsDirty?: boolean): void {
    if (!this._treeElement) {
      return;
    }

    let titleText = this._uiSourceCode.displayName();
    if (!ignoreIsDirty && this._uiSourceCode.isDirty()) {
      titleText = '*' + titleText;
    }

    this._treeElement.title = titleText;
    this._treeElement.updateIcon();

    let tooltip = this._uiSourceCode.url();
    if (this._uiSourceCode.contentType().isFromSourceMap()) {
      tooltip = i18nString(UIStrings.sFromSourceMap, {PH1: this._uiSourceCode.displayName()});
    }
    this._treeElement.tooltip = tooltip;
  }

  hasChildren(): boolean {
    return false;
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }

  reveal(select?: boolean): void {
    if (this.parent) {
      this.parent.populate();
      this.parent.treeNode().expand();
    }
    if (this._treeElement) {
      this._treeElement.reveal(true);
      if (select) {
        this._treeElement.select(true);
      }
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rename(callback?: ((arg0: boolean) => any)): void {
    if (!this._treeElement) {
      return;
    }

    this._treeElement.listItemElement.focus();

    if (!this._treeElement.treeOutline) {
      return;
    }

    // Tree outline should be marked as edited as well as the tree element to prevent search from starting.
    const treeOutlineElement = this._treeElement.treeOutline.element;
    UI.UIUtils.markBeingEdited(treeOutlineElement, true);

    function commitHandler(
        this: NavigatorUISourceCodeTreeNode, element: Element, newTitle: string, oldTitle: string): void {
      if (newTitle !== oldTitle) {
        if (this._treeElement) {
          this._treeElement.title = newTitle;
        }
        this._uiSourceCode.rename(newTitle).then(renameCallback.bind(this));
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
    this._treeElement.startEditingTitle(
        new UI.InplaceEditor.Config(commitHandler.bind(this), afterEditing.bind(this, false)));
  }
}

export class NavigatorFolderTreeNode extends NavigatorTreeNode {
  _project: Workspace.Workspace.Project|null;
  _folderPath: string;
  _title: string;
  _treeElement!: NavigatorFolderTreeElement|null;
  constructor(
      navigatorView: NavigatorView, project: Workspace.Workspace.Project|null, id: string, type: string,
      folderPath: string, title: string) {
    super(navigatorView, id, type);
    this._project = project;
    this._folderPath = folderPath;
    this._title = title;
  }

  treeNode(): UI.TreeOutline.TreeElement {
    if (this._treeElement) {
      return this._treeElement;
    }
    this._treeElement = this._createTreeElement(this._title, this);
    this.updateTitle();
    return this._treeElement;
  }

  updateTitle(): void {
    if (!this._treeElement || !this._project || this._project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const absoluteFileSystemPath =
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this._project.id()) + '/' +
        this._folderPath;
    const hasMappedFiles =
        Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(absoluteFileSystemPath);
    this._treeElement.listItemElement.classList.toggle('has-mapped-files', hasMappedFiles);
  }

  _createTreeElement(title: string, node: NavigatorTreeNode): NavigatorFolderTreeElement {
    if (this._project && this._project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      try {
        title = decodeURI(title);
      } catch (e) {
      }
    }
    const treeElement = new NavigatorFolderTreeElement(this._navigatorView, this._type, title);
    treeElement.setNode(node);
    return treeElement;
  }

  wasPopulated(): void {
    // @ts-ignore These types are invalid, but removing this check causes wrong behavior
    if (!this._treeElement || this._treeElement._node !== this) {
      return;
    }
    this._addChildrenRecursive();
  }

  _addChildrenRecursive(): void {
    const children = this.children();
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      this.didAddChild(child);
      if (child instanceof NavigatorFolderTreeNode) {
        child._addChildrenRecursive();
      }
    }
  }

  _shouldMerge(node: NavigatorTreeNode): boolean {
    return this._type !== Types.Domain && node instanceof NavigatorFolderTreeNode;
  }

  didAddChild(node: NavigatorTreeNode): void {
    if (!this._treeElement) {
      return;
    }

    let children = this.children();

    if (children.length === 1 && this._shouldMerge(node)) {
      node._isMerged = true;
      this._treeElement.title = this._treeElement.title + '/' + node._title;
      (node as NavigatorFolderTreeNode)._treeElement = this._treeElement;
      this._treeElement.setNode(node);
      return;
    }

    let oldNode;
    if (children.length === 2) {
      oldNode = children[0] !== node ? children[0] : children[1];
    }
    if (oldNode && oldNode._isMerged) {
      oldNode._isMerged = false;
      const mergedToNodes = [];
      mergedToNodes.push(this);
      let treeNode: (NavigatorTreeNode|null)|NavigatorTreeNode|this = this;
      while (treeNode && treeNode._isMerged) {
        treeNode = treeNode.parent;
        if (treeNode) {
          mergedToNodes.push(treeNode);
        }
      }
      mergedToNodes.reverse();
      const titleText = mergedToNodes.map(node => node._title).join('/');

      const nodes = [];
      treeNode = oldNode;
      do {
        nodes.push(treeNode);
        children = treeNode.children();
        treeNode = children.length === 1 ? children[0] : null;
      } while (treeNode && treeNode._isMerged);

      if (!this.isPopulated()) {
        this._treeElement.title = titleText;
        this._treeElement.setNode(this);
        for (let i = 0; i < nodes.length; ++i) {
          (nodes[i] as NavigatorFolderTreeNode)._treeElement = null;
          nodes[i]._isMerged = false;
        }
        return;
      }
      const oldTreeElement = this._treeElement;
      const treeElement = this._createTreeElement(titleText, this);
      for (let i = 0; i < mergedToNodes.length; ++i) {
        (mergedToNodes[i] as NavigatorFolderTreeNode)._treeElement = treeElement;
      }
      if (oldTreeElement.parent) {
        this._navigatorView.appendChild(oldTreeElement.parent, treeElement);
      }

      oldTreeElement.setNode(nodes[nodes.length - 1]);
      oldTreeElement.title = nodes.map(node => node._title).join('/');
      if (oldTreeElement.parent) {
        this._navigatorView.removeChild(oldTreeElement.parent, oldTreeElement);
      }
      this._navigatorView.appendChild(this._treeElement, oldTreeElement);
      if (oldTreeElement.expanded) {
        treeElement.expand();
      }
    }
    if (this.isPopulated()) {
      this._navigatorView.appendChild(this._treeElement, node.treeNode());
    }
  }

  willRemoveChild(node: NavigatorTreeNode): void {
    const actualNode = (node as NavigatorFolderTreeNode);
    if (actualNode._isMerged || !this.isPopulated() || !this._treeElement || !actualNode._treeElement) {
      return;
    }
    this._navigatorView.removeChild(this._treeElement, actualNode._treeElement);
  }
}

export class NavigatorGroupTreeNode extends NavigatorTreeNode {
  _project: Workspace.Workspace.Project;
  _title: string;
  _hoverCallback?: ((arg0: boolean) => void);
  _treeElement?: NavigatorFolderTreeElement;
  constructor(
      navigatorView: NavigatorView, project: Workspace.Workspace.Project, id: string, type: string, title: string) {
    super(navigatorView, id, type);
    this._project = project;
    this._title = title;
    this.populate();
  }

  setHoverCallback(hoverCallback: (arg0: boolean) => void): void {
    this._hoverCallback = hoverCallback;
  }

  treeNode(): UI.TreeOutline.TreeElement {
    if (this._treeElement) {
      return this._treeElement;
    }
    this._treeElement =
        new NavigatorFolderTreeElement(this._navigatorView, this._type, this._title, this._hoverCallback);
    this._treeElement.setNode(this);
    return this._treeElement;
  }

  onattach(): void {
    this.updateTitle();
  }

  updateTitle(): void {
    if (!this._treeElement || this._project.type() !== Workspace.Workspace.projectTypes.FileSystem) {
      return;
    }
    const fileSystemPath =
        Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());
    const wasActive = this._treeElement.listItemElement.classList.contains('has-mapped-files');
    const isActive = Persistence.Persistence.PersistenceImpl.instance().filePathHasBindings(fileSystemPath);
    if (wasActive === isActive) {
      return;
    }
    this._treeElement.listItemElement.classList.toggle('has-mapped-files', isActive);
    if (this._treeElement.childrenListElement.hasFocus()) {
      return;
    }
    if (isActive) {
      this._treeElement.expand();
    } else {
      this._treeElement.collapse();
    }
  }

  setTitle(title: string): void {
    this._title = title;
    if (this._treeElement) {
      this._treeElement.title = this._title;
    }
  }
}
