// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {EditFileSystemView} from './EditFileSystemView.js';
import {FileSystem} from './FileSystemWorkspaceBinding.js';  // eslint-disable-line no-unused-vars
import {IsolatedFileSystem} from './IsolatedFileSystem.js';
import {Events, IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {PlatformFileSystem} from './PlatformFileSystem.js';  // eslint-disable-line no-unused-vars

export class WorkspaceSettingsTab extends UI.Widget.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('persistence/workspaceSettingsTab.css');

    const header = this.element.createChild('header');
    header.createChild('h1').createTextChild(Common.UIString.UIString('Workspace'));

    this.containerElement = this.element.createChild('div', 'settings-container-wrapper')
                                .createChild('div', 'settings-tab settings-content settings-container');

    IsolatedFileSystemManager.instance().addEventListener(
        Events.FileSystemAdded, event => this._fileSystemAdded(/** @type {!PlatformFileSystem} */ (event.data)), this);
    IsolatedFileSystemManager.instance().addEventListener(
        Events.FileSystemRemoved, event => this._fileSystemRemoved(/** @type {!PlatformFileSystem} */ (event.data)),
        this);

    const folderExcludePatternInput = this._createFolderExcludePatternInput();
    folderExcludePatternInput.classList.add('folder-exclude-pattern');
    this.containerElement.appendChild(folderExcludePatternInput);

    const div = this.containerElement.createChild('div', 'settings-info-message');
    div.createTextChild(Common.UIString.UIString('Mappings are inferred automatically.'));

    this._fileSystemsListContainer = this.containerElement.createChild('div', '');

    const addButton = UI.UIUtils.createTextButton(ls`Add folder…`, this._addFileSystemClicked.bind(this));
    this.containerElement.appendChild(addButton);
    this.setDefaultFocusedElement(addButton);

    /** @type {!Map<string, !Element>} */
    this._elementByPath = new Map();

    /** @type {!Map<string, !EditFileSystemView>} */
    this._mappingViewByPath = new Map();

    const fileSystems = IsolatedFileSystemManager.instance().fileSystems();
    for (let i = 0; i < fileSystems.length; ++i) {
      this._addItem(fileSystems[i]);
    }
  }

  /**
   * @return {!Element}
   */
  _createFolderExcludePatternInput() {
    const p = createElement('p');
    const labelElement = p.createChild('label');
    labelElement.textContent = ls`Folder exclude pattern`;
    const inputElement = UI.UIUtils.createInput('', 'text');
    UI.ARIAUtils.bindLabelToControl(labelElement, inputElement);
    p.appendChild(inputElement);
    inputElement.style.width = '270px';
    const folderExcludeSetting = IsolatedFileSystemManager.instance().workspaceFolderExcludePatternSetting();
    const setValue =
        UI.UIUtils.bindInput(inputElement, folderExcludeSetting.set.bind(folderExcludeSetting), regexValidator, false);
    folderExcludeSetting.addChangeListener(() => setValue.call(null, folderExcludeSetting.get()));
    setValue(folderExcludeSetting.get());
    return p;

    /**
     * @param {string} value
     * @return {{valid: boolean, errorMessage: (string|undefined)}}
     */
    function regexValidator(value) {
      let regex;
      try {
        regex = new RegExp(value);
      } catch (e) {
      }
      const valid = !!regex;
      return {valid};
    }
  }

  /**
   * @param {!PlatformFileSystem} fileSystem
   */
  _addItem(fileSystem) {
    // Support managing only instances of IsolatedFileSystem.
    if (!(fileSystem instanceof IsolatedFileSystem)) {
      return;
    }
    const networkPersistenceProject = self.Persistence.networkPersistenceManager.project();
    if (networkPersistenceProject &&
        IsolatedFileSystemManager.instance().fileSystem(
            /** @type {!FileSystem} */ (networkPersistenceProject).fileSystemPath()) === fileSystem) {
      return;
    }
    const element = this._renderFileSystem(fileSystem);
    this._elementByPath.set(fileSystem.path(), element);

    this._fileSystemsListContainer.appendChild(element);

    const mappingView = new EditFileSystemView(fileSystem.path());
    this._mappingViewByPath.set(fileSystem.path(), mappingView);
    mappingView.element.classList.add('file-system-mapping-view');
    mappingView.show(element);
  }

  /**
   * @param {!PlatformFileSystem} fileSystem
   * @return {!Element}
   */
  _renderFileSystem(fileSystem) {
    const fileSystemPath = fileSystem.path();
    const lastIndexOfSlash = fileSystemPath.lastIndexOf('/');
    const folderName = fileSystemPath.substr(lastIndexOfSlash + 1);

    const element = createElementWithClass('div', 'file-system-container');
    const header = element.createChild('div', 'file-system-header');

    const nameElement = header.createChild('div', 'file-system-name');
    nameElement.textContent = folderName;
    UI.ARIAUtils.markAsHeading(nameElement, 2);
    const path = header.createChild('div', 'file-system-path');
    path.textContent = fileSystemPath;
    path.title = fileSystemPath;

    const toolbar = new UI.Toolbar.Toolbar('');
    const button = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Remove'), 'largeicon-delete');
    button.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._removeFileSystemClicked.bind(this, fileSystem));
    toolbar.appendToolbarItem(button);
    header.appendChild(toolbar.element);

    return element;
  }

  /**
   * @param {!PlatformFileSystem} fileSystem
   */
  _removeFileSystemClicked(fileSystem) {
    IsolatedFileSystemManager.instance().removeFileSystem(fileSystem);
  }

  _addFileSystemClicked() {
    IsolatedFileSystemManager.instance().addFileSystem();
  }

  /**
   * @param {!PlatformFileSystem} fileSystem
   */
  _fileSystemAdded(fileSystem) {
    this._addItem(fileSystem);
  }

  /**
   * @param {!PlatformFileSystem} fileSystem
   */
  _fileSystemRemoved(fileSystem) {
    const mappingView = this._mappingViewByPath.get(fileSystem.path());
    if (mappingView) {
      mappingView.dispose();
      this._mappingViewByPath.delete(fileSystem.path());
    }

    const element = this._elementByPath.get(fileSystem.path());
    if (element) {
      this._elementByPath.delete(fileSystem.path());
      element.remove();
    }
  }
}
