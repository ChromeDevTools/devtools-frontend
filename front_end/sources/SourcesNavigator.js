/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @unrestricted
 */
Sources.SourcesNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    if (!super.acceptProject(project))
      return false;
    return project.type() !== Workspace.projectTypes.ContentScripts &&
        project.type() !== Workspace.projectTypes.Snippets;
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectedURLChanged(event) {
    var mainTarget = SDK.targetManager.mainTarget();
    if (event.data !== mainTarget)
      return;
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL)
      return;
    for (var uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL)
        this.revealUISourceCode(uiSourceCode, true);
    }
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  uiSourceCodeAdded(uiSourceCode) {
    var mainTarget = SDK.targetManager.mainTarget();
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL)
      return;
    if (uiSourceCode.url() === inspectedURL)
      this.revealUISourceCode(uiSourceCode, true);
  }

  /**
   * @override
   * @param {!Event} event
   */
  handleContextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    Sources.NavigatorView.appendAddFolderItem(contextMenu);
    contextMenu.show();
  }
};

/**
 * @unrestricted
 */
Sources.NetworkNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._inspectedURLChanged, this);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.Network;
  }

  /**
   * @param {!Common.Event} event
   */
  _inspectedURLChanged(event) {
    var mainTarget = SDK.targetManager.mainTarget();
    if (event.data !== mainTarget)
      return;
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL)
      return;
    for (var uiSourceCode of this.workspace().uiSourceCodes()) {
      if (this.acceptProject(uiSourceCode.project()) && uiSourceCode.url() === inspectedURL)
        this.revealUISourceCode(uiSourceCode, true);
    }
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  uiSourceCodeAdded(uiSourceCode) {
    var mainTarget = SDK.targetManager.mainTarget();
    var inspectedURL = mainTarget && mainTarget.inspectedURL();
    if (!inspectedURL)
      return;
    if (uiSourceCode.url() === inspectedURL)
      this.revealUISourceCode(uiSourceCode, true);
  }
};

/**
 * @unrestricted
 */
Sources.FilesNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
    var toolbar = new UI.Toolbar('navigator-toolbar');
    var title = Common.UIString('Add folder to workspace');
    var addButton = new UI.ToolbarButton(title, 'largeicon-add', title);
    addButton.addEventListener(
        UI.ToolbarButton.Events.Click, () => Persistence.isolatedFileSystemManager.addFileSystem());
    toolbar.appendToolbarItem(addButton);
    this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides';
  }

  /**
   * @override
   * @param {!Event} event
   */
  handleContextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    Sources.NavigatorView.appendAddFolderItem(contextMenu);
    contextMenu.show();
  }
};

Sources.OverridesNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
    this._toolbar = new UI.Toolbar('navigator-toolbar');

    this.contentElement.insertBefore(this._toolbar.element, this.contentElement.lastChild);
    this._domainElement = this.contentElement.insertBefore(
        createElementWithClass('span', 'navigator-domain-element'), this.contentElement.lastChild);

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged, this._updateProjectAndUI, this);
    Persistence.networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.ProjectDomainChanged, this._updateProjectAndUI, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded, this._onProjectAddOrRemoved, this);
    this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._onProjectAddOrRemoved, this);
    this._updateProjectAndUI();
  }

  /**
   * @param {!Common.Event} event
   */
  _onProjectAddOrRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    if (project && project.type() === Workspace.projectTypes.FileSystem &&
        Persistence.FileSystemWorkspaceBinding.fileSystemType(project) !== 'overrides')
      return;
    this._updateUI();
  }

  _updateProjectAndUI() {
    this.reset();
    var project = Persistence.networkPersistenceManager.projectForActiveDomain();
    if (project)
      this.tryAddProject(project);
    this._updateUI();
  }

  _updateUI() {
    this._toolbar.removeToolbarItems();
    var inspectedPageDomain = Persistence.NetworkPersistenceManager.inspectedPageDomain();
    var project = Persistence.networkPersistenceManager.projectForDomain(inspectedPageDomain);
    if (project) {
      var title = Common.UIString('Enable Overrides');
      var enableCheckbox =
          new UI.ToolbarSettingCheckbox(Common.settings.moduleSetting('persistenceNetworkOverridesEnabled'));
      this._toolbar.appendToolbarItem(enableCheckbox);
      this._domainElement.textContent =
          Common.UIString(Persistence.networkPersistenceManager.domainForProject(project) || '');
      this._domainElement.classList.remove('hidden');
      return;
    }
    var title = Common.UIString('Setup Overrides');
    var setupButton = new UI.ToolbarButton(title, 'largeicon-add', title);
    if (!inspectedPageDomain)
      setupButton.setEnabled(false);
    setupButton.addEventListener(UI.ToolbarButton.Events.Click, this._setupNewWorkspace, this);
    this._toolbar.appendToolbarItem(setupButton);
    this._domainElement.classList.add('hidden');
  }

  async _setupNewWorkspace() {
    var fileSystem = await Persistence.isolatedFileSystemManager.addFileSystem('overrides');
    if (!fileSystem)
      return;
    var projectId = Persistence.FileSystemWorkspaceBinding.projectId(
        Persistence.FileSystemWorkspaceBinding.projectId(fileSystem.path()));
    var project = Workspace.workspace.project(projectId);
    if (!project)
      return;
    var inspectedPageDomain = Persistence.NetworkPersistenceManager.inspectedPageDomain();
    if (!inspectedPageDomain) {
      Persistence.isolatedFileSystemManager.removeFileSystem(fileSystem);
      return;
    }
    var existingProject = Persistence.networkPersistenceManager.projectForDomain(inspectedPageDomain);
    if (existingProject && existingProject !== project) {
      Persistence.isolatedFileSystemManager.removeFileSystem(fileSystem);
      return;
    }
    Persistence.networkPersistenceManager.addFileSystemOverridesProject(
        /** @type {string} */ (inspectedPageDomain), /** @type {!Workspace.Project} */ (project));
    Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').set(true);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    var potentialActiveProject = Persistence.networkPersistenceManager.projectForActiveDomain();
    return project.type() === Workspace.projectTypes.FileSystem && project === potentialActiveProject;
  }
};

/**
 * @unrestricted
 */
Sources.ContentScriptsNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.ContentScripts;
  }
};

/**
 * @unrestricted
 */
Sources.SnippetsNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
    var toolbar = new UI.Toolbar('navigator-toolbar');
    var newButton = new UI.ToolbarButton('', 'largeicon-add', Common.UIString('New snippet'));
    newButton.addEventListener(UI.ToolbarButton.Events.Click, this._handleCreateSnippet.bind(this));
    toolbar.appendToolbarItem(newButton);
    this.contentElement.insertBefore(toolbar.element, this.contentElement.firstChild);
  }

  /**
   * @override
   * @param {!Workspace.Project} project
   * @return {boolean}
   */
  acceptProject(project) {
    return project.type() === Workspace.projectTypes.Snippets;
  }

  /**
   * @override
   * @param {!Event} event
   */
  handleContextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('New'), this._handleCreateSnippet.bind(this));
    contextMenu.show();
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!Sources.NavigatorUISourceCodeTreeNode} node
   */
  handleFileContextMenu(event, node) {
    var uiSourceCode = node.uiSourceCode();
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString('Run'), this._handleEvaluateSnippet.bind(this, uiSourceCode));
    contextMenu.appendItem(Common.UIString('Rename'), this.rename.bind(this, node));
    contextMenu.appendItem(Common.UIString('Remove'), this._handleRemoveSnippet.bind(this, uiSourceCode));
    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('New'), this._handleCreateSnippet.bind(this));
    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Save as...'), this._handleSaveAs.bind(this, uiSourceCode));
    contextMenu.show();
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _handleEvaluateSnippet(uiSourceCode) {
    var executionContext = UI.context.flavor(SDK.ExecutionContext);
    if (!executionContext)
      return;
    Snippets.scriptSnippetModel.evaluateScriptSnippet(executionContext, uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  async _handleSaveAs(uiSourceCode) {
    if (uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
      return;

    uiSourceCode.commitWorkingCopy();
    var content = await uiSourceCode.requestContent();
    Workspace.fileManager.save(uiSourceCode.url(), content, true);
    Workspace.fileManager.close(uiSourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _handleRemoveSnippet(uiSourceCode) {
    if (uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
      return;
    uiSourceCode.remove();
  }

  _handleCreateSnippet() {
    this.create(Snippets.scriptSnippetModel.project(), '');
  }

  /**
   * @override
   */
  sourceDeleted(uiSourceCode) {
    this._handleRemoveSnippet(uiSourceCode);
  }
};

/**
 * @implements {UI.ActionDelegate}
 */
Sources.SourcesNavigatorView.CreatingActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'sources.create-snippet':
        var uiSourceCode = Snippets.scriptSnippetModel.createScriptSnippet('');
        Common.Revealer.reveal(uiSourceCode);
        return true;
      case 'sources.add-folder-to-workspace':
        Persistence.isolatedFileSystemManager.addFileSystem();
        return true;
    }
    return false;
  }
};
