// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import type * as Protocol from '../../../generated/protocol.js';

import HeadersViewStyles from './HeadersView.css.js';

const UIStrings = {
  /**
   *@description The title of a button that adds a field to input a header in the editor form.
   */
  addHeader: 'Add a header',
  /**
   *@description The title of a button that removes a field to input a header in the editor form.
   */
  removeHeader: 'Remove this header',
  /**
   *@description The title of a button that removes a section for defining header overrides in the editor form.
   */
  removeBlock: 'Remove this \'`ApplyTo`\'-section',
  /**
   *@description Error message for files which cannot not be parsed.
   *@example {.headers} PH1
   */
  errorWhenParsing: 'Error when parsing \'\'{PH1}\'\'.',
  /**
   *@description Explainer for files which cannot be parsed.
   *@example {.headers} PH1
   */
  parsingErrorExplainer:
      'This is most likely due to a syntax error in \'\'{PH1}\'\'. Try opening this file in an external editor to fix the error or delete the file and re-create the override.',
  /**
   *@description Button text for a button which adds an additional header override rule.
   */
  addOverrideRule: 'Add override rule',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/components/HeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const plusIconUrl = new URL('../../../Images/plus_icon.svg', import.meta.url).toString();
const trashIconUrl = new URL('../../../Images/trash_bin_material_icon.svg', import.meta.url).toString();

export class HeadersView extends UI.View.SimpleView {
  readonly #headersViewComponent = new HeadersViewComponent();
  #uiSourceCode: Workspace.UISourceCode.UISourceCode;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(i18n.i18n.lockedString('HeadersView'));
    this.#uiSourceCode = uiSourceCode;
    this.#uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.#onWorkingCopyChanged, this);
    this.#uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
    this.element.appendChild(this.#headersViewComponent);
    void this.#setInitialData();
  }

  async #setInitialData(): Promise<void> {
    const content = await this.#uiSourceCode.requestContent();
    this.#setComponentData(content.content || '');
  }

  #setComponentData(content: string): void {
    let parsingError = false;
    let headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
    content = content || '[]';
    try {
      headerOverrides = JSON.parse(content) as Persistence.NetworkPersistenceManager.HeaderOverride[];
      if (!headerOverrides.every(Persistence.NetworkPersistenceManager.isHeaderOverride)) {
        throw 'Type mismatch after parsing';
      }
    } catch (e) {
      console.error('Failed to parse', this.#uiSourceCode.url(), 'for locally overriding headers.');
      parsingError = true;
    }

    this.#headersViewComponent.data = {
      headerOverrides,
      uiSourceCode: this.#uiSourceCode,
      parsingError,
    };
  }

  commitEditing(): void {
    this.#uiSourceCode.commitWorkingCopy();
  }

  #onWorkingCopyChanged(): void {
    this.#setComponentData(this.#uiSourceCode.workingCopy());
  }

  #onWorkingCopyCommitted(): void {
    this.#setComponentData(this.#uiSourceCode.workingCopy());
  }

  getComponent(): HeadersViewComponent {
    return this.#headersViewComponent;
  }

  dispose(): void {
    this.#uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.#onWorkingCopyChanged, this);
    this.#uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#onWorkingCopyCommitted, this);
  }
}

export interface HeadersViewComponentData {
  headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[];
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  parsingError: boolean;
}

export class HeadersViewComponent extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-sources-headers-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[] = [];
  #uiSourceCode: Workspace.UISourceCode.UISourceCode|null = null;
  #parsingError = false;
  #focusElement: {blockIndex: number, headerIndex?: number}|null = null;
  #textOnFocusIn = '';

  constructor() {
    super();
    this.#shadow.addEventListener('focusin', this.#onFocusIn.bind(this));
    this.#shadow.addEventListener('focusout', this.#onFocusOut.bind(this));
    this.#shadow.addEventListener('click', this.#onClick.bind(this));
    this.#shadow.addEventListener('input', this.#onInput.bind(this));
    this.#shadow.addEventListener('keydown', this.#onKeyDown.bind(this));
    this.#shadow.addEventListener('paste', this.#onPaste.bind(this));
    this.addEventListener('contextmenu', this.#onContextMenu.bind(this));
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [HeadersViewStyles];
  }

  set data(data: HeadersViewComponentData) {
    this.#headerOverrides = data.headerOverrides;
    this.#uiSourceCode = data.uiSourceCode;
    this.#parsingError = data.parsingError;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  // 'Enter' key should not create a new line in the contenteditable. Focus
  // on the next contenteditable instead.
  #onKeyDown(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.matches('.editable')) {
      return;
    }
    const keyboardEvent = event as KeyboardEvent;
    if (target.matches('.header-name') && target.innerText === '' &&
        (keyboardEvent.key === 'Enter' || keyboardEvent.key === 'Tab')) {
      // onFocusOut will remove the header -> blur instead of focusing on next editable
      event.preventDefault();
      target.blur();
    } else if (keyboardEvent.key === 'Enter') {
      event.preventDefault();
      target.blur();
      this.#focusNext(target);
    } else if (keyboardEvent.key === 'Escape') {
      event.consume();
      target.innerText = this.#textOnFocusIn;
      target.blur();
      this.#onChange(target);
    }
  }

  #focusNext(target: HTMLElement): void {
    const elements = Array.from(this.#shadow.querySelectorAll('.editable')) as HTMLElement[];
    const idx = elements.indexOf(target);
    if (idx !== -1 && idx + 1 < elements.length) {
      elements[idx + 1].focus();
    }
  }

  #selectAllText(target: HTMLElement): void {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  #onFocusIn(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.matches('.editable')) {
      this.#selectAllText(target);
      this.#textOnFocusIn = target.innerText;
    }
  }

  #onFocusOut(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.innerText === '') {
      const rowElement = target.closest('.row') as HTMLElement;
      const blockIndex = Number(rowElement.dataset.blockIndex);
      const headerIndex = Number(rowElement.dataset.headerIndex);
      if (target.matches('.apply-to')) {
        target.innerText = '*';
        this.#headerOverrides[blockIndex].applyTo = '*';
        this.#onHeadersChanged();
      } else if (target.matches('.header-name')) {
        this.#removeHeader(blockIndex, headerIndex);
      }
    }

    // clear selection
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }

  #onContextMenu(event: Event): void {
    if (!this.#uiSourceCode) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.#uiSourceCode);
    void contextMenu.show();
  }

  #generateNextHeaderName(headers: Protocol.Fetch.HeaderEntry[]): string {
    const takenNames = new Set<string>(headers.map(header => header.name));
    let idx = 1;
    while (takenNames.has('header-name-' + idx)) {
      idx++;
    }
    return 'header-name-' + idx;
  }

  #onClick(event: Event): void {
    const target = event.target as HTMLButtonElement;
    const rowElement = target.closest('.row') as HTMLElement | null;
    const blockIndex = Number(rowElement?.dataset.blockIndex || 0);
    const headerIndex = Number(rowElement?.dataset.headerIndex || 0);
    if (target.matches('.add-header')) {
      this.#headerOverrides[blockIndex].headers.splice(
          headerIndex + 1, 0,
          {name: this.#generateNextHeaderName(this.#headerOverrides[blockIndex].headers), value: 'header value'});
      this.#focusElement = {blockIndex, headerIndex: headerIndex + 1};
      this.#onHeadersChanged();
    } else if (target.matches('.remove-header')) {
      this.#removeHeader(blockIndex, headerIndex);
    } else if (target.matches('.add-block')) {
      this.#headerOverrides.push({applyTo: '*', headers: [{name: 'header-name-1', value: 'header value'}]});
      this.#focusElement = {blockIndex: this.#headerOverrides.length - 1};
      this.#onHeadersChanged();
    } else if (target.matches('.remove-block')) {
      this.#headerOverrides.splice(blockIndex, 1);
      this.#onHeadersChanged();
    }
  }

  #removeHeader(blockIndex: number, headerIndex: number): void {
    this.#headerOverrides[blockIndex].headers.splice(headerIndex, 1);
    if (this.#headerOverrides[blockIndex].headers.length === 0) {
      this.#headerOverrides[blockIndex].headers.push(
          {name: this.#generateNextHeaderName(this.#headerOverrides[blockIndex].headers), value: 'header value'});
    }
    this.#onHeadersChanged();
  }

  #onInput(event: Event): void {
    this.#onChange(event.target as HTMLElement);
  }

  #onChange(target: HTMLElement): void {
    const rowElement = target.closest('.row') as HTMLElement;
    const blockIndex = Number(rowElement.dataset.blockIndex);
    const headerIndex = Number(rowElement.dataset.headerIndex);
    if (target.matches('.header-name')) {
      this.#headerOverrides[blockIndex].headers[headerIndex].name = target.innerText;
      this.#onHeadersChanged();
    }
    if (target.matches('.header-value')) {
      this.#headerOverrides[blockIndex].headers[headerIndex].value = target.innerText;
      this.#onHeadersChanged();
    }
    if (target.matches('.apply-to')) {
      this.#headerOverrides[blockIndex].applyTo = target.innerText;
      this.#onHeadersChanged();
    }
  }

  #onHeadersChanged(): void {
    this.#uiSourceCode?.setWorkingCopy(JSON.stringify(this.#headerOverrides, null, 2));
  }

  #onPaste(event: Event): void {
    const clipboardEvent = event as ClipboardEvent;
    event.preventDefault();
    if (clipboardEvent.clipboardData) {
      const text = clipboardEvent.clipboardData.getData('text/plain');
      const range = this.#shadow.getSelection()?.getRangeAt(0);
      if (!range) {
        return;
      }
      range.deleteContents();

      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.selectNodeContents(textNode);
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      this.#onChange(event.target as HTMLElement);
    }
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('HeadersView render was not scheduled');
    }

    if (this.#parsingError) {
      const fileName = this.#uiSourceCode?.name() || '.headers';
      // clang-format off
      LitHtml.render(LitHtml.html`
        <div class="center-wrapper">
          <div class="centered">
            <div class="error-header">${i18nString(UIStrings.errorWhenParsing, {PH1: fileName})}</div>
            <div class="error-body">${i18nString(UIStrings.parsingErrorExplainer, {PH1: fileName})}</div>
          </div>
        </div>
      `, this.#shadow, {host: this});
      // clang-format on
      return;
    }

    // clang-format off
    LitHtml.render(LitHtml.html`
      ${this.#headerOverrides.map((headerOverride, blockIndex) =>
        LitHtml.html`
          ${this.#renderApplyToRow(headerOverride.applyTo, blockIndex)}
          ${headerOverride.headers.map((header, headerIndex) =>
            LitHtml.html`
              ${this.#renderHeaderRow(header, blockIndex, headerIndex)}
            `,
          )}
        `,
      )}
      <${Buttons.Button.Button.litTagName} .variant=${Buttons.Button.Variant.SECONDARY} class="add-block">
        ${i18nString(UIStrings.addOverrideRule)}
      </${Buttons.Button.Button.litTagName}>
    `, this.#shadow, {host: this});
    // clang-format on

    if (this.#focusElement) {
      let focusElement: Element|null = null;
      if (this.#focusElement.headerIndex) {
        focusElement = this.#shadow.querySelector(`[data-block-index="${
            this.#focusElement.blockIndex}"][data-header-index="${this.#focusElement.headerIndex}"] .header-name`);
      } else {
        focusElement = this.#shadow.querySelector(`[data-block-index="${this.#focusElement.blockIndex}"] .apply-to`);
      }
      if (focusElement) {
        (focusElement as HTMLElement).focus();
      }
      this.#focusElement = null;
    }
  }

  #renderApplyToRow(pattern: string, blockIndex: number): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <div class="row" data-block-index=${blockIndex}>
        <div>${i18n.i18n.lockedString('Apply to')}</div>
        <div class="separator">:</div>
        ${this.#renderEditable(pattern, 'apply-to')}
        <${Buttons.Button.Button.litTagName}
        title=${i18nString(UIStrings.removeBlock)}
        .size=${Buttons.Button.Size.SMALL}
        .iconUrl=${trashIconUrl}
        .iconWidth=${'14px'}
        .iconHeight=${'14px'}
        .variant=${Buttons.Button.Variant.ROUND}
        class="remove-block inline-button"
      ></${Buttons.Button.Button.litTagName}>
      </div>
    `;
    // clang-format on
  }

  #renderHeaderRow(header: Protocol.Fetch.HeaderEntry, blockIndex: number, headerIndex: number):
      LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <div class="row padded" data-block-index=${blockIndex} data-header-index=${headerIndex}>
        ${this.#renderEditable(header.name, 'header-name red')}
        <div class="separator">:</div>
        ${this.#renderEditable(header.value, 'header-value')}
        <${Buttons.Button.Button.litTagName}
          title=${i18nString(UIStrings.addHeader)}
          .size=${Buttons.Button.Size.SMALL}
          .iconUrl=${plusIconUrl}
          .iconWidth=${'16px'}
          .iconHeight=${'16px'}
          .variant=${Buttons.Button.Variant.ROUND}
          class="add-header inline-button"
        ></${Buttons.Button.Button.litTagName}>
        <${Buttons.Button.Button.litTagName}
          title=${i18nString(UIStrings.removeHeader)}
          .size=${Buttons.Button.Size.SMALL}
          .iconUrl=${trashIconUrl}
          .iconWidth=${'14px'}
          .iconHeight=${'14px'}
          .variant=${Buttons.Button.Variant.ROUND}
          class="remove-header inline-button"
        ></${Buttons.Button.Button.litTagName}>
      </div>
    `;
    // clang-format on
  }

  #renderEditable(value: string, className?: string): LitHtml.TemplateResult {
    // This uses LitHtml's `live`-directive, so that when checking whether to
    // update during re-render, `value` is compared against the actual live DOM
    // value of the contenteditable element and not the potentially outdated
    // value from the previous render.
    // clang-format off
    return LitHtml.html`<span contenteditable="true" class="editable ${className}" tabindex="0" .innerText=${LitHtml.Directives.live(value)}></span>`;
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-sources-headers-view', HeadersViewComponent);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-sources-headers-view': HeadersViewComponent;
  }
}
