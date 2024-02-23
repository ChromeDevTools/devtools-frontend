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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';

import editFileSystemViewStyles from './editFileSystemView.css.js';
import {Events, IsolatedFileSystemManager} from './IsolatedFileSystemManager.js';
import {type PlatformFileSystem} from './PlatformFileSystem.js';

const UIStrings = {
  /**
   *@description Text in Edit File System View of the Workspace settings in Settings
   */
  excludedFolders: 'Excluded folders',
  /**
   *@description Text to add something
   */
  add: 'Add',
  /**
   * @description Placeholder text for an area of the UI that shows which folders have been excluded
   * from being show in DevTools. When the user has not yet chosen any folders to exclude, this text
   * is shown.
   */
  none: 'None',
  /**
   *@description Text in Edit File System View of the Workspace settings in Settings
   *@example {file/path/} PH1
   */
  sViaDevtools: '{PH1} (via .devtools)',
  /**
   *@description Text in Edit File System View of the Workspace settings in Settings
   */
  folderPath: 'Folder path',
  /**
   *@description Error message when a file system path is an empty string.
   */
  enterAPath: 'Enter a path',
  /**
   *@description Error message when a file system path is identical to an existing path.
   */
  enterAUniquePath: 'Enter a unique path',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/EditFileSystemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class EditFileSystemView extends UI.Widget.VBox implements UI.ListWidget.Delegate<string> {
  private readonly fileSystemPath: Platform.DevToolsPath.UrlString;
  private excludedFolders: Platform.DevToolsPath.EncodedPathString[];
  private readonly eventListeners: Common.EventTarget.EventDescriptor[];
  private readonly excludedFoldersList: UI.ListWidget.ListWidget<string>;
  private muteUpdate?: boolean;
  private excludedFolderEditor?: UI.ListWidget.Editor<string>;
  constructor(fileSystemPath: Platform.DevToolsPath.UrlString) {
    super(true);

    this.fileSystemPath = fileSystemPath;

    this.excludedFolders = [];

    this.eventListeners = [
      IsolatedFileSystemManager.instance().addEventListener(Events.ExcludedFolderAdded, this.update, this),
      IsolatedFileSystemManager.instance().addEventListener(Events.ExcludedFolderRemoved, this.update, this),
    ];

    const excludedFoldersHeader = this.contentElement.createChild('div', 'file-system-header');
    excludedFoldersHeader.createChild('div', 'file-system-header-text').textContent =
        i18nString(UIStrings.excludedFolders);
    const addButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.add), this.addExcludedFolderButtonClicked.bind(this),
        {className: 'add-button', jslogContext: 'settings.add-excluded-folder'});
    excludedFoldersHeader.appendChild(addButton);
    this.excludedFoldersList = new UI.ListWidget.ListWidget(this);
    this.excludedFoldersList.element.classList.add('file-system-list');

    const excludedFoldersPlaceholder = document.createElement('div');
    excludedFoldersPlaceholder.classList.add('file-system-list-empty');
    excludedFoldersPlaceholder.textContent = i18nString(UIStrings.none);
    this.excludedFoldersList.setEmptyPlaceholder(excludedFoldersPlaceholder);
    this.excludedFoldersList.show(this.contentElement);

    this.update();
  }

  dispose(): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
  }

  private getFileSystem(): PlatformFileSystem {
    return IsolatedFileSystemManager.instance().fileSystem(this.fileSystemPath) as PlatformFileSystem;
  }

  private update(): void {
    if (this.muteUpdate) {
      return;
    }

    this.excludedFoldersList.clear();
    this.excludedFolders = [];
    for (const folder of this.getFileSystem().excludedFolders().values()) {
      this.excludedFolders.push(folder);
      this.excludedFoldersList.appendItem(folder, true);
    }
  }

  private addExcludedFolderButtonClicked(): void {
    this.excludedFoldersList.addNewItem(0, '');
  }

  renderItem(item: string, editable: boolean): Element {
    const element = document.createElement('div');
    element.classList.add('file-system-list-item');
    const pathPrefix = editable ? item : i18nString(UIStrings.sViaDevtools, {PH1: item}) as string;
    const pathPrefixElement = element.createChild('div', 'file-system-value');
    pathPrefixElement.textContent = pathPrefix;
    UI.Tooltip.Tooltip.install(pathPrefixElement, pathPrefix);
    return element;
  }

  removeItemRequested(_item: string, index: number): void {
    this.getFileSystem().removeExcludedFolder(this.excludedFolders[index]);
  }

  commitEdit(item: Platform.DevToolsPath.EncodedPathString, editor: UI.ListWidget.Editor<string>, isNew: boolean):
      void {
    this.muteUpdate = true;
    if (!isNew) {
      this.getFileSystem().removeExcludedFolder(item);
    }
    this.getFileSystem().addExcludedFolder(
        this.normalizePrefix(editor.control('path-prefix').value) as Platform.DevToolsPath.EncodedPathString);
    this.muteUpdate = false;
    this.update();
  }

  beginEdit(item: string): UI.ListWidget.Editor<string> {
    const editor = this.createExcludedFolderEditor();
    editor.control('path-prefix').value = item;
    return editor;
  }

  private createExcludedFolderEditor(): UI.ListWidget.Editor<string> {
    if (this.excludedFolderEditor) {
      return this.excludedFolderEditor;
    }

    const editor = new UI.ListWidget.Editor<string>();
    this.excludedFolderEditor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'file-system-edit-row');
    titles.createChild('div', 'file-system-value').textContent = i18nString(UIStrings.folderPath);

    const fields = content.createChild('div', 'file-system-edit-row');
    fields.createChild('div', 'file-system-value')
        .appendChild(editor.createInput('path-prefix', 'text', '/path/to/folder/', pathPrefixValidator.bind(this)));

    return editor;

    function pathPrefixValidator(
        this: EditFileSystemView, _item: string, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      const prefix = this.normalizePrefix(input.value.trim());

      if (!prefix) {
        return {valid: false, errorMessage: i18nString(UIStrings.enterAPath)};
      }

      const configurableCount = this.getFileSystem().excludedFolders().size;
      for (let i = 0; i < configurableCount; ++i) {
        if (i !== index && this.excludedFolders[i] === prefix) {
          return {valid: false, errorMessage: i18nString(UIStrings.enterAUniquePath)};
        }
      }
      return {valid: true, errorMessage: undefined};
    }
  }

  private normalizePrefix(prefix: string): string {
    if (!prefix) {
      return '';
    }
    return prefix + (prefix[prefix.length - 1] === '/' ? '' : '/');
  }
  override wasShown(): void {
    super.wasShown();
    this.excludedFoldersList.registerCSSFiles([editFileSystemViewStyles]);
    this.registerCSSFiles([editFileSystemViewStyles]);
  }
}
