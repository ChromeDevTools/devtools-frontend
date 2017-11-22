// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListWidget.Delegate}
 */
Persistence.OverridesSettingsTab = class extends UI.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('persistence/overridesSettingsTab.css');

    var header = this.element.createChild('header');
    header.createChild('h3').createTextChild(Common.UIString('Overrides'));

    this.contentElement.createChild('div', 'overrides-info-message').textContent = Common.UIString(
        'Overrides allow you to modify a resources on a page, automatically ' +
        'save them to disk and reload the page with the changed persisted.');
    this._list = new UI.ListWidget(this);
    this._list.element.classList.add('overrides-list');
    this._list.registerRequiredCSS('persistence/overridesSettingsTab.css');

    var placeholder = createElementWithClass('div', 'overrides-list-empty');
    placeholder.textContent = Common.UIString('No overrides setup');
    this._list.setEmptyPlaceholder(placeholder);
    this._list.show(this.contentElement);

    Persistence.isolatedFileSystemManager.addEventListener(
        Persistence.IsolatedFileSystemManager.Events.FileSystemAdded,
        event => this._fileSystemAdded(/** @type {!Persistence.IsolatedFileSystem} */ (event.data)), this);
    Persistence.isolatedFileSystemManager.addEventListener(
        Persistence.IsolatedFileSystemManager.Events.FileSystemRemoved,
        event => this._fileSystemRemoved(/** @type {!Persistence.IsolatedFileSystem} */ (event.data)), this);
    Persistence.networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.ProjectDomainChanged, event => {
          var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (event.data);
          var fileSystem = Persistence.isolatedFileSystemManager.fileSystem(project.fileSystemPath());
          if (!fileSystem)
            return;
          this._fileSystemRemoved(fileSystem);
          this._fileSystemAdded(fileSystem);
        });
  }

  /**
   * @override
   */
  wasShown() {
    this._refresh();
  }

  _refresh() {
    this._list.clear();
    var fileSystems = Persistence.isolatedFileSystemManager.fileSystems();
    for (var fileSystem of fileSystems) {
      var project = Persistence.networkPersistenceManager.projectForFileSystem(fileSystem);
      if (!project)
        continue;
      this._list.appendItem(project, true);
    }
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (item);
    var element = createElementWithClass('div', 'overrides-list-item');

    var pathElement = element.createChild('div', 'overrides-path');
    // substr to remove 'file://'' from path.
    var fileSystemPath = project.fileSystemPath().substr(7);
    pathElement.textContent = fileSystemPath;
    pathElement.title = fileSystemPath;

    element.createChild('div', 'overrides-separator');

    var domainElement = element.createChild('div', 'overrides-domain');
    var domain = Persistence.networkPersistenceManager.domainForProject(project) || '';
    domainElement.textContent = domain;
    domainElement.title = domain;
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (item);
    var fileSystem = /** @type {!Persistence.IsolatedFileSystem} */ (
        Persistence.isolatedFileSystemManager.fileSystem(project.fileSystemPath()));
    Persistence.isolatedFileSystemManager.removeFileSystem(fileSystem);
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (item);
    Persistence.networkPersistenceManager.addFileSystemOverridesProject(editor.control('domain').value.trim(), project);
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    var project = /** @type {!Persistence.FileSystemWorkspaceBinding.FileSystem} */ (item);
    var editor = this._createEditor(project);
    editor.control('domain').value = Persistence.networkPersistenceManager.domainForProject(project) || '';
    return editor;
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _fileSystemAdded(fileSystem) {
    this._refresh();
  }

  /**
   * @param {!Persistence.IsolatedFileSystem} fileSystem
   */
  _fileSystemRemoved(fileSystem) {
    this._refresh();
  }

  /**
   * @param {!Persistence.FileSystemWorkspaceBinding.FileSystem} project
   * @return {!UI.ListWidget.Editor}
   */
  _createEditor(project) {
    var editor = new UI.ListWidget.Editor();
    var content = editor.contentElement();

    var titles = content.createChild('div', 'overrides-edit-row');
    // substr to remove 'file://'' from path.
    var fileSystemPath = project.fileSystemPath().substr(7);
    titles.createChild('div', 'overrides-filesystem-path').textContent = fileSystemPath;

    var fields = content.createChild('div', 'overrides-edit-row');
    fields.createChild('div', 'overrides-domain-label').textContent = Common.UIString('Domain');
    fields.createChild('div', 'overrides-domain')
        .appendChild(editor.createInput('domain', 'text', 'example.com', (item, index, input) => {
          var domain = Persistence.networkPersistenceManager.domainForProject(project);
          var value = input.value.trim();
          if (domain === value)
            return true;
          if (Persistence.networkPersistenceManager.projectForDomain(value))
            return false;
          return /\w+(?:\.\w+)*/.test(value);
        }));

    return editor;
  }
};
