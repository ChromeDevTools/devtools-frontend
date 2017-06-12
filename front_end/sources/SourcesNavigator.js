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
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    if (!super.accept(uiSourceCode))
      return false;
    return uiSourceCode.project().type() !== Workspace.projectTypes.ContentScripts &&
        uiSourceCode.project().type() !== Workspace.projectTypes.Snippets;
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
      if (this.accept(uiSourceCode) && uiSourceCode.url() === inspectedURL)
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
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.projectTypes.Network;
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
      if (this.accept(uiSourceCode) && uiSourceCode.url() === inspectedURL)
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
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.projectTypes.FileSystem;
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
Sources.ContentScriptsNavigatorView = class extends Sources.NavigatorView {
  constructor() {
    super();
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.projectTypes.ContentScripts;
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
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  accept(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.projectTypes.Snippets;
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
  _handleSaveAs(uiSourceCode) {
    if (uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
      return;
    uiSourceCode.saveAs();
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
