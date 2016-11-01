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
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.NavigatorView = class extends WebInspector.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('sources/navigatorView.css');

    this._scriptsTree = new TreeOutlineInShadow();
    this._scriptsTree.registerRequiredCSS('sources/navigatorTree.css');
    this._scriptsTree.setComparator(WebInspector.NavigatorView._treeElementsCompare);
    this.element.appendChild(this._scriptsTree.element);
    this.setDefaultFocusedElement(this._scriptsTree.element);

    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.NavigatorUISourceCodeTreeNode>} */
    this._uiSourceCodeNodes = new Map();
    /** @type {!Map.<string, !WebInspector.NavigatorFolderTreeNode>} */
    this._subfolderNodes = new Map();

    this._rootNode = new WebInspector.NavigatorRootTreeNode(this);
    this._rootNode.populate();

    /** @type {!Map.<!WebInspector.ResourceTreeFrame, !WebInspector.NavigatorGroupTreeNode>} */
    this._frameNodes = new Map();

    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this), false);

    this._navigatorGroupByFolderSetting = WebInspector.moduleSetting('navigatorGroupByFolder');
    this._navigatorGroupByFolderSetting.addChangeListener(this._groupingChanged.bind(this));

    this._initGrouping();
    WebInspector.targetManager.addModelListener(
        WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.Events.FrameNavigated, this._frameNavigated,
        this);
    WebInspector.targetManager.addModelListener(
        WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this);

    if (Runtime.experiments.isEnabled('persistence2')) {
      WebInspector.persistence.addEventListener(
          WebInspector.Persistence.Events.BindingCreated, this._onBindingChanged, this);
      WebInspector.persistence.addEventListener(
          WebInspector.Persistence.Events.BindingRemoved, this._onBindingChanged, this);
    } else {
      WebInspector.persistence.addEventListener(
          WebInspector.Persistence.Events.BindingCreated, this._onBindingCreated, this);
      WebInspector.persistence.addEventListener(
          WebInspector.Persistence.Events.BindingRemoved, this._onBindingRemoved, this);
    }
    WebInspector.targetManager.addEventListener(
        WebInspector.TargetManager.Events.NameChanged, this._targetNameChanged, this);

    WebInspector.targetManager.observeTargets(this);
    this._resetWorkspace(WebInspector.workspace);
    this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));
  }

  /**
   * @param {!TreeElement} treeElement
   */
  static _treeElementOrder(treeElement) {
    if (treeElement._boostOrder)
      return 0;

    if (!WebInspector.NavigatorView._typeOrders) {
      var weights = {};
      var types = WebInspector.NavigatorView.Types;
      weights[types.Root] = 1;
      weights[types.Category] = 1;
      weights[types.Domain] = 10;
      weights[types.FileSystemFolder] = 1;
      weights[types.NetworkFolder] = 1;
      weights[types.SourceMapFolder] = 2;
      weights[types.File] = 10;
      weights[types.Frame] = 70;
      weights[types.Worker] = 90;
      weights[types.FileSystem] = 100;
      WebInspector.NavigatorView._typeOrders = weights;
    }

    var order = WebInspector.NavigatorView._typeOrders[treeElement._nodeType];
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
   * @param {!WebInspector.ContextMenu} contextMenu
   */
  static appendAddFolderItem(contextMenu) {
    function addFolder() {
      WebInspector.isolatedFileSystemManager.addFileSystem();
    }

    var addFolderLabel = WebInspector.UIString('Add folder to workspace');
    contextMenu.appendItem(addFolderLabel, addFolder);
  }

  /**
   * @param {!WebInspector.ContextMenu} contextMenu
   * @param {string=} path
   */
  static appendSearchItem(contextMenu, path) {
    function searchPath() {
      WebInspector.AdvancedSearchView.openSearch('', path.trim());
    }

    var searchLabel = WebInspector.UIString('Search in folder');
    if (!path || !path.trim()) {
      path = '*';
      searchLabel = WebInspector.UIString('Search in all files');
    }
    contextMenu.appendItem(searchLabel, searchPath);
  }

  /**
   * @param {!TreeElement} treeElement1
   * @param {!TreeElement} treeElement2
   * @return {number}
   */
  static _treeElementsCompare(treeElement1, treeElement2) {
    var typeWeight1 = WebInspector.NavigatorView._treeElementOrder(treeElement1);
    var typeWeight2 = WebInspector.NavigatorView._treeElementOrder(treeElement2);

    var result;
    if (typeWeight1 > typeWeight2)
      return 1;
    if (typeWeight1 < typeWeight2)
      return -1;
    return treeElement1.titleAsText().compareTo(treeElement2.titleAsText());
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBindingCreated(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);
    this._removeUISourceCode(binding.network);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBindingRemoved(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);
    this._addUISourceCode(binding.network);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onBindingChanged(event) {
    var binding = /** @type {!WebInspector.PersistenceBinding} */ (event.data);

    // Update UISourceCode titles.
    var networkNode = this._uiSourceCodeNodes.get(binding.network);
    if (networkNode)
      networkNode.updateTitle();
    var fileSystemNode = this._uiSourceCodeNodes.get(binding.fileSystem);
    if (fileSystemNode)
      fileSystemNode.updateTitle();

    // Update folder titles.
    var pathTokens = WebInspector.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);
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
   * @param {!WebInspector.Workspace} workspace
   */
  _resetWorkspace(workspace) {
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this);
    this._workspace.addEventListener(
        WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    this._workspace.addEventListener(
        WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved.bind(this), this);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    return !uiSourceCode.isFromServiceProject();
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.ResourceTreeFrame}
   */
  _uiSourceCodeFrame(uiSourceCode) {
    var frame = WebInspector.NetworkProject.frameForProject(uiSourceCode.project());
    if (!frame) {
      var target = WebInspector.NetworkProject.targetForProject(uiSourceCode.project());
      var resourceTreeModel = target && WebInspector.ResourceTreeModel.fromTarget(target);
      frame = resourceTreeModel && resourceTreeModel.mainFrame;
    }
    return frame;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _addUISourceCode(uiSourceCode) {
    if (!this.accept(uiSourceCode))
      return;

    var binding = WebInspector.persistence.binding(uiSourceCode);
    if (!Runtime.experiments.isEnabled('persistence2') && binding && binding.network === uiSourceCode)
      return;

    var isFromSourceMap = uiSourceCode.contentType().isFromSourceMap();
    var path;
    if (uiSourceCode.project().type() === WebInspector.projectTypes.FileSystem)
      path = WebInspector.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0, -1);
    else
      path = WebInspector.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1, -1);

    var project = uiSourceCode.project();
    var target = WebInspector.NetworkProject.targetForUISourceCode(uiSourceCode);
    var frame = this._uiSourceCodeFrame(uiSourceCode);

    var folderNode =
        this._folderNode(uiSourceCode, project, target, frame, uiSourceCode.origin(), path, isFromSourceMap);
    var uiSourceCodeNode = new WebInspector.NavigatorUISourceCodeTreeNode(this, uiSourceCode);
    this._uiSourceCodeNodes.set(uiSourceCode, uiSourceCodeNode);
    folderNode.appendChild(uiSourceCodeNode);
    this.uiSourceCodeAdded(uiSourceCode);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  uiSourceCodeAdded(uiSourceCode) {
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _uiSourceCodeAdded(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    this._addUISourceCode(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
    this._removeUISourceCode(uiSourceCode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _projectRemoved(event) {
    var project = /** @type {!WebInspector.Project} */ (event.data);

    var frame = WebInspector.NetworkProject.frameForProject(project);
    if (frame)
      this._discardFrame(frame);

    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < uiSourceCodes.length; ++i)
      this._removeUISourceCode(uiSourceCodes[i]);
  }

  /**
   * @param {!WebInspector.Project} project
   * @param {?WebInspector.Target} target
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @param {string} path
   * @return {string}
   */
  _folderNodeId(project, target, frame, projectOrigin, path) {
    var targetId = target ? target.id() : '';
    var projectId = project.type() === WebInspector.projectTypes.FileSystem ? project.id() : '';
    var frameId = this._groupByFrame && frame ? frame.id : '';
    return targetId + ':' + projectId + ':' + frameId + ':' + projectOrigin + ':' + path;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!WebInspector.Project} project
   * @param {?WebInspector.Target} target
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @param {!Array<string>} path
   * @param {boolean} fromSourceMap
   * @return {!WebInspector.NavigatorTreeNode}
   */
  _folderNode(uiSourceCode, project, target, frame, projectOrigin, path, fromSourceMap) {
    if (project.type() === WebInspector.projectTypes.Snippets)
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
      var fileSystemNode = this._rootNode.child(project.id());
      if (!fileSystemNode) {
        fileSystemNode = new WebInspector.NavigatorGroupTreeNode(
            this, project, project.id(), WebInspector.NavigatorView.Types.FileSystem, project.displayName());
        this._rootNode.appendChild(fileSystemNode);
      }
      return fileSystemNode;
    }

    var parentNode =
        this._folderNode(uiSourceCode, project, target, frame, projectOrigin, path.slice(0, -1), fromSourceMap);
    var type = fromSourceMap ? WebInspector.NavigatorView.Types.SourceMapFolder :
                               WebInspector.NavigatorView.Types.NetworkFolder;
    if (project.type() === WebInspector.projectTypes.FileSystem)
      type = WebInspector.NavigatorView.Types.FileSystemFolder;
    var name = path[path.length - 1];

    folderNode = new WebInspector.NavigatorFolderTreeNode(this, project, folderId, type, folderPath, name);
    this._subfolderNodes.set(folderId, folderNode);
    parentNode.appendChild(folderNode);
    return folderNode;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!WebInspector.Project} project
   * @param {!WebInspector.Target} target
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {string} projectOrigin
   * @return {!WebInspector.NavigatorTreeNode}
   */
  _domainNode(uiSourceCode, project, target, frame, projectOrigin) {
    var frameNode = this._frameNode(project, target, frame);
    if (!this._groupByDomain)
      return frameNode;
    var domainNode = frameNode.child(projectOrigin);
    if (domainNode)
      return domainNode;

    domainNode = new WebInspector.NavigatorGroupTreeNode(
        this, project, projectOrigin, WebInspector.NavigatorView.Types.Domain,
        this._computeProjectDisplayName(target, projectOrigin));
    if (frame && projectOrigin === WebInspector.ParsedURL.extractOrigin(frame.url))
      domainNode.treeNode()._boostOrder = true;
    frameNode.appendChild(domainNode);
    return domainNode;
  }

  /**
   * @param {!WebInspector.Project} project
   * @param {!WebInspector.Target} target
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @return {!WebInspector.NavigatorTreeNode}
   */
  _frameNode(project, target, frame) {
    if (!this._groupByFrame || !frame)
      return this._targetNode(project, target);

    var frameNode = this._frameNodes.get(frame);
    if (frameNode)
      return frameNode;

    frameNode = new WebInspector.NavigatorGroupTreeNode(
        this, project, target.id() + ':' + frame.id, WebInspector.NavigatorView.Types.Frame, frame.displayName());
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
        var domModel = WebInspector.DOMModel.fromTarget(target);
        if (domModel)
          domModel.highlightFrame(frame.id);
      } else {
        WebInspector.DOMModel.hideDOMNodeHighlight();
      }
    }
    return frameNode;
  }

  /**
   * @param {!WebInspector.Project} project
   * @param {!WebInspector.Target} target
   * @return {!WebInspector.NavigatorTreeNode}
   */
  _targetNode(project, target) {
    if (target === WebInspector.targetManager.mainTarget())
      return this._rootNode;

    var targetNode = this._rootNode.child('target:' + target.id());
    if (!targetNode) {
      targetNode = new WebInspector.NavigatorGroupTreeNode(
          this, project, 'target:' + target.id(),
          !target.hasBrowserCapability() ? WebInspector.NavigatorView.Types.Worker :
                                           WebInspector.NavigatorView.Types.NetworkFolder,
          target.name());
      this._rootNode.appendChild(targetNode);
    }
    return targetNode;
  }

  /**
   * @param {!WebInspector.Target} target
   * @param {string} projectOrigin
   * @return {string}
   */
  _computeProjectDisplayName(target, projectOrigin) {
    for (var context of target.runtimeModel.executionContexts()) {
      if (context.name && context.origin && projectOrigin.startsWith(context.origin))
        return context.name;
    }

    if (!projectOrigin)
      return WebInspector.UIString('(no domain)');

    var parsedURL = new WebInspector.ParsedURL(projectOrigin);
    var prettyURL = parsedURL.isValid ? parsedURL.host + (parsedURL.port ? (':' + parsedURL.port) : '') : '';

    return (prettyURL || projectOrigin);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean=} select
   */
  revealUISourceCode(uiSourceCode, select) {
    var node = this._uiSourceCodeNodes.get(uiSourceCode);
    if (!node)
      return;
    if (this._scriptsTree.selectedTreeElement)
      this._scriptsTree.selectedTreeElement.deselect();
    this._lastSelectedUISourceCode = uiSourceCode;
    node.reveal(select);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean} focusSource
   */
  _sourceSelected(uiSourceCode, focusSource) {
    this._lastSelectedUISourceCode = uiSourceCode;
    WebInspector.Revealer.reveal(uiSourceCode, !focusSource);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  sourceDeleted(uiSourceCode) {
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _removeUISourceCode(uiSourceCode) {
    var node = this._uiSourceCodeNodes.get(uiSourceCode);
    if (!node)
      return;

    var project = uiSourceCode.project();
    var target = WebInspector.NetworkProject.targetForUISourceCode(uiSourceCode);
    var frame = this._uiSourceCodeFrame(uiSourceCode);

    var parentNode = node.parent;
    this._uiSourceCodeNodes.delete(uiSourceCode);
    parentNode.removeChild(node);
    node = parentNode;

    while (node) {
      parentNode = node.parent;
      if (!parentNode || !node.isEmpty())
        break;
      if (!(node instanceof WebInspector.NavigatorGroupTreeNode ||
            node instanceof WebInspector.NavigatorFolderTreeNode))
        break;
      if (node._type === WebInspector.NavigatorView.Types.Frame)
        break;

      var folderId = this._folderNodeId(project, target, frame, uiSourceCode.origin(), node._folderPath);
      this._subfolderNodes.delete(folderId);
      parentNode.removeChild(node);
      node = parentNode;
    }
  }

  reset() {
    var nodes = this._uiSourceCodeNodes.valuesArray();
    for (var i = 0; i < nodes.length; ++i)
      nodes[i].dispose();

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
   * @param {!WebInspector.Project} project
   * @param {string} path
   * @param {!WebInspector.UISourceCode=} uiSourceCode
   */
  _handleContextMenuCreate(project, path, uiSourceCode) {
    this.create(project, path, uiSourceCode);
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _handleContextMenuRename(uiSourceCode) {
    this.rename(uiSourceCode, false);
  }

  /**
   * @param {!WebInspector.Project} project
   * @param {string} path
   */
  _handleContextMenuExclude(project, path) {
    var shouldExclude = window.confirm(WebInspector.UIString('Are you sure you want to exclude this folder?'));
    if (shouldExclude) {
      WebInspector.startBatchUpdate();
      project.excludeFolder(WebInspector.FileSystemWorkspaceBinding.completeURL(project, path));
      WebInspector.endBatchUpdate();
    }
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  _handleContextMenuDelete(uiSourceCode) {
    var shouldDelete = window.confirm(WebInspector.UIString('Are you sure you want to delete this file?'));
    if (shouldDelete)
      uiSourceCode.project().deleteFile(uiSourceCode.url());
  }

  /**
   * @param {!Event} event
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  handleFileContextMenu(event, uiSourceCode) {
    var contextMenu = new WebInspector.ContextMenu(event);
    contextMenu.appendApplicableItems(uiSourceCode);
    contextMenu.appendSeparator();

    var project = uiSourceCode.project();
    if (project.type() === WebInspector.projectTypes.FileSystem) {
      var parentURL = uiSourceCode.parentURL();
      contextMenu.appendItem(
          WebInspector.UIString('Rename\u2026'), this._handleContextMenuRename.bind(this, uiSourceCode));
      contextMenu.appendItem(
          WebInspector.UIString('Make a copy\u2026'),
          this._handleContextMenuCreate.bind(this, project, parentURL, uiSourceCode));
      contextMenu.appendItem(WebInspector.UIString('Delete'), this._handleContextMenuDelete.bind(this, uiSourceCode));
      contextMenu.appendSeparator();
    }

    contextMenu.show();
  }

  /**
   * @param {!Event} event
   * @param {!WebInspector.NavigatorFolderTreeNode} node
   */
  handleFolderContextMenu(event, node) {
    var path = node._folderPath;
    var project = node._project;

    var contextMenu = new WebInspector.ContextMenu(event);

    WebInspector.NavigatorView.appendSearchItem(contextMenu, path);
    contextMenu.appendSeparator();

    if (project.type() !== WebInspector.projectTypes.FileSystem)
      return;

    contextMenu.appendItem(WebInspector.UIString('New file'), this._handleContextMenuCreate.bind(this, project, path));
    contextMenu.appendItem(
        WebInspector.UIString('Exclude folder'), this._handleContextMenuExclude.bind(this, project, path));

    function removeFolder() {
      var shouldRemove = window.confirm(WebInspector.UIString('Are you sure you want to remove this folder?'));
      if (shouldRemove)
        project.remove();
    }

    contextMenu.appendSeparator();
    WebInspector.NavigatorView.appendAddFolderItem(contextMenu);
    if (node instanceof WebInspector.NavigatorGroupTreeNode)
      contextMenu.appendItem(WebInspector.UIString('Remove folder from workspace'), removeFolder);

    contextMenu.show();
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {boolean} deleteIfCanceled
   */
  rename(uiSourceCode, deleteIfCanceled) {
    var node = this._uiSourceCodeNodes.get(uiSourceCode);
    console.assert(node);
    node.rename(callback.bind(this));

    /**
     * @this {WebInspector.NavigatorView}
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
   * @param {!WebInspector.Project} project
   * @param {string} path
   * @param {!WebInspector.UISourceCode=} uiSourceCodeToCopy
   */
  create(project, path, uiSourceCodeToCopy) {
    var filePath;
    var uiSourceCode;

    /**
     * @this {WebInspector.NavigatorView}
     * @param {?string} content
     */
    function contentLoaded(content) {
      createFile.call(this, content || '');
    }

    if (uiSourceCodeToCopy)
      uiSourceCodeToCopy.requestContent().then(contentLoaded.bind(this));
    else
      createFile.call(this);

    /**
     * @this {WebInspector.NavigatorView}
     * @param {string=} content
     */
    function createFile(content) {
      project.createFile(path, null, content || '', fileCreated.bind(this));
    }

    /**
     * @this {WebInspector.NavigatorView}
     * @param {?WebInspector.UISourceCode} uiSourceCode
     */
    function fileCreated(uiSourceCode) {
      if (!uiSourceCode)
        return;
      this._sourceSelected(uiSourceCode, false);
      this.revealUISourceCode(uiSourceCode, true);
      this.rename(uiSourceCode, true);
    }
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
   * @param {!WebInspector.Event} event
   */
  _frameNavigated(event) {
    var frame = /** @type {!WebInspector.ResourceTreeFrame} */ (event.data);
    var node = this._frameNodes.get(frame);
    if (!node)
      return;

    node.treeNode().title = frame.displayName();
    for (var child of frame.childFrames)
      this._discardFrame(child);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _frameDetached(event) {
    var frame = /** @type {!WebInspector.ResourceTreeFrame} */ (event.data);
    this._discardFrame(frame);
  }

  /**
   * @param {!WebInspector.ResourceTreeFrame} frame
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
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    var targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode)
      this._rootNode.removeChild(targetNode);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _targetNameChanged(event) {
    var target = /** @type {!WebInspector.Target} */ (event.data);
    var targetNode = this._rootNode.child('target:' + target.id());
    if (targetNode)
      targetNode.setTitle(target.name());
  }
};

WebInspector.NavigatorView.Types = {
  Category: 'category',
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
WebInspector.NavigatorFolderTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
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
    this.createIcon();
    this._navigatorView = navigatorView;
    this._hoverCallback = hoverCallback;
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
   * @param {!WebInspector.NavigatorTreeNode} node
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
WebInspector.NavigatorSourceTreeElement = class extends TreeElement {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {string} title
   */
  constructor(navigatorView, uiSourceCode, title) {
    super('', false);
    this._nodeType = WebInspector.NavigatorView.Types.File;
    this.title = title;
    this.listItemElement.classList.add(
        'navigator-' + uiSourceCode.contentType().name() + '-tree-item', 'navigator-file-tree-item');
    this.tooltip = uiSourceCode.url();
    this.createIcon();

    this._navigatorView = navigatorView;
    this._uiSourceCode = uiSourceCode;
  }

  /**
   * @return {!WebInspector.UISourceCode}
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
    this.listItemElement.addEventListener('mousedown', this._onmousedown.bind(this), false);
    this.listItemElement.addEventListener('dragstart', this._ondragstart.bind(this), false);
  }

  _onmousedown(event) {
    if (event.which === 1)  // Warm-up data for drag'n'drop
      this._uiSourceCode.requestContent().then(callback.bind(this));
    /**
     * @param {?string} content
     * @this {WebInspector.NavigatorSourceTreeElement}
     */
    function callback(content) {
      this._warmedUpContent = content;
    }
  }

  _shouldRenameOnMouseDown() {
    if (!this._uiSourceCode.canRename())
      return false;
    var isSelected = this === this.treeOutline.selectedTreeElement;
    return isSelected && this.treeOutline.element.hasFocus() && !WebInspector.isBeingEdited(this.treeOutline.element);
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
     * @this {WebInspector.NavigatorSourceTreeElement}
     */
    function rename() {
      if (this._shouldRenameOnMouseDown())
        this._navigatorView.rename(this.uiSourceCode, false);
    }
  }

  _ondragstart(event) {
    event.dataTransfer.setData('text/plain', this._warmedUpContent);
    event.dataTransfer.effectAllowed = 'copy';
    return true;
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
    this._navigatorView.handleFileContextMenu(event, this._uiSourceCode);
  }
};

/**
 * @unrestricted
 */
WebInspector.NavigatorTreeNode = class {
  /**
   * @param {string} id
   * @param {string} type
   */
  constructor(id, type) {
    this.id = id;
    this._type = type;
    /** @type {!Map.<string, !WebInspector.NavigatorTreeNode>} */
    this._children = new Map();
  }

  /**
   * @return {!TreeElement}
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
      this.treeNode().appendChild(/** @type {!TreeElement} */ (children[i].treeNode()));
  }

  /**
   * @param {!WebInspector.NavigatorTreeNode} node
   */
  didAddChild(node) {
    if (this.isPopulated())
      this.treeNode().appendChild(/** @type {!TreeElement} */ (node.treeNode()));
  }

  /**
   * @param {!WebInspector.NavigatorTreeNode} node
   */
  willRemoveChild(node) {
    if (this.isPopulated())
      this.treeNode().removeChild(/** @type {!TreeElement} */ (node.treeNode()));
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
   * @return {!Array.<!WebInspector.NavigatorTreeNode>}
   */
  children() {
    return this._children.valuesArray();
  }

  /**
   * @param {string} id
   * @return {?WebInspector.NavigatorTreeNode}
   */
  child(id) {
    return this._children.get(id) || null;
  }

  /**
   * @param {!WebInspector.NavigatorTreeNode} node
   */
  appendChild(node) {
    this._children.set(node.id, node);
    node.parent = this;
    this.didAddChild(node);
  }

  /**
   * @param {!WebInspector.NavigatorTreeNode} node
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
WebInspector.NavigatorRootTreeNode = class extends WebInspector.NavigatorTreeNode {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
   */
  constructor(navigatorView) {
    super('', WebInspector.NavigatorView.Types.Root);
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
   * @return {!TreeElement}
   */
  treeNode() {
    return this._navigatorView._scriptsTree.rootElement();
  }
};

/**
 * @unrestricted
 */
WebInspector.NavigatorUISourceCodeTreeNode = class extends WebInspector.NavigatorTreeNode {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
   * @param {!WebInspector.UISourceCode} uiSourceCode
   */
  constructor(navigatorView, uiSourceCode) {
    super(uiSourceCode.project().id() + ':' + uiSourceCode.url(), WebInspector.NavigatorView.Types.File);
    this._navigatorView = navigatorView;
    this._uiSourceCode = uiSourceCode;
    this._treeElement = null;
    this._eventListeners = [];
  }

  /**
   * @return {!WebInspector.UISourceCode}
   */
  uiSourceCode() {
    return this._uiSourceCode;
  }

  /**
   * @override
   * @return {!TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;

    this._treeElement = new WebInspector.NavigatorSourceTreeElement(this._navigatorView, this._uiSourceCode, '');
    this.updateTitle();

    var updateTitleBound = this.updateTitle.bind(this, undefined);
    this._eventListeners = [
      this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.TitleChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, updateTitleBound),
      this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, updateTitleBound)
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
        (this._uiSourceCode.isDirty() || WebInspector.persistence.hasUnsavedCommittedChanges(this._uiSourceCode)))
      titleText = '*' + titleText;

    var binding = WebInspector.persistence.binding(this._uiSourceCode);
    if (binding && Runtime.experiments.isEnabled('persistence2')) {
      var titleElement = createElement('span');
      titleElement.textContent = titleText;
      var status = titleElement.createChild('span');
      status.classList.add('mapped-file-bubble');
      status.textContent = '\u25C9';
      if (this._uiSourceCode === binding.network)
        status.title = WebInspector.UIString('Persisted to file system: %s', binding.fileSystem.url().trimMiddle(150));
      else if (binding.network.contentType().isFromSourceMap())
        status.title = WebInspector.UIString('Linked to source map: %s', binding.network.url().trimMiddle(150));
      else
        status.title = WebInspector.UIString('Linked to %s', binding.network.url().trimMiddle(150));
      this._treeElement.title = titleElement;
    } else {
      this._treeElement.title = titleText;
    }

    var tooltip = this._uiSourceCode.url();
    if (this._uiSourceCode.contentType().isFromSourceMap())
      tooltip = WebInspector.UIString('%s (from source map)', this._uiSourceCode.displayName());
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
    WebInspector.EventTarget.removeEventListeners(this._eventListeners);
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
    WebInspector.markBeingEdited(treeOutlineElement, true);

    /**
     * @param {!Element} element
     * @param {string} newTitle
     * @param {string} oldTitle
     * @this {WebInspector.NavigatorUISourceCodeTreeNode}
     */
    function commitHandler(element, newTitle, oldTitle) {
      if (newTitle !== oldTitle) {
        this._treeElement.title = newTitle;
        this._uiSourceCode.rename(newTitle, renameCallback.bind(this));
        return;
      }
      afterEditing.call(this, true);
    }

    /**
     * @param {boolean} success
     * @this {WebInspector.NavigatorUISourceCodeTreeNode}
     */
    function renameCallback(success) {
      if (!success) {
        WebInspector.markBeingEdited(treeOutlineElement, false);
        this.updateTitle();
        this.rename(callback);
        return;
      }
      afterEditing.call(this, true);
    }

    /**
     * @param {boolean} committed
     * @this {WebInspector.NavigatorUISourceCodeTreeNode}
     */
    function afterEditing(committed) {
      WebInspector.markBeingEdited(treeOutlineElement, false);
      this.updateTitle();
      this._treeElement.treeOutline.focus();
      if (callback)
        callback(committed);
    }

    this.updateTitle(true);
    this._treeElement.startEditingTitle(
        new WebInspector.InplaceEditor.Config(commitHandler.bind(this), afterEditing.bind(this, false)));
  }
};

/**
 * @unrestricted
 */
WebInspector.NavigatorFolderTreeNode = class extends WebInspector.NavigatorTreeNode {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
   * @param {?WebInspector.Project} project
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
   * @return {!TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;
    this._treeElement = this._createTreeElement(this._title, this);
    this.updateTitle();
    return this._treeElement;
  }

  updateTitle() {
    if (!this._treeElement || this._project.type() !== WebInspector.projectTypes.FileSystem)
      return;
    var absoluteFileSystemPath =
        WebInspector.FileSystemWorkspaceBinding.fileSystemPath(this._project.id()) + '/' + this._folderPath;
    var hasMappedFiles = Runtime.experiments.isEnabled('persistence2') ?
        WebInspector.persistence.filePathHasBindings(absoluteFileSystemPath) :
        true;
    this._treeElement.listItemElement.classList.toggle('has-mapped-files', hasMappedFiles);
  }

  /**
   * @return {!TreeElement}
   */
  _createTreeElement(title, node) {
    if (this._project.type() !== WebInspector.projectTypes.FileSystem) {
      try {
        title = decodeURI(title);
      } catch (e) {
      }
    }
    var treeElement = new WebInspector.NavigatorFolderTreeElement(this._navigatorView, this._type, title);
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
      if (child instanceof WebInspector.NavigatorFolderTreeNode)
        child._addChildrenRecursive();
    }
  }

  _shouldMerge(node) {
    return this._type !== WebInspector.NavigatorView.Types.Domain &&
        node instanceof WebInspector.NavigatorFolderTreeNode;
  }

  /**
   * @param {!WebInspector.NavigatorTreeNode} node
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
   * @param {!WebInspector.NavigatorTreeNode} node
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
WebInspector.NavigatorGroupTreeNode = class extends WebInspector.NavigatorTreeNode {
  /**
   * @param {!WebInspector.NavigatorView} navigatorView
   * @param {!WebInspector.Project} project
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
   * @return {!TreeElement}
   */
  treeNode() {
    if (this._treeElement)
      return this._treeElement;
    this._treeElement =
        new WebInspector.NavigatorFolderTreeElement(this._navigatorView, this._type, this._title, this._hoverCallback);
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
    if (!this._treeElement || this._project.type() !== WebInspector.projectTypes.FileSystem)
      return;
    if (!Runtime.experiments.isEnabled('persistence2')) {
      this._treeElement.listItemElement.classList.add('has-mapped-files');
      return;
    }
    var fileSystemPath = WebInspector.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());
    var wasActive = this._treeElement.listItemElement.classList.contains('has-mapped-files');
    var isActive = WebInspector.persistence.filePathHasBindings(fileSystemPath);
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
