// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/lists/lists.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Persistence from '../../models/persistence/persistence.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as Lists from '../../ui/components/lists/lists.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import editFileSystemViewStyles from './editFileSystemView.css.js';

const {ifDefined, repeat} = Directives;

const UIStrings = {
  /**
   * @description Text in edit file system view of the Workspace settings in Settings to indicate that the following string is a folder URL.
   */
  url: 'URL',
  /**
   * @description Text in edit file system view of the Workspace settings in Settings.
   */
  excludedFolders: 'Excluded sub-folders',
  /**
   * @description Error message when a file system path is an empty string.
   */
  enterAPath: 'Enter a path',
  /**
   * @description Error message when a file system path is identical to an existing path.
   */
  enterAUniquePath: 'Enter a unique path',
  /**
   * @description Text for the button to add a new excluded sub-folder.
   */
  addSubfolder: 'Add sub-folder',
  /**
   * @description Accessible label for the excluded sub-folder path input in Workspace settings.
   */
  folderPath: 'Folder path',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/EditFileSystemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const NEW_ITEM_KEY = Symbol('new-excluded-folder');

export interface EditFileSystemViewInput {
  fileSystemPath: Platform.DevToolsPath.UrlString;
  excludedFolders: Platform.DevToolsPath.EncodedPathString[];
  editingIndex: number|null;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onCommit: (index: number, value: string) => void;
  onCancel: () => void;
  validateFolder: (index: number, value: string) => Platform.UIString.LocalizedString | null;
}

export type View = (input: EditFileSystemViewInput, output: undefined, target: HTMLElement) => void;

function renderExcludedFolderRow(folder: string, index: number, input: EditFileSystemViewInput): LitTemplate {
  const editing = input.editingIndex === index;
  const onPromptActivate = (event: Event): void => {
    if (editing) {
      return;
    }
    input.onEdit(index);
    event.consume(true);
  };

  // clang-format off
  return html`
    <div
      class="excluded-folder-row"
      ?editable=${!editing}
      ?deletable=${!editing}>
      <devtools-prompt
        class="excluded-folder-path"
        render-as-block
        title=${ifDefined(folder || undefined)}
        aria-label=${ifDefined(editing ? i18nString(UIStrings.folderPath) : undefined)}
        value=${folder}
        ?editing=${editing}
        .validator=${(value: string) => input.validateFolder(index, value)}
        @click=${onPromptActivate}
        @commit=${(event: UI.TextPrompt.TextPromptElement.CommitEvent) => input.onCommit(index, event.detail)}
        @cancel=${input.onCancel}>
        ${folder}
      </devtools-prompt>
    </div>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const isAdding = input.editingIndex === input.excludedFolders.length;
  const items = isAdding ? [...input.excludedFolders, ''] : input.excludedFolders;
  // clang-format off
  render(html`
    <style>${editFileSystemViewStyles}</style>
    <div class="excluded-folder-header">
      <span>${i18nString(UIStrings.url)}</span>
      <span class="excluded-folder-url">${input.fileSystemPath}</span>
      <div class="excluded-folders-title">${i18nString(UIStrings.excludedFolders)}</div>
      ${items.length > 0 ? html`
        <devtools-list
          ?disable-li-focus=${input.editingIndex !== null}
          @edit=${(e: Lists.List.ItemEditEvent) => input.onEdit(e.detail.index)}
          @delete=${(e: Lists.List.ItemRemoveEvent) => input.onDelete(e.detail.index)}>
          ${repeat(
              items,
              (folder, index) => index === input.excludedFolders.length ? NEW_ITEM_KEY : folder,
              (folder, index) => renderExcludedFolderRow(folder, index, input))}
        </devtools-list>
      ` : nothing}
      <devtools-button
        class="add-subfolder-button"
        .variant=${Buttons.Button.Variant.OUTLINED}
        .jslogContext=${'settings.add-excluded-folder'}
        @click=${input.onAdd}>
        ${i18nString(UIStrings.addSubfolder)}
      </devtools-button>
    </div>
  `, target);
  // clang-format on
};

export class EditFileSystemView extends UI.Widget.VBox {
  #fileSystem?: Persistence.PlatformFileSystem.PlatformFileSystem;
  #excludedFolders: Platform.DevToolsPath.EncodedPathString[] = [];
  #editingIndex: number|null = null;
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set fileSystem(fileSystem: Persistence.PlatformFileSystem.PlatformFileSystem) {
    if (this.#fileSystem === fileSystem) {
      return;
    }
    this.#fileSystem = fileSystem;
    this.#editingIndex = null;
    this.#resyncExcludedFolders();
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#editingIndex = null;
    this.#resyncExcludedFolders();
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#editingIndex = null;
  }

  #resyncExcludedFolders(): void {
    this.#excludedFolders = this.#fileSystem?.excludedFolders().values().toArray() ?? [];
  }

  override performUpdate(): void {
    const input: EditFileSystemViewInput = {
      fileSystemPath: this.#fileSystem?.path() ?? Platform.DevToolsPath.urlString``,
      excludedFolders: [...this.#excludedFolders],
      editingIndex: this.#editingIndex,
      onAdd: this.#onAdd.bind(this),
      onEdit: this.#onEdit.bind(this),
      onDelete: this.#onDelete.bind(this),
      onCommit: this.#onCommit.bind(this),
      onCancel: this.#onCancel.bind(this),
      validateFolder: this.#validateFolder.bind(this),
    };
    this.#view(input, undefined, this.contentElement);
  }

  #onAdd(): void {
    if (this.#editingIndex === this.#excludedFolders.length) {
      return;
    }
    this.#editingIndex = this.#excludedFolders.length;
    this.requestUpdate();
  }

  #onEdit(index: number): void {
    if (index < 0 || index >= this.#excludedFolders.length) {
      return;
    }
    this.#editingIndex = index;
    this.requestUpdate();
  }

  #onCancel(): void {
    if (!this.isShowing() || this.#editingIndex === null) {
      return;
    }
    this.#editingIndex = null;
    this.requestUpdate();
  }

  #onCommit(index: number, rawValue: string): void {
    if (!this.isShowing() || this.#editingIndex === null) {
      return;
    }
    const isNew = index === this.#excludedFolders.length;
    if (!isNew && (index < 0 || index >= this.#excludedFolders.length)) {
      return;
    }
    if (this.#validateFolder(index, rawValue) !== null) {
      return;
    }

    const path = EditFileSystemView.#normalizePrefix(rawValue.trim()) as Platform.DevToolsPath.EncodedPathString;
    if (isNew) {
      this.#excludedFolders.push(path);
      this.#fileSystem?.addExcludedFolder(path);
    } else if (this.#excludedFolders[index] !== path) {
      this.#fileSystem?.removeExcludedFolder(this.#excludedFolders[index]);
      this.#excludedFolders[index] = path;
      this.#fileSystem?.addExcludedFolder(path);
    }

    this.#editingIndex = null;
    this.requestUpdate();
  }

  #onDelete(index: number): void {
    if (index < 0 || index >= this.#excludedFolders.length) {
      return;
    }

    this.#fileSystem?.removeExcludedFolder(this.#excludedFolders[index]);
    this.#excludedFolders.splice(index, 1);

    if (this.#editingIndex !== null) {
      if (this.#editingIndex === index) {
        this.#editingIndex = null;
      } else if (this.#editingIndex > index) {
        this.#editingIndex--;
      }
    }

    this.requestUpdate();
  }

  #validateFolder(index: number, rawInput: string): Platform.UIString.LocalizedString|null {
    const path = EditFileSystemView.#normalizePrefix(rawInput.trim()) as Platform.DevToolsPath.EncodedPathString;
    if (!path) {
      return i18nString(UIStrings.enterAPath);
    }

    const isDuplicate = this.#excludedFolders.some((p, i) => i !== index && p === path);
    if (isDuplicate) {
      return i18nString(UIStrings.enterAUniquePath);
    }

    return null;
  }

  static #normalizePrefix(prefix: string): string {
    if (!prefix) {
      return '';
    }
    return prefix + (prefix[prefix.length - 1] === '/' ? '' : '/');
  }
}
