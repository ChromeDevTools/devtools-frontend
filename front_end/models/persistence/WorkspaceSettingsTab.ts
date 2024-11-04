// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Cards from '../../ui/components/cards/cards.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {EditFileSystemView} from './EditFileSystemView.js';
import type {FileSystem} from './FileSystemWorkspaceBinding.js';
import {IsolatedFileSystem} from './IsolatedFileSystem.js';
import {Events, IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {NetworkPersistenceManager} from './NetworkPersistenceManager.js';
import type {PlatformFileSystem} from './PlatformFileSystem.js';
import workspaceSettingsTabStyles from './workspaceSettingsTab.css.js';

const UIStrings = {
  /**
   *@description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  workspace: 'Workspace',
  /**
   *@description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  mappingsAreInferredAutomatically: 'Mappings are inferred automatically.',
  /**
   *@description Text of the add button in Workspace Settings Tab of the Workspace settings in Settings
   */
  addFolder: 'Add folder',
  /**
   *@description Label element text content in Workspace Settings Tab of the Workspace settings in Settings
   */
  folderExcludePattern: 'Exclude from workspace',
  /**
   *@description Label for an item to remove something
   */
  remove: 'Remove',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/WorkspaceSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class WorkspaceSettingsTab extends UI.Widget.VBox {
  containerElement: HTMLElement;
  #addButtonContainer: HTMLElement;
  private readonly elementByPath: Map<Platform.DevToolsPath.UrlString, Element>;
  private readonly mappingViewByPath: Map<Platform.DevToolsPath.UrlString, EditFileSystemView>;

  constructor() {
    super();

    this.element.setAttribute('jslog', `${VisualLogging.pane('workspace')}`);

    this.containerElement =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    this.containerElement.classList.add('settings-card-container');

    IsolatedFileSystemManager.instance().addEventListener(
        Events.FileSystemAdded, event => this.fileSystemAdded(event.data), this);
    IsolatedFileSystemManager.instance().addEventListener(
        Events.FileSystemRemoved, event => this.fileSystemRemoved(event.data), this);

    const folderExcludePatternInput = this.createFolderExcludePatternInput();
    folderExcludePatternInput.classList.add('folder-exclude-pattern');
    const mappingsAreInferredInfo = document.createElement('div');
    mappingsAreInferredInfo.classList.add('mappings-info');
    UI.UIUtils.createTextChild(mappingsAreInferredInfo, i18nString(UIStrings.mappingsAreInferredAutomatically));

    const card = new Cards.Card.Card();
    this.containerElement.appendChild(card);
    card.data = {
      heading: i18nString(UIStrings.workspace),
      content: [folderExcludePatternInput, mappingsAreInferredInfo],
    };

    this.elementByPath = new Map();
    this.mappingViewByPath = new Map();

    const fileSystems = IsolatedFileSystemManager.instance().fileSystems();
    for (let i = 0; i < fileSystems.length; ++i) {
      this.addItem(fileSystems[i]);
    }

    this.#addButtonContainer = this.containerElement.createChild('div', 'add-button-container');
    const addButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.addFolder), this.addFileSystemClicked.bind(this),
        {jslogContext: 'sources.add-folder-to-workspace'});
    addButton.classList.add('add-folder');
    this.#addButtonContainer.appendChild(addButton);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([workspaceSettingsTabStyles]);
  }

  private createFolderExcludePatternInput(): HTMLElement {
    const excludePatternElement = document.createElement('div');
    excludePatternElement.classList.add('folder-exclude-pattern');
    const labelElement = excludePatternElement.createChild('label');
    labelElement.textContent = i18nString(UIStrings.folderExcludePattern);
    const folderExcludeSetting = IsolatedFileSystemManager.instance().workspaceFolderExcludePatternSetting();
    const inputElement = UI.UIUtils.createInput('', 'text', folderExcludeSetting.name);
    UI.ARIAUtils.bindLabelToControl(labelElement, inputElement);
    excludePatternElement.appendChild(inputElement);
    const setValue =
        UI.UIUtils.bindInput(inputElement, folderExcludeSetting.set.bind(folderExcludeSetting), regexValidator, false);
    folderExcludeSetting.addChangeListener(() => setValue.call(null, folderExcludeSetting.get()));
    setValue(folderExcludeSetting.get());
    return excludePatternElement;

    function regexValidator(value: string): {valid: boolean, errorMessage: (string|undefined)} {
      let regex;
      try {
        regex = new RegExp(value);
      } catch (e) {
      }
      const valid = Boolean(regex);
      return {valid, errorMessage: undefined};
    }
  }

  private addItem(fileSystem: PlatformFileSystem): void {
    // Support managing only instances of IsolatedFileSystem.
    if (!(fileSystem instanceof IsolatedFileSystem)) {
      return;
    }
    const networkPersistenceProject = NetworkPersistenceManager.instance().project();
    if (networkPersistenceProject &&
        IsolatedFileSystemManager.instance().fileSystem((networkPersistenceProject as FileSystem).fileSystemPath()) ===
            fileSystem) {
      return;
    }
    const filename = this.getFilename(fileSystem);
    const removeButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.remove), this.removeFileSystemClicked.bind(this, fileSystem),
        {jslogContext: 'settings.remove-file-system'});

    const mappingViewContainer = document.createElement('div');
    mappingViewContainer.classList.add('mapping-view-container');
    const fileSystemExcludeCard = new Cards.Card.Card();
    this.containerElement.insertBefore(fileSystemExcludeCard, this.#addButtonContainer);
    fileSystemExcludeCard.data = {
      heading: filename,
      headingIconName: 'folder',
      headingSuffix: removeButton,
      content: [mappingViewContainer],
    };
    const mappingView = new EditFileSystemView(fileSystem.path());
    this.mappingViewByPath.set(fileSystem.path(), mappingView);
    mappingView.element.classList.add('file-system-mapping-view');

    mappingView.show(mappingViewContainer);

    this.elementByPath.set(fileSystem.path(), fileSystemExcludeCard);
  }

  private getFilename(fileSystem: PlatformFileSystem): string {
    const fileSystemPath = fileSystem.path();
    const lastIndexOfSlash = fileSystemPath.lastIndexOf('/');
    return fileSystemPath.substr(lastIndexOfSlash + 1);
  }

  private removeFileSystemClicked(fileSystem: PlatformFileSystem): void {
    IsolatedFileSystemManager.instance().removeFileSystem(fileSystem);
  }

  private addFileSystemClicked(): void {
    void IsolatedFileSystemManager.instance().addFileSystem();
  }

  private fileSystemAdded(fileSystem: PlatformFileSystem): void {
    this.addItem(fileSystem);
  }

  private fileSystemRemoved(fileSystem: PlatformFileSystem): void {
    const mappingView = this.mappingViewByPath.get(fileSystem.path());
    if (mappingView) {
      mappingView.dispose();
      this.mappingViewByPath.delete(fileSystem.path());
    }

    const element = this.elementByPath.get(fileSystem.path());
    if (element) {
      this.elementByPath.delete(fileSystem.path());
      element.remove();
    }
  }
}
