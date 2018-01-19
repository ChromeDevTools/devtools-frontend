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
Persistence.EditFileSystemView = class extends UI.VBox {
  /**
   * @param {string} fileSystemPath
   */
  constructor(fileSystemPath) {
    super(true);
    this.registerRequiredCSS('persistence/editFileSystemView.css');
    this._fileSystemPath = fileSystemPath;

    this._eventListeners = [
      Persistence.isolatedFileSystemManager.addEventListener(
          Persistence.IsolatedFileSystemManager.Events.ExcludedFolderAdded, this._update, this),
      Persistence.isolatedFileSystemManager.addEventListener(
          Persistence.IsolatedFileSystemManager.Events.ExcludedFolderRemoved, this._update, this)
    ];

    var excludedFoldersHeader = this.contentElement.createChild('div', 'file-system-header');
    excludedFoldersHeader.createChild('div', 'file-system-header-text').textContent =
        Common.UIString('Excluded folders');
    excludedFoldersHeader.appendChild(
        UI.createTextButton(Common.UIString('Add'), this._addExcludedFolderButtonClicked.bind(this), 'add-button'));
    this._excludedFoldersList = new UI.ListWidget(this);
    this._excludedFoldersList.element.classList.add('file-system-list');
    this._excludedFoldersList.registerRequiredCSS('persistence/editFileSystemView.css');
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

    this._excludedFoldersList.clear();
    this._excludedFolders = [];
    for (var folder of Persistence.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
             .excludedFolders()
             .values()) {
      this._excludedFolders.push(folder);
      this._excludedFoldersList.appendItem(folder, true);
    }
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
    var pathPrefix = /** @type {string} */ (editable ? item : Common.UIString('%s (via .devtools)', item));
    var pathPrefixElement = element.createChild('div', 'file-system-value');
    pathPrefixElement.textContent = pathPrefix;
    pathPrefixElement.title = pathPrefix;
    return element;
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    Persistence.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
        .removeExcludedFolder(this._excludedFolders[index]);
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    this._muteUpdate = true;
    if (!isNew) {
      Persistence.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
          .removeExcludedFolder(/** @type {string} */ (item));
    }
    Persistence.isolatedFileSystemManager.fileSystem(this._fileSystemPath)
        .addExcludedFolder(this._normalizePrefix(editor.control('pathPrefix').value));
    this._muteUpdate = false;
    this._update();
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    var editor = this._createExcludedFolderEditor();
    editor.control('pathPrefix').value = item;
    return editor;
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
     * @this {Persistence.EditFileSystemView}
     */
    function pathPrefixValidator(item, index, input) {
      var prefix = this._normalizePrefix(input.value);
      var configurableCount =
          Persistence.isolatedFileSystemManager.fileSystem(this._fileSystemPath).excludedFolders().size;
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
