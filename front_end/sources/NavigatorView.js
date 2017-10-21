/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Sources.NavigatorView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/navigatorView.css');

    this._scriptsTree = new UI.TreeOutlineInShadow();
    this._scriptsTree.registerRequiredCSS('sources/navigatorTree.css');
    this._scriptsTree.setComparator(Sources.NavigatorView._treeElementsCompare);
    this.contentElement.appendChild(this._scriptsTree.element);
    this.setDefaultFocusedElement(this._scriptsTree.element);

    /** @type {!Multimap<!Workspace.UISourceCode, !Sources.NavigatorUISourceCodeTreeNode>} */
    this._uiSourceCodeNodes = new Multimap();
    /** @type {!Map.<string, !Sources.NavigatorFolderTreeNode>} */
    this._subfolderNodes = new Map();

    this._rootNode = new Sources.NavigatorRootTreeNode(this);
    this._rootNode.populate();

    /** @type {!Map.<!SDK.ResourceTreeFrame, !Sources.NavigatorGroupTreeNode>} */
    this._frameNodes = new Map();

    this.contentElement.addEventListener('contextmenu', this.handleContextMenu.bind(this), false);

    this._navigatorGroupByFolderSetting = Common.moduleSetting('navigatorGroupByFolder');
    this._navigatorGroupByFolderSetting.addChangeListener(this._groupingChanged.bind(this));

    this._initGrouping();

    if (Runtime.experiments.isEnabled('persistence2')) {
      Persistence.persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated, this._onBindingChanged, this);
      Persistence.persistence.addEventListener(
          Persistence.Persistence.Events.BindingRemoved, this._onBindingChanged, this);
    } else {
      Persistence.persistence.addEventListener(
          Persistence.Persistence.Events.BindingCreated, this._onBindingCreated, this);
      Persistence.persistence.addEventListener(
          Persistence.Persistence.Events.BindingRemoved, this._onBindingRemoved, this);
    }
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged, this._targetNameChanged, this);

    SDK.targetManager.observeTargets(this);
    this._resetWorkspace(Workspace.workspace);
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
    Bindings.networkProjectManager.addEventListener(
        Bindings.NetworkProjectManager.Events.FrameAttributionAdded, this._frameAttributionAdded, this);
    Bindings.networkProjectManager.addEventListener(
        Bindings.NetworkProjectManager.Events.FrameAttributionRemoved, this._frameAttributionRemoved, this);
  }

  /**
   * @param {!UI.TreeElement} treeElement
   */
  static _treeElementOrder(treeElement) {
    if (treeElement._boostOrder)
      return 0;

    if (!Sources.NavigatorView._typeOrders) {
      var weights = {};
      var types = Sources.NavigatorView.Types;
      weights[types.Root] = 1;
      weights[types.Domain] = 10;
      weights[types.FileSystemFolder] = 1;
      weights[types.NetworkFolder] = 1;
      weights[types.SourceMapFolder] = 2;
      weights[types.File] = 10;
      weights[types.Frame] = 70;
      weights[types.Worker] = 90;
      weights[types.FileSystem] = 100;
      Sources.NavigatorView._typeOrders = weights;
    }

    var order = Sources.NavigatorView._typeOrders[treeElement._nodeType];
    if (treeElement._uiSourceCode) {
      var contentType = treeElement._uiSourceCode.contentType();
      if (contentType.isDocument())
        order += 3;
      else if (contentType.isScript())
        order += 5;
      else if (contentType.isStyleSheet())
        order += 10;
      else
        order += 15;
    }

    return order;
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  static appendAddFolderItem(contextMenu) {
    function addFolder() {
      Persistence.isolatedFileSystemManager.addFileSystem();
    }

    var addFolderLabel = Common.UIString('Add folder to workspace');
    contextMenu.appendItem(addFolderLabel, addFolder);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {string=} path
   */
  static appendSearchItem(contextMenu, path) {
    function searchPath() {
      Sources.AdvancedSearchView.openSearch('', path.trim());
    }

    var searchLabel = Common.UIString('Search in folder');
    if (!path || !path.trim()) {
      path = '*';
      searchLabel = Common.UIString('Search in all files');
    }
    contextMenu.appendItem(searchLabel, searchPath);
  }

  /**
   * @param {!UI.TreeElement} treeElement1
   * @param {!UI.TreeElement} treeElement2
   * @return {number}
   */
  static _treeElementsCompare(treeElement1, treeElement2) {
    var typeWeight1 = Sources.NavigatorView._treeElementOrder(treeElement1);
    var typeWeight2 = Sources.NavigatorView._treeElementOrder(treeElement2);

    if (typeWeight1 > typeWeight2)
      return 1;
    if (typeWeight1 < typeWeight2)
      return -1;
    return treeElement1.titleAsText().compareTo(treeElement2.titleAsText());
  }

  /**
   * @param {!Common.Event} event
   */
  _onBindingCreated(event) {
    var binding = /** @type {!Persistence.PersistenceBinding} */ (event.data);
    this._removeUISourceCode(binding.network);
  }

  /**
   * @param {!Common.Event} event
   */
  _onBindingRemoved(event) {
    var binding = /** @type {!Persistence.PersistenceBinding} */ (event.data);
    this._addUISourceCode(binding.network);
  }

  /**
   * @param {!Common.Event} event
   */
  _onBindingChanged(event) {
    var binding = /** @type {!Persistence.PersistenceBinding} */ (event.data);

    // Update UISourceCode titles.
    var networkNodes = this._uiSourceCodeNodes.get(binding.network);
    for (var networkNode of networkNodes)
      networkNode.updateTitle();
    var fileSystemNodes = this._uiSourceCodeNodes.get(binding.fileSystem);
    for (var fileSystemNode of fileSystemNodes)
      fileSystemNode.updateTitle();

    // Update folder titles.
    var pathTokens = Persistence.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
    var folderPath = '';
    for (var i = 0; i < pathTokens.length - 1; ++i) {
      folderPath += pathTokens[i];
      var folderId =
          this._folderNodeId(binding.fileSystem.project(), null, null, binding.fileSystem.origin(), folderPath);
      var folderNode = this._subfolderNodes.get(folderId);
      if (folderNode)
        folderNode.updateTitle();
      folderPath += '/';
    }

    // Update fileSystem root title.
    var fileSystemRoot = this._rootNode.child(binding.fileSystem.project().id());
    if (fileSystemRoot)
      fileSystemRoot.updateTitle();
  }

  /**
   * @override
   */
  focus() {
    this._scriptsTree.focus();
  }

  /**
   * @param {!Workspace.Workspace} workspace
   */
  _resetWorkspace(workspace) {
    this._workspace = workspace;
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectAdded,
        event => this._projectAdded(/** @type {!Workspace.Project} */ (event.data)), this);
    this._workspace.addEventListener(
        Workspace.Workspace.Events.ProjectRemoved,
        event => this._removeProject(/** @type {!Workspace.Project} */ (event.data)), this);
    this._workspace.projects().forEach(this._projectAdded.bind(this));
  }

  /**
   * @return {!Workspace.Workspace}
   * @protected
   */
  workspace() {
    return this._workspace;
  }

  /**
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return !project.isServiceProject();
  }

  /**
   * @param {!Common.Event} event
   */
  _frameAttributionAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    if (!this._acceptsUISourceCode(uiSourceCode))
      return;

    var addedFrame = /** @type {?SDK.ResourceTreeFrame} */ (event.data.frame);
    // This event does not happen for UISourceCodes without initial attribution.
    this._addUISourceCodeNode(uiSourceCode, addedFrame);
  }

  /**
   * @param {!Common.Event} event
   */
  _frameAttributionRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    if (!this._acceptsUISourceCode(uiSourceCode))
      return;

    var removedFrame = /** @type {?SDK.ResourceTreeFrame} */ (event.data.frame);
    var node = Array.from(this._uiSourceCodeNodes.get(uiSourceCode)).find(node => node.frame() === removedFrame);
    this._removeUISourceCodeNode(node);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  _acceptsUISourceCode(uiSourceCode) {
    if (!this.acceptProject(uiSourceCode.project()))
      return false;

    var binding = Persistence.persistence.binding(uiSourceCode);
    if (!Runtime.experiments.isEnabled('persistence2') && binding && binding.network === uiSourceCode)
      return false;
    return true;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _addUISourceCode(uiSourceCode) {
    if (!this._acceptsUISourceCode(uiSourceCode))
      return;

    var frames = Bindings.NetworkProject.framesForUISourceCode(uiSourceCode);
    if (frames.length) {
      for (var frame of frames)
        this._addUISourceCodeNode(uiSourceCode, frame);
    } else {
      this._addUISourceCodeNode(uiSourceCode, null);
    }
    this.uiSourceCodeAdded(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?SDK.ResourceTreeFrame} frame
   */
  _addUISourceCodeNode(uiSourceCode, frame) {
    var isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
    var path;
    if (uiSourceCode.project().type() === Workspace.projectTypes.FileSystem)
      path = Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
    else
      path = Common.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1);

    var project = uiSourceCode.project();
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    var folderNode =
        this._folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
    var uiSourceCodeNode = new Sources.NavigatorUISourceCodeTreeNode(this, uiSourceCode, frame);
    folderNode.appendChild(uiSourceCodeNode);
    this._uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  uiSourceCodeAdded(uiSourceCode) {
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeAdded(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._addUISourceCode(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._removeUISourceCode(uiSourceCode);
  }

  /**
   * @protected
   * @param {!Workspace.Project} project
   */
  tryAddProject(project) {
    this._projectAdded(project);
    project.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  /**
   * @param {!Workspace.Project} project
   */
  _projectAdded(project) {
    if (!this.acceptProject(project) || project.type() !== Workspace.projectTypes.FileSystem ||
        this._rootNode.child(project.id()))
      return;
    this._rootNode.appendChild(new Sources.NavigatorGroupTreeNode(
        this, project, project.id(), Sources.NavigatorView.Types.FileSystem, project.displayName()));
  }

  /**
   * @param {!Workspace.Project} project
   */
  _removeProject(project) {
    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      this._removeUISourceCode(uiSourceCodes[i]);
    if (project.type() !== Workspace.projectTypes.FileSystem)
      return;
    var fileSystemNode = this._rootNode.child(project.id());
    if (!fileSystemNode)
      return;
    this._rootNode.removeChild(fileSystemNode);
  }

  /**
   * @param {!Workspace.Project} project
   * @param {?SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @param {string} path
   * @return {string}
   */
  _folderNodeId(project, target, frame, projectOrigin, path) {
    var targetId = target ? target.id() : '';
    var projectId = project.type() === Workspace.projectTypes.FileSystem ? project.id() : '';
    var frameId = this._groupByFrame && frame ? frame.id : '';
    return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Workspace.Project} project
   * @param {?SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @param {!Array<string>} path
   * @param {boolean} fromSourceMap
   * @return {!Sources.NavigatorTreeNode}
   */
  _folderNode(uiSourceCode, project, target, frame, projectOrigin, path, fromSourceMap) {
    if (project.type() === Workspace.projectTypes.Snippets)
      return this._rootNode;

    if (target && !this._groupByFolder && !fromSourceMap)
      return this._domainNode(uiSourceCode, project, target, frame, projectOrigin);

    var folderPath = path.join('/');
    var folderId = this._folderNodeId(project, target, frame, projectOrigin, folderPath);
    var folderNode = this._subfolderNodes.get(folderId);
    if (folderNode)
      return folderNode;

    if (!path.length) {
      if (target)
        return this._domainNode(uiSourceCode, project, target, frame, projectOrigin);
      return /** @type {!Sources.NavigatorTreeNode} */ (this._rootNode.child(project.id()));
    }

    var parentNode =
        this._folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
    var type = fromSourceMap ? Sources.NavigatorView.Types.SourceMapFolder : Sources.NavigatorView.Types.NetworkFolder;
    if (project.type() === Workspace.projectTypes.FileSystem)
      type = Sources.NavigatorView.Types.FileSystemFolder;
    var name = path[path.length - 1];

    folderNode = new Sources.NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name);
    this._subfolderNodes.set(folderId, folderNode);
    parentNode.appendChild(folderNode);
    return folderNode;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Workspace.Project} project
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @return {!Sources.NavigatorTreeNode}
   */
  _domainNode(uiSourceCode, project, target, frame, projectOrigin) {
    var frameNode = this._frameNode(project, target, frame);
    if (!this._groupByDomain)
      return frameNode;
    var domainNode = frameNode.child(projectOrigin);
    if (domainNode)
      return domainNode;

    domainNode = new Sources.NavigatorGroupTreeNode(
        this, project, projectOrigin, Sources.NavigatorView.Types.Domain,
        this._computeProjectDisplayName(target, projectOrigin));
    if (frame && projectOrigin === Common.ParsedURL.extractOrigin(frame.url))
      domainNode.treeNode()._boostOrder = true;
    frameNode.appendChild(domainNode);
    return domainNode;
  }

  /**
   * @param {!Workspace.Project} project
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @return {!Sources.NavigatorTreeNode}
   */
  _frameNode(project, target, frame) {
    if (!this._groupByFrame || !frame)
      return this._targetNode(project, target);

    if (!frame.parentFrame && target.parentTarget())
      return this._targetNode(project, target);

    var frameNode = this._frameNodes.get(frame);
    if (frameNode)
      return frameNode;

    frameNode = new Sources.NavigatorGroupTreeNode(
        this, project, target.id() + ':' + frame.id, Sources.NavigatorView.Types.Frame, frame.displayName());
    frameNode.setHoverCallback(hoverCallback);
    this._frameNodes.set(frame, frameNode);
    this._frameNode(project, target, frame.parentFrame).appendChild(frameNode);
    if (!frame.parentFrame)
      frameNode.treeNode()._boostOrder = true;

    /**
     * @param {boolean} hovered
     */
    function hoverCallback(hovered) {
      if (hovered) {
        var overlayModel = target.model(SDK.OverlayModel);
        if (overlayModel)
          overlayModel.highlightFrame(frame.id);
      } else {
        SDK.OverlayModel.hideDOMNodeHighlight();
      }
    }
    return frameNode;
  }

  /**
   * @param {!Workspace.Project} project
   * @param {!SDK.Target} target
   * @return {!Sources.NavigatorTreeNode}
   */
  _targetNode(project, target) {
    if (target === SDK.targetManager.mainTarget())
      return this._rootNode;

    var targetNode = this._rootNode.child('target:' + target.id());
    if (!targetNode) {
      targetNode = new Sources.NavigatorGroupTreeNode(
          this, project, 'target:' + target.id(),
          !target.hasBrowserCapability() ? Sources.NavigatorView.Types.Worker : Sources.NavigatorView.Types.Frame,
          target.name());
      this._rootNode.appendChild(targetNode);
    }
    return targetNode;
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} projectOrigin
   * @return {string}
   */
  _computeProjectDisplayName(target, projectOrigin) {
    var runtimeModel = target.model(SDK.RuntimeModel);
    var executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    for (var context of executionContexts) {
      if (context.name && context.origin && projectOrigin.startsWith(context.origin))
        return context.name;
    }

    if (!projectOrigin)
      return Common.UIString('(no domain)');

    var parsedURL = new Common.ParsedURL(projectOrigin);
    var prettyURL = parsedURL.isValid ? parsedURL.host + (parsedURL.port ? (':' + parsedURL.port) : '') : '';

    return (prettyURL || projectOrigin);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {boolean=} select
   * @return {?Sources.NavigatorUISourceCodeTreeNode}
   */
  revealUISourceCode(uiSourceCode, select) {
    var nodes = this._uiSourceCodeNodes.get(uiSourceCode);
    var node = nodes.firstValue();
    if (!node)
      return null;
    if (this._scriptsTree.selectedTreeElement)
      this._scriptsTree.selectedTreeElement.deselect();
    this._lastSelectedUISourceCode = uiSourceCode;
    // TODO(dgozman): figure out revealing multiple.
    node.reveal(select);
    return node;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {boolean} focusSource
   */
  _sourceSelected(uiSourceCode, focusSource) {
    this._lastSelectedUISourceCode = uiSourceCode;
    Common.Revealer.reveal(uiSourceCode, !focusSource);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  sourceDeleted(uiSourceCode) {
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _removeUISourceCode(uiSourceCode) {
    var nodes = this._uiSourceCodeNodes.get(uiSourceCode);
    for (var node of nodes)
      this._removeUISourceCodeNode(node);
  }

  /**
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   */
  _removeUISourceCodeNode(node) {
    var uiSourceCode = node.uiSourceCode();
    this._uiSourceCodeNodes.delete(uiSourceCode, node);
    var project = uiSourceCode.project();
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    var frame = node.frame();

    var parentNode = node.parent;
    parentNode.removeChild(node);
    node = parentNode;

    while (node) {
      parentNode = node.parent;
      if (!parentNode || !node.isEmpty())
        break;
      if (parentNode === this._rootNode && project.type() === Workspace.projectTypes.FileSystem)
        break;
      if (!(node instanceof Sources.NavigatorGroupTreeNode || node instanceof Sources.NavigatorFolderTreeNode))
        break;
      if (node._type === Sources.NavigatorView.Types.Frame) {
        this._discardFrame(/** @type {!SDK.ResourceTreeFrame} */ (frame));
        break;
      }

      var folderId = this._folderNodeId(project, target, frame, uiSourceCode.origin(), node._folderPath);
      this._subfolderNodes.delete(folderId);
      parentNode.removeChild(node);
      node = parentNode;
    }
  }

  reset() {
    for (var node of this._uiSourceCodeNodes.valuesArray())
      node.dispose();

    this._scriptsTree.removeChildren();
    this._uiSourceCodeNodes.clear();
    this._subfolderNodes.clear();
    this._frameNodes.clear();
    this._rootNode.reset();
  }

  /**
   * @param {!Event} event
   */
  handleContextMenu(event) {
  }

  /**
   * @param {!Workspace.Project} project
   * @param {string} path
   * @param {!Workspace.UISourceCode=} uiSourceCode
   */
  _handleContextMenuCreate(project, path, uiSourceCode) {
    if (uiSourceCode) {
      var relativePath = Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);
      relativePath.pop();
      path = relativePath.join('/');
    }
    this.create(project, path, uiSourceCode);
  }

  /**
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   */
  _handleContextMenuRename(node) {
    this.rename(node, false);
  }

  /**
   * @param {!Workspace.Project} project
   * @param {string} path
   */
  _handleContextMenuExclude(project, path) {
    var shouldExclude = window.confirm(Common.UIString('Are you sure you want to exclude this folder?'));
    if (shouldExclude) {
      UI.startBatchUpdate();
      project.excludeFolder(Persistence.FileSystemWorkspaceBinding.completeURL(project, path));
      UI.endBatchUpdate();
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _handleContextMenuDelete(uiSourceCode) {
    var shouldDelete = window.confirm(Common.UIString('Are you sure you want to delete this file?'));
    if (shouldDelete)
      uiSourceCode.project().deleteFile(uiSourceCode);
  }

  /**
   * @param {!Event} event
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   */
  handleFileContextMenu(event, node) {
    var uiSourceCode = node.uiSourceCode();
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendApplicableItems(uiSourceCode);
    contextMenu.appendSeparator();

    var project = uiSourceCode.project();
    if (project.type() === Workspace.projectTypes.FileSystem) {
      contextMenu.appendItem(Common.UIString('Rename\u2026'), this._handleContextMenuRename.bind(this, node));
      contextMenu.appendItem(
          Common.UIString('Make a copy\u2026'), this._handleContextMenuCreate.bind(this, project, '', uiSourceCode));
      contextMenu.appendItem(Common.UIString('Delete'), this._handleContextMenuDelete.bind(this, uiSourceCode));
      contextMenu.appendSeparator();
    }

    contextMenu.show();
  }

  /**
   * @param {!Event} event
   * @param {!Sources.NavigatorFolderTreeNode} node
   */
  handleFolderContextMenu(event, node) {
    var path = node._folderPath;
    var project = node._project;

    var contextMenu = new UI.ContextMenu(event);

    Sources.NavigatorView.appendSearchItem(contextMenu, path);
    contextMenu.appendSeparator();

    if (project.type() !== Workspace.projectTypes.FileSystem)
      return;

    contextMenu.appendItem(Common.UIString('New file'), this._handleContextMenuCreate.bind(this, project, path));
    contextMenu.appendItem(Common.UIString('Exclude folder'), this._handleContextMenuExclude.bind(this, project, path));

    function removeFolder() {
      var shouldRemove = window.confirm(Common.UIString('Are you sure you want to remove this folder?'));
      if (shouldRemove)
        project.remove();
    }

    contextMenu.appendSeparator();
    Sources.NavigatorView.appendAddFolderItem(contextMenu);
    if (node instanceof Sources.NavigatorGroupTreeNode)
      contextMenu.appendItem(Common.UIString('Remove folder from workspace'), removeFolder);

    contextMenu.show();
  }

  /**
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   * @param {boolean} deleteIfCanceled
   * @protected
   */
  rename(node, deleteIfCanceled) {
    var uiSourceCode = node.uiSourceCode();
    node.rename(callback.bind(this));

    /**
     * @this {Sources.NavigatorView}
     * @param {boolean} committed
     */
    function callback(committed) {
      if (!committed) {
        if (deleteIfCanceled)
          uiSourceCode.remove();
        return;
      }

      this._sourceSelected(uiSourceCode, true);
    }
  }

  /**
   * @param {!Workspace.Project} project
   * @param {string} path
   * @param {!Workspace.UISourceCode=} uiSourceCodeToCopy
   */
  async create(project, path, uiSourceCodeToCopy) {
    var content = '';
    if (uiSourceCodeToCopy)
      content = (await uiSourceCodeToCopy.requestContent()) || '';
    var uiSourceCode = await project.createFile(path, null, content);
    if (!uiSourceCode)
      return;
    this._sourceSelected(uiSourceCode, false);
    var node = this.revealUISourceCode(uiSourceCode, true);
    if (node)
      this.rename(node, true);
  }

  _groupingChanged() {
    this.reset();
    this._initGrouping();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  _initGrouping() {
    this._groupByFrame = true;
    this._groupByDomain = this._navigatorGroupByFolderSetting.get();
    this._groupByFolder = this._groupByDomain;
  }

  _resetForTest() {
    this.reset();
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _discardFrame(frame) {
    var node = this._frameNodes.get(frame);
    if (!node)
      return;

    if (node.parent)
      node.parent.removeChild(node);
    this._frameNodes.delete(frame);
    for (var child of frame.childFrames)
      this._discardFrame(child);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode)
      this._rootNode.removeChild(targetNode);
  }

  /**
   * @param {!Common.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!SDK.Target} */ (event.data);
    var targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode)
      targetNode.setTitle(target.name());
  }
};

Sources.NavigatorView.Types = {
  Domain: 'domain',
  File: 'file',
  FileSystem: 'fs',
  FileSystemFolder: 'fs-folder',
  Frame: 'frame',
  NetworkFolder: 'nw-folder',
  Root: 'root',
  SourceMapFolder: 'sm-folder',
  Worker: 'worker'
};

/**
 * @unrestricted
 */
Sources.NavigatorFolderTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   * @param {string} type
   * @param {string} title
   * @param {function(boolean)=} hoverCallback
   */
  constructor(navigatorView, type, title, hoverCallback) {
    super('', true);
    this.listItemElement.classList.add('navigator-' + type + '-tree-item', 'navigator-folder-tree-item');
    this._nodeType = type;
    this.title = title;
    this.tooltip = title;
    this._navigatorView = navigatorView;
    this._hoverCallback = hoverCallback;
    var iconType = 'largeicon-navigator-folder';
    if (type === Sources.NavigatorView.Types.Domain)
      iconType = 'largeicon-navigator-domain';
    else if (type === Sources.NavigatorView.Types.Frame)
      iconType = 'largeicon-navigator-frame';
    else if (type === Sources.NavigatorView.Types.Worker)
      iconType = 'largeicon-navigator-worker';
    this.setLeadingIcons([UI.Icon.create(iconType, 'icon')]);
  }

  /**
   * @override
   */
  onpopulate() {
    this._node.populate();
  }

  /**
   * @override
   */
  onattach() {
    this.collapse();
    this._node.onattach();
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('mousemove', this._mouseMove.bind(this), false);
    this.listItemElement.addEventListener('mouseleave', this._mouseLeave.bind(this), false);
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   */
  setNode(node) {
    this._node = node;
    var paths = [];
    while (node && !node.isRoot()) {
      paths.push(node._title);
      node = node.parent;
    }
    paths.reverse();
    this.tooltip = paths.join('/');
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    if (!this._node)
      return;
    this.select();
    this._navigatorView.handleFolderContextMenu(event, this._node);
  }

  /**
   * @param {!Event} event
   */
  _mouseMove(event) {
    if (this._hovered || !this._hoverCallback)
      return;
    this._hovered = true;
    this._hoverCallback(true);
  }

  /**
   * @param {!Event} event
   */
  _mouseLeave(event) {
    if (!this._hoverCallback)
      return;
    this._hovered = false;
    this._hoverCallback(false);
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorSourceTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} title
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   */
  constructor(navigatorView, uiSourceCode, title, node) {
    super('', false);
    this._nodeType = Sources.NavigatorView.Types.File;
    this._node = node;
    this.title = title;
    this.listItemElement.classList.add(
        'navigator-' + uiSourceCode.contentType().name() + '-tree-item', 'navigator-file-tree-item');
    this.tooltip = uiSourceCode.url();
    this._navigatorView = navigatorView;
    this._uiSourceCode = uiSourceCode;
    this.updateIcon();
  }

  updateIcon() {
    var binding = Persistence.persistence.binding(this._uiSourceCode);
    if (binding && Runtime.experiments.isEnabled('persistence2')) {
      var container = createElementWithClass('span', 'icon-stack');
      var icon = UI.Icon.create('largeicon-navigator-file-sync', 'icon');
      var badge = UI.Icon.create('badge-navigator-file-sync', 'icon-badge');
      // TODO(allada) This does not play well with dark theme. Add an actual icon and use it.
      if (Persistence.networkPersistenceManager.activeProject() === binding.fileSystem.project())
        badge.style.filter = 'hue-rotate(160deg)';
      container.appendChild(icon);
      container.appendChild(badge);
      container.title = Persistence.PersistenceUtils.tooltipForUISourceCode(this._uiSourceCode);
      this.setLeadingIcons([container]);
    } else {
      var iconType = 'largeicon-navigator-file';
      if (this._uiSourceCode.contentType() === Common.resourceTypes.Snippet)
        iconType = 'largeicon-navigator-snippet';
      var defaultIcon = UI.Icon.create(iconType, 'icon');
      this.setLeadingIcons([defaultIcon]);
    }
  }

  /**
   * @return {!Workspace.UISourceCode}
   */
  get uiSourceCode() {
    return this._uiSourceCode;
  }

  /**
   * @override
   */
  onattach() {
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener('click', this._onclick.bind(this), false);
    this.listItemElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
  }

  _shouldRenameOnMouseDown() {
    if (!this._uiSourceCode.canRename())
      return false;
    var isSelected = this === this.treeOutline.selectedTreeElement;
    return isSelected && this.treeOutline.element.hasFocus() && !UI.isBeingEdited(this.treeOutline.element);
  }

  /**
   * @override
   */
  selectOnMouseDown(event) {
    if (event.which !== 1 || !this._shouldRenameOnMouseDown()) {
      super.selectOnMouseDown(event);
      return;
    }
    setTimeout(rename.bind(this), 300);

    /**
     * @this {Sources.NavigatorSourceTreeElement}
     */
    function rename() {
      if (this._shouldRenameOnMouseDown())
        this._navigatorView.rename(this._node, false);
    }
  }

  /**
   * @param {!DragEvent} event
   */
  _ondragstart(event) {
    event.dataTransfer.setData('text/plain', this._uiSourceCode.url());
    event.dataTransfer.effectAllowed = 'copy';
  }

  /**
   * @override
   * @return {boolean}
   */
  onspace() {
    this._navigatorView._sourceSelected(this.uiSourceCode, true);
    return true;
  }

  /**
   * @param {!Event} event
   */
  _onclick(event) {
    this._navigatorView._sourceSelected(this.uiSourceCode, false);
  }

  /**
   * @override
   * @return {boolean}
   */
  ondblclick(event) {
    var middleClick = event.button === 1;
    this._navigatorView._sourceSelected(this.uiSourceCode, !middleClick);
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  onenter() {
    this._navigatorView._sourceSelected(this.uiSourceCode, true);
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  ondelete() {
    this._navigatorView.sourceDeleted(this.uiSourceCode);
    return true;
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    this.select();
    this._navigatorView.handleFileContextMenu(event, this._node);
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorTreeNode = class {
  /**
   * @param {string} id
   * @param {string} type
   */
  constructor(id, type) {
    this.id = id;
    this._type = type;
    /** @type {!Map.<string, !Sources.NavigatorTreeNode>} */
    this._children = new Map();
  }

  /**
   * @return {!UI.TreeElement}
   */
  treeNode() {
    throw 'Not implemented';
  }

  dispose() {
  }

  /**
   * @return {boolean}
   */
  isRoot() {
    return false;
  }

  /**
   * @return {boolean}
   */
  hasChildren() {
    return true;
  }

  onattach() {
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    throw 'Not implemented';
  }

  populate() {
    if (this.isPopulated())
      return;
    if (this.parent)
      this.parent.populate();
    this._populated = true;
    this.wasPopulated();
  }

  wasPopulated() {
    var children = this.children();
    for (var i = 0; i < children.length; ++i)
      this.treeNode().appendChild(/** @type {!UI.TreeElement} */ (children[i].treeNode()));
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   */
  didAddChild(node) {
    if (this.isPopulated())
      this.treeNode().appendChild(/** @type {!UI.TreeElement} */ (node.treeNode()));
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   */
  willRemoveChild(node) {
    if (this.isPopulated())
      this.treeNode().removeChild(/** @type {!UI.TreeElement} */ (node.treeNode()));
  }

  /**
   * @return {boolean}
   */
  isPopulated() {
    return this._populated;
  }

  /**
   * @return {boolean}
   */
  isEmpty() {
    return !this._children.size;
  }

  /**
   * @return {!Array.<!Sources.NavigatorTreeNode>}
   */
  children() {
    return this._children.valuesArray();
  }

  /**
   * @param {string} id
   * @return {?Sources.NavigatorTreeNode}
   */
  child(id) {
    return this._children.get(id) || null;
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   */
  appendChild(node) {
    this._children.set(node.id, node);
    node.parent = this;
    this.didAddChild(node);
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   */
  removeChild(node) {
    this.willRemoveChild(node);
    this._children.remove(node.id);
    delete node.parent;
    node.dispose();
  }

  reset() {
    this._children.clear();
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorRootTreeNode = class extends Sources.NavigatorTreeNode {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   */
  constructor(navigatorView) {
    super('', Sources.NavigatorView.Types.Root);
    this._navigatorView = navigatorView;
  }

  /**
   * @override
   * @return {boolean}
   */
  isRoot() {
    return true;
  }

  /**
   * @override
   * @return {!UI.TreeElement}
   */
  treeNode() {
    return this._navigatorView._scriptsTree.rootElement();
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorUISourceCodeTreeNode = class extends Sources.NavigatorTreeNode {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?SDK.ResourceTreeFrame} frame
   */
  constructor(navigatorView, uiSourceCode, frame) {
    super(uiSourceCode.project().id() + ':' + uiSourceCode.url(), Sources.NavigatorView.Types.File);
    this._navigatorView = navigatorView;
    this._uiSourceCode = uiSourceCode;
    this._treeElement = null;
    this._eventListeners = [];
    this._frame = frame;
  }

  /**
   * @return {?SDK.ResourceTreeFrame}
   */
  frame() {
    return this._frame;
  }

  /**
   * @return {!Workspace.UISourceCode}
   */
  uiSourceCode() {
    return this._uiSourceCode;
  }

  /**
   * @override
   * @return {!UI.TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;

    this._treeElement = new Sources.NavigatorSourceTreeElement(this._navigatorView, this._uiSourceCode, '', this);
    this.updateTitle();

    var updateTitleBound = this.updateTitle.bind(this, undefined);
    this._eventListeners = [
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound)
    ];
    return this._treeElement;
  }

  /**
   * @param {boolean=} ignoreIsDirty
   */
  updateTitle(ignoreIsDirty) {
    if (!this._treeElement)
      return;

    var titleText = this._uiSourceCode.displayName();
    if (!ignoreIsDirty &&
        (this._uiSourceCode.isDirty() || Persistence.persistence.hasUnsavedCommittedChanges(this._uiSourceCode)))
      titleText = '*' + titleText;

    this._treeElement.title = titleText;
    this._treeElement.updateIcon();

    var tooltip = this._uiSourceCode.url();
    if (this._uiSourceCode.contentType().isFromSourceMap())
      tooltip = Common.UIString('%s (from source map)', this._uiSourceCode.displayName());
    this._treeElement.tooltip = tooltip;
  }

  /**
   * @override
   * @return {boolean}
   */
  hasChildren() {
    return false;
  }

  /**
   * @override
   */
  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }

  /**
   * @param {boolean=} select
   */
  reveal(select) {
    this.parent.populate();
    this.parent.treeNode().expand();
    this._treeElement.reveal(true);
    if (select)
      this._treeElement.select(true);
  }

  /**
   * @param {function(boolean)=} callback
   */
  rename(callback) {
    if (!this._treeElement)
      return;

    // Tree outline should be marked as edited as well as the tree element to prevent search from starting.
    var treeOutlineElement = this._treeElement.treeOutline.element;
    UI.markBeingEdited(treeOutlineElement, true);

    /**
     * @param {!Element} element
     * @param {string} newTitle
     * @param {string} oldTitle
     * @this {Sources.NavigatorUISourceCodeTreeNode}
     */
    function commitHandler(element, newTitle, oldTitle) {
      if (newTitle !== oldTitle) {
        this._treeElement.title = newTitle;
        this._uiSourceCode.rename(newTitle).then(renameCallback.bind(this));
        return;
      }
      afterEditing.call(this, true);
    }

    /**
     * @param {boolean} success
     * @this {Sources.NavigatorUISourceCodeTreeNode}
     */
    function renameCallback(success) {
      if (!success) {
        UI.markBeingEdited(treeOutlineElement, false);
        this.updateTitle();
        this.rename(callback);
        return;
      }
      afterEditing.call(this, true);
    }

    /**
     * @param {boolean} committed
     * @this {Sources.NavigatorUISourceCodeTreeNode}
     */
    function afterEditing(committed) {
      UI.markBeingEdited(treeOutlineElement, false);
      this.updateTitle();
      this._treeElement.treeOutline.focus();
      if (callback)
        callback(committed);
    }

    this.updateTitle(true);
    this._treeElement.startEditingTitle(
        new UI.InplaceEditor.Config(commitHandler.bind(this), afterEditing.bind(this, false)));
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorFolderTreeNode = class extends Sources.NavigatorTreeNode {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   * @param {?Workspace.Project} project
   * @param {string} id
   * @param {string} type
   * @param {string} folderPath
   * @param {string} title
   */
  constructor(navigatorView, project, id, type, folderPath, title) {
    super(id, type);
    this._navigatorView = navigatorView;
    this._project = project;
    this._folderPath = folderPath;
    this._title = title;
  }

  /**
   * @override
   * @return {!UI.TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;
    this._treeElement = this._createTreeElement(this._title, this);
    this.updateTitle();
    return this._treeElement;
  }

  updateTitle() {
    if (!this._treeElement || this._project.type() !== Workspace.projectTypes.FileSystem)
      return;
    var absoluteFileSystemPath =
        Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id()) + '/' + this._folderPath;
    var hasMappedFiles = Runtime.experiments.isEnabled('persistence2') ?
        Persistence.persistence.filePathHasBindings(absoluteFileSystemPath) :
        true;
    this._treeElement.listItemElement.classList.toggle('has-mapped-files', hasMappedFiles);
  }

  /**
   * @return {!UI.TreeElement}
   */
  _createTreeElement(title, node) {
    if (this._project.type() !== Workspace.projectTypes.FileSystem) {
      try {
        title = decodeURI(title);
      } catch (e) {
      }
    }
    var treeElement = new Sources.NavigatorFolderTreeElement(this._navigatorView, this._type, title);
    treeElement.setNode(node);
    return treeElement;
  }

  /**
   * @override
   */
  wasPopulated() {
    if (!this._treeElement || this._treeElement._node !== this)
      return;
    this._addChildrenRecursive();
  }

  _addChildrenRecursive() {
    var children = this.children();
    for (var i = 0; i < children.length; ++i) {
      var child = children[i];
      this.didAddChild(child);
      if (child instanceof Sources.NavigatorFolderTreeNode)
        child._addChildrenRecursive();
    }
  }

  _shouldMerge(node) {
    return this._type !== Sources.NavigatorView.Types.Domain && node instanceof Sources.NavigatorFolderTreeNode;
  }

  /**
   * @param {!Sources.NavigatorTreeNode} node
   * @override
   */
  didAddChild(node) {
    function titleForNode(node) {
      return node._title;
    }

    if (!this._treeElement)
      return;

    var children = this.children();

    if (children.length === 1 && this._shouldMerge(node)) {
      node._isMerged = true;
      this._treeElement.title = this._treeElement.title + '/' + node._title;
      node._treeElement = this._treeElement;
      this._treeElement.setNode(node);
      return;
    }

    var oldNode;
    if (children.length === 2)
      oldNode = children[0] !== node ? children[0] : children[1];
    if (oldNode && oldNode._isMerged) {
      delete oldNode._isMerged;
      var mergedToNodes = [];
      mergedToNodes.push(this);
      var treeNode = this;
      while (treeNode._isMerged) {
        treeNode = treeNode.parent;
        mergedToNodes.push(treeNode);
      }
      mergedToNodes.reverse();
      var titleText = mergedToNodes.map(titleForNode).join('/');

      var nodes = [];
      treeNode = oldNode;
      do {
        nodes.push(treeNode);
        children = treeNode.children();
        treeNode = children.length === 1 ? children[0] : null;
      } while (treeNode && treeNode._isMerged);

      if (!this.isPopulated()) {
        this._treeElement.title = titleText;
        this._treeElement.setNode(this);
        for (var i = 0; i < nodes.length; ++i) {
          delete nodes[i]._treeElement;
          delete nodes[i]._isMerged;
        }
        return;
      }
      var oldTreeElement = this._treeElement;
      var treeElement = this._createTreeElement(titleText, this);
      for (var i = 0; i < mergedToNodes.length; ++i)
        mergedToNodes[i]._treeElement = treeElement;
      oldTreeElement.parent.appendChild(treeElement);

      oldTreeElement.setNode(nodes[nodes.length - 1]);
      oldTreeElement.title = nodes.map(titleForNode).join('/');
      oldTreeElement.parent.removeChild(oldTreeElement);
      this._treeElement.appendChild(oldTreeElement);
      if (oldTreeElement.expanded)
        treeElement.expand();
    }
    if (this.isPopulated())
      this._treeElement.appendChild(node.treeNode());
  }

  /**
   * @override
   * @param {!Sources.NavigatorTreeNode} node
   */
  willRemoveChild(node) {
    if (node._isMerged || !this.isPopulated())
      return;
    this._treeElement.removeChild(node._treeElement);
  }
};

/**
 * @unrestricted
 */
Sources.NavigatorGroupTreeNode = class extends Sources.NavigatorTreeNode {
  /**
   * @param {!Sources.NavigatorView} navigatorView
   * @param {!Workspace.Project} project
   * @param {string} id
   * @param {string} type
   * @param {string} title
   */
  constructor(navigatorView, project, id, type, title) {
    super(id, type);
    this._project = project;
    this._navigatorView = navigatorView;
    this._title = title;
    this.populate();
  }

  /**
   * @param {function(boolean)} hoverCallback
   */
  setHoverCallback(hoverCallback) {
    this._hoverCallback = hoverCallback;
  }

  /**
   * @override
   * @return {!UI.TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;
    this._treeElement =
        new Sources.NavigatorFolderTreeElement(this._navigatorView, this._type, this._title, this._hoverCallback);
    this._treeElement.setNode(this);
    return this._treeElement;
  }

  /**
   * @override
   */
  onattach() {
    this.updateTitle();
  }

  updateTitle() {
    if (!this._treeElement || this._project.type() !== Workspace.projectTypes.FileSystem)
      return;
    if (!Runtime.experiments.isEnabled('persistence2')) {
      this._treeElement.listItemElement.classList.add('has-mapped-files');
      return;
    }
    var fileSystemPath = Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());
    var wasActive = this._treeElement.listItemElement.classList.contains('has-mapped-files');
    var isActive = Persistence.persistence.filePathHasBindings(fileSystemPath);
    if (wasActive === isActive)
      return;
    this._treeElement.listItemElement.classList.toggle('has-mapped-files', isActive);
    if (isActive)
      this._treeElement.expand();
    else
      this._treeElement.collapse();
  }

  /**
   * @param {string} title
   * @override
   */
  setTitle(title) {
    this._title = title;
    if (this._treeElement)
      this._treeElement.title = this._title;
  }
};
