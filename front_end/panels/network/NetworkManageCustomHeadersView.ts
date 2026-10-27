// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/lists/lists.js';
import '../../ui/legacy/legacy.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as Lists from '../../ui/components/lists/lists.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';

import networkManageCustomHeadersViewStyles from './networkManageCustomHeadersView.css.js';

const {ifDefined, repeat} = Directives;

const UIStrings = {
  /**
   * @description Text in Network Manage Custom Headers View of the Network panel
   */
  manageHeaderColumns: 'Manage Header Columns',
  /**
   * @description Placeholder text content in Network Manage Custom Headers View of the Network panel
   */
  noCustomHeaders: 'No custom headers',
  /**
   * @description Text of add button in Network Manage Custom Headers View of the Network panel
   */
  addCustomHeader: 'Add custom header…',
  /**
   * @description Accessible label for custom header name input in Network Manage Custom Headers View
   * of the Network panel
   */
  headerName: 'Header name',
  /**
   * @description Error message shown when custom header name input is empty
   */
  headerCannotBeEmpty: 'Header name can’t be empty',
  /**
   * @description Error message shown when custom header name already exists
   */
  headerAlreadyExists: 'Header already exists',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkManageCustomHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const NEW_ITEM_KEY = Symbol('new-header');

export interface CustomHeaderItem {
  header: string;
  editable: boolean;
  isNew?: boolean;
}

export interface ViewInput {
  items: CustomHeaderItem[];
  editingHeader: string|null;
  onAddClick: () => void;
  onBeginEdit: (header: string) => void;
  onRemove: (header: string) => void;
  onCommitEdit: (newHeader: string) => void;
  onCancelEdit: () => void;
  validateHeader: (itemHeader: string, newHeader: string) => Common.UIString.LocalizedString | null;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderCustomHeaderItem(item: CustomHeaderItem, input: ViewInput): LitTemplate {
  const editing = item.editable &&
      ((Boolean(item.isNew) && input.editingHeader === '') ||
       (!item.isNew && input.editingHeader !== null &&
        input.editingHeader.toLowerCase() === item.header.toLowerCase()));

  const onPromptActivate = (event: Event): void => {
    if (!item.editable || editing) {
      return;
    }
    input.onBeginEdit(item.header);
    event.consume(true);
  };

  // clang-format off
  return html`
    <div
      class="custom-headers-list-item"
      ?editable=${item.editable && !editing}
      ?deletable=${item.editable && !editing}>
      ${item.editable ? html`
        <devtools-prompt
          class="custom-header-name"
          render-as-block
          title=${ifDefined(item.header || undefined)}
          aria-label=${ifDefined(editing ? i18nString(UIStrings.headerName) : undefined)}
          value=${item.header}
          ?editing=${editing}
          .validator=${(value: string) => input.validateHeader(item.header, value)}
          @click=${onPromptActivate}
          @commit=${(event: UI.TextPrompt.TextPromptElement.CommitEvent) => input.onCommitEdit(event.detail)}
          @cancel=${input.onCancelEdit}>
          ${item.header}
        </devtools-prompt>
      ` : html`
        <div class="custom-header-name" title=${item.header}>${item.header}</div>
      `}
    </div>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${networkManageCustomHeadersViewStyles}</style>
    <div class="header">${i18nString(UIStrings.manageHeaderColumns)}</div>
    ${input.items.length === 0 ? html`
      <div class="custom-headers-list custom-headers-list-list-empty">
        ${i18nString(UIStrings.noCustomHeaders)}
      </div>
    ` : html`
      <devtools-list
        class="custom-headers-list square-corners"
        ?disable-li-focus=${input.editingHeader !== null}
        @edit=${(event: Lists.List.ItemEditEvent) => {
          const item = input.items[event.detail.index];
          if (item) {
            input.onBeginEdit(item.header);
          }
        }}
        @delete=${(event: Lists.List.ItemRemoveEvent) => {
          const item = input.items[event.detail.index];
          if (item) {
            input.onRemove(item.header);
          }
        }}>
        ${repeat(
            input.items,
            item => item.isNew ? NEW_ITEM_KEY : item.header.toLowerCase(),
            item => renderCustomHeaderItem(item, input))}
      </devtools-list>
    `}
    <devtools-button
      class="add-button"
      .variant=${Buttons.Button.Variant.OUTLINED}
      .jslogContext=${'network.add-custom-header'}
      @click=${input.onAddClick}>
      ${i18nString(UIStrings.addCustomHeader)}
    </devtools-button>
  `, target, {
    container: {
      attributes: {
        tabindex: '0',
      },
    },
  });
  // clang-format on
};

export class NetworkManageCustomHeadersView extends UI.Widget.VBox {
  readonly #columnConfigs = new Map<string, {
    title: string,
    editable: boolean,
  }>();
  readonly #addHeaderColumnCallback: (header: string) => boolean;
  readonly #changeHeaderColumnCallback: (oldHeader: string, newHeader: string) => boolean;
  readonly #removeHeaderColumnCallback: (header: string) => boolean;
  readonly #view: View;
  #editingHeader: string|null = null;
  readonly #onAddClickBound = this.#addButtonClicked.bind(this);
  readonly #onBeginEditBound = this.#beginEdit.bind(this);
  readonly #onRemoveBound = this.#removeItem.bind(this);
  readonly #onCommitEditBound = this.#commitEdit.bind(this);
  readonly #onCancelEditBound = this.#cancelEdit.bind(this);
  readonly #validateHeaderBound = this.#validateHeader.bind(this);

  constructor(
      columnData: Array<{
        title: string,
        editable: boolean,
      }>,
      addHeaderColumnCallback: (arg0: string) => boolean,
      changeHeaderColumnCallback: (arg0: string, arg1: string) => boolean,
      removeHeaderColumnCallback: (arg0: string) => boolean,
      view: View = DEFAULT_VIEW,
  ) {
    super({useShadowDom: true});
    this.#view = view;

    for (const column of columnData) {
      this.#columnConfigs.set(column.title.toLowerCase(), column);
    }

    this.#addHeaderColumnCallback = addHeaderColumnCallback;
    this.#changeHeaderColumnCallback = changeHeaderColumnCallback;
    this.#removeHeaderColumnCallback = removeHeaderColumnCallback;

    this.requestUpdate();
  }

  override performUpdate(): void {
    const items: CustomHeaderItem[] = [];
    for (const headerData of this.#columnConfigs.values()) {
      items.push({header: headerData.title, editable: headerData.editable});
    }
    if (this.#editingHeader === '') {
      items.push({header: '', editable: true, isNew: true});
    }
    this.#view(
        {
          items,
          editingHeader: this.#editingHeader,
          onAddClick: this.#onAddClickBound,
          onBeginEdit: this.#onBeginEditBound,
          onRemove: this.#onRemoveBound,
          onCommitEdit: this.#onCommitEditBound,
          onCancelEdit: this.#onCancelEditBound,
          validateHeader: this.#validateHeaderBound,
        },
        undefined,
        this.contentElement,
    );
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #addButtonClicked(): void {
    if (this.#editingHeader === '') {
      return;
    }
    this.#editingHeader = '';
    this.requestUpdate();
  }

  #beginEdit(header: string): void {
    const config = this.#columnConfigs.get(header.toLowerCase());
    if (!config?.editable) {
      return;
    }
    this.#editingHeader = config.title;
    this.requestUpdate();
  }

  #removeItem(header: string): void {
    const key = header.toLowerCase();
    const config = this.#columnConfigs.get(key);
    if (!config?.editable) {
      return;
    }
    if (this.#removeHeaderColumnCallback(config.title)) {
      this.#columnConfigs.delete(key);
    }
    if (this.#editingHeader?.toLowerCase() === key) {
      this.#editingHeader = null;
    }
    this.requestUpdate();
  }

  #commitEdit(newHeader: string): void {
    if (this.#editingHeader === null) {
      return;
    }
    const oldHeader = this.#editingHeader;
    const isNew = oldHeader === '';
    const trimmedHeader = newHeader.trim();
    if (this.#validateHeader(oldHeader, trimmedHeader) !== null) {
      return;
    }
    if (!isNew && oldHeader === trimmedHeader) {
      this.#editingHeader = null;
      this.requestUpdate();
      return;
    }

    const success = isNew ? this.#addHeaderColumnCallback(trimmedHeader) :
                            this.#changeHeaderColumnCallback(oldHeader, trimmedHeader);
    if (success && !isNew) {
      this.#columnConfigs.delete(oldHeader.toLowerCase());
    }
    if (success) {
      this.#columnConfigs.set(trimmedHeader.toLowerCase(), {title: trimmedHeader, editable: true});
    }
    this.#editingHeader = null;
    this.requestUpdate();
  }

  #cancelEdit(): void {
    if (this.#editingHeader === null) {
      return;
    }
    this.#editingHeader = null;
    this.requestUpdate();
  }

  #validateHeader(itemHeader: string, newHeader: string): Common.UIString.LocalizedString|null {
    const trimmed = newHeader.trim();
    if (!trimmed) {
      return i18nString(UIStrings.headerCannotBeEmpty);
    }
    const headerId = trimmed.toLowerCase();
    if (this.#columnConfigs.has(headerId) && itemHeader.toLowerCase() !== headerId) {
      return i18nString(UIStrings.headerAlreadyExists);
    }
    return null;
  }
}
