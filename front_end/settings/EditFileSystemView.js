/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
Settings.EditFileSystemView = class extends UI.VBox {
  /**
   * @param {string} fileSystemPath
   */
  constructor(fileSystemPath) {
    super(true);
    this.registerRequiredCSS('settings/editFileSystemView.css');
    this._fileSystemPath = fileSystemPath;

    this._eventListeners = [
      Workspace.fileSystemMapping.addEventListener(
          Workspace.FileSystemMapping.Events.FileMappingAdded, this._update, this),
      Workspace.fileSystemMapping.addEventListener(
          Workspace.FileSystemMapping.Events.FileMappingRemoved, this._update, this),
      Workspace.isolatedFileSystemManager.addEventListener(
          Workspace.IsolatedFileSystemManager.Events.ExcludedFolderAdded, this._update, this),
      Workspace.isolatedFileSystemManager.addEventListener(
          Workspace.IsolatedFileSystemManager.Events.ExcludedFolderRemoved, this._update, this)
    ];


    if (!Runtime.experiments.isEnabled('persistence2')) {
      this._mappingsList = new UI.ListWidget(this);
      this._mappingsList.element.classList.add('file-system-list');
      this._mappingsList.registerRequiredCSS('settings/editFileSystemView.css');
      var mappingsPlaceholder = createElementWithClass('div', 'file-system-list-empty');
      var mappingsHeader = this.contentElement.createChild('div', 'file-system-header');
      mappingsHeader.createChild('div', 'file-system-header-text').textContent = Common.UIString('Mappings');
      mappingsPlaceholder.textContent = Common.UIString('None');
      mappingsHeader.appendChild(
          UI.createTextButton(Common.UIString('Add'), this._addMappingButtonClicked.bind(this), 'add-button'));
      this._mappingsList.setEmptyPlaceholder(mappingsPlaceholder);
      this._mappingsList.show(this.contentElement);
    }

    var excludedFoldersHeader = this.contentElement.createChild('div', 'file-system-header');
    excludedFoldersHeader.createChild('div', 'file-system-header-text').textContent =
        Common.UIString('Excluded folders');
    excludedFoldersHeader.appendChild(
        UI.createTextButton(Common.UIString('Add'), this._addExcludedFolderButtonClicked.bind(this), 'add-button'));
    this._excludedFoldersList = new UI.ListWidget(this);
    this._excludedFoldersList.element.classList.add('file-system-list');
    this._excludedFoldersList.registerRequiredCSS('settings/editFileSystemView.css');
    var excludedFoldersPlaceholder = createElementWithClass('div', 'file-system-list-empty');
    excludedFoldersPlaceholder.textContent = Common.UIString('None');
    this._excludedFoldersList.setEmptyPlaceholder(excludedFoldersPlaceholder);
    this._excludedFoldersList.show(this.contentElement);

    this.contentElement.tabIndex = 0;
    this._update();
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
  }

  _update() {
    if (this._muteUpdate)
      return;

    this._mappings = [];
    if (Runtime.experiments.isEnabled('persistence2'))
      return;

    this._mappingsList.clear();
    var mappings = Workspace.fileSystemMapping.mappingEntries(this._fileSystemPath);
    for (var entry of mappings) {
      if (entry.configurable) {
        this._mappingsList.appendItem(entry, true);
        this._mappings.push(entry);
      }
    }
    for (var entry of mappings) {
      if (!entry.configurable) {
        this._mappingsList.appendItem(entry, false);
        this._mappings.push(entry);
      }
    }

    this._excludedFoldersList.clear();
    this._excludedFolders = [];
    for (var folder of Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
             .excludedFolders()
             .values()) {
      this._excludedFolders.push(folder);
      this._excludedFoldersList.appendItem(folder, true);
    }
    for (var folder of Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
             .nonConfigurableExcludedFolders()
             .values()) {
      this._excludedFolders.push(folder);
      this._excludedFoldersList.appendItem(folder, false);
    }
  }

  _addMappingButtonClicked() {
    var entry = new Workspace.FileSystemMapping.Entry(this._fileSystemPath, '', '', true);
    this._mappingsList.addNewItem(0, entry);
  }

  _addExcludedFolderButtonClicked() {
    this._excludedFoldersList.addNewItem(0, '');
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    var element = createElementWithClass('div', 'file-system-list-item');
    if (!editable)
      element.classList.add('locked');
    if (item instanceof Workspace.FileSystemMapping.Entry) {
      var entry = /** @type {!Workspace.FileSystemMapping.Entry} */ (item);
      var urlPrefix = entry.configurable ? entry.urlPrefix : Common.UIString('%s (via .devtools)', entry.urlPrefix);
      var urlPrefixElement = element.createChild('div', 'file-system-value');
      urlPrefixElement.textContent = urlPrefix;
      urlPrefixElement.title = urlPrefix;
      element.createChild('div', 'file-system-separator');
      var pathPrefixElement = element.createChild('div', 'file-system-value');
      pathPrefixElement.textContent = entry.pathPrefix;
      pathPrefixElement.title = entry.pathPrefix;
    } else {
      var pathPrefix = /** @type {string} */ (editable ? item : Common.UIString('%s (via .devtools)', item));
      var pathPrefixElement = element.createChild('div', 'file-system-value');
      pathPrefixElement.textContent = pathPrefix;
      pathPrefixElement.title = pathPrefix;
    }
    element.createChild('div', 'file-system-locked').title = Common.UIString('From .devtools file');
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    if (item instanceof Workspace.FileSystemMapping.Entry) {
      var entry = this._mappings[index];
      Workspace.fileSystemMapping.removeFileMapping(entry.fileSystemPath, entry.urlPrefix, entry.pathPrefix);
    } else {
      Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
          .removeExcludedFolder(this._excludedFolders[index]);
    }
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    this._muteUpdate = true;
    if (item instanceof Workspace.FileSystemMapping.Entry) {
      var entry = /** @type {!Workspace.FileSystemMapping.Entry} */ (item);
      if (!isNew)
        Workspace.fileSystemMapping.removeFileMapping(this._fileSystemPath, entry.urlPrefix, entry.pathPrefix);
      Workspace.fileSystemMapping.addFileMapping(
          this._fileSystemPath, this._normalizePrefix(editor.control('urlPrefix').value),
          this._normalizePrefix(editor.control('pathPrefix').value));
    } else {
      if (!isNew) {
        Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
            .removeExcludedFolder(/** @type {string} */ (item));
      }
      Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
          .addExcludedFolder(this._normalizePrefix(editor.control('pathPrefix').value));
    }
    this._muteUpdate = false;
    this._update();
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    if (item instanceof Workspace.FileSystemMapping.Entry) {
      var entry = /** @type {!Workspace.FileSystemMapping.Entry} */ (item);
      var editor = this._createMappingEditor();
      editor.control('urlPrefix').value = entry.urlPrefix;
      editor.control('pathPrefix').value = entry.pathPrefix;
      return editor;
    } else {
      var editor = this._createExcludedFolderEditor();
      editor.control('pathPrefix').value = item;
      return editor;
    }
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createMappingEditor() {
    if (this._mappingEditor)
      return this._mappingEditor;

    var editor = new UI.ListWidget.Editor();
    this._mappingEditor = editor;
    var content = editor.contentElement();

    var titles = content.createChild('div', 'file-system-edit-row');
    titles.createChild('div', 'file-system-value').textContent = Common.UIString('URL prefix');
    titles.createChild('div', 'file-system-separator file-system-separator-invisible');
    titles.createChild('div', 'file-system-value').textContent = Common.UIString('Folder path');

    var fields = content.createChild('div', 'file-system-edit-row');
    fields.createChild('div', 'file-system-value')
        .appendChild(
            editor.createInput('urlPrefix', 'text', 'http://localhost:8000/url', urlPrefixValidator.bind(this)));
    fields.createChild('div', 'file-system-separator file-system-separator-invisible');
    fields.createChild('div', 'file-system-value')
        .appendChild(editor.createInput('pathPrefix', 'text', '/path/to/folder/', pathPrefixValidator.bind(this)));

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     * @this {Settings.EditFileSystemView}
     */
    function urlPrefixValidator(item, index, input) {
      var prefix = this._normalizePrefix(input.value);
      for (var i = 0; i < this._mappings.length; ++i) {
        if (i !== index && this._mappings[i].configurable && this._mappings[i].urlPrefix === prefix)
          return false;
      }
      return !!prefix;
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     * @this {Settings.EditFileSystemView}
     */
    function pathPrefixValidator(item, index, input) {
      var prefix = this._normalizePrefix(input.value);
      for (var i = 0; i < this._mappings.length; ++i) {
        if (i !== index && this._mappings[i].configurable && this._mappings[i].pathPrefix === prefix)
          return false;
      }
      return !!prefix;
    }
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createExcludedFolderEditor() {
    if (this._excludedFolderEditor)
      return this._excludedFolderEditor;

    var editor = new UI.ListWidget.Editor();
    this._excludedFolderEditor = editor;
    var content = editor.contentElement();

    var titles = content.createChild('div', 'file-system-edit-row');
    titles.createChild('div', 'file-system-value').textContent = Common.UIString('Folder path');

    var fields = content.createChild('div', 'file-system-edit-row');
    fields.createChild('div', 'file-system-value')
        .appendChild(editor.createInput('pathPrefix', 'text', '/path/to/folder/', pathPrefixValidator.bind(this)));

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {boolean}
     * @this {Settings.EditFileSystemView}
     */
    function pathPrefixValidator(item, index, input) {
      var prefix = this._normalizePrefix(input.value);
      var configurableCount =
          Workspace.isolatedFileSystemManager.fileSystem(this._fileSystemPath).excludedFolders().size;
      for (var i = 0; i < configurableCount; ++i) {
        if (i !== index && this._excludedFolders[i] === prefix)
          return false;
      }
      return !!prefix;
    }
  }

  /**
   * @param {string} prefix
   * @return {string}
   */
  _normalizePrefix(prefix) {
    if (!prefix)
      return '';
    return prefix + (prefix[prefix.length - 1] === '/' ? '' : '/');
  }
};
