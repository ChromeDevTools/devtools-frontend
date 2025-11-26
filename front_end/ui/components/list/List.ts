// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */

import * as i18n from '../../../core/i18n/i18n.js';
import {Directives, html, nothing, render, type TemplateResult} from '../../lit/lit.js';
import * as Buttons from '../buttons/buttons.js';

import listStyles from './list.css.js';

const UIStrings = {
  /**
   * @description Title of the edit button for the list items.
   */
  edit: 'Edit',
  /**
   * @description Title of the remove button for the list items.
   */
  remove: 'Remove',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/components/list/List.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ListItemEventDetail {
  index: number;
}

export class ItemEditEvent extends CustomEvent<ListItemEventDetail> {
  constructor(detail: ListItemEventDetail) {
    super('edit', {
      bubbles: true,
      composed: true,
      detail,
    });
  }
}

export class ItemRemoveEvent extends CustomEvent<ListItemEventDetail> {
  constructor(detail: ListItemEventDetail) {
    super('delete', {
      bubbles: true,
      composed: true,
      detail,
    });
  }
}

export class List extends HTMLElement {
  static observedAttributes: string[] = ['editable', 'deletable', 'disable-li-focus'];
  #observer: MutationObserver;
  #editable = false;
  #deletable = false;
  #disableListItemFocus?: boolean;

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.#observer = new MutationObserver(this.#render.bind(this));
  }

  set editable(isEditable: boolean) {
    if (this.#editable === isEditable) {
      return;
    }
    this.#editable = isEditable;
    this.#render();
  }

  set deletable(isDeletable: boolean) {
    if (this.#deletable === isDeletable) {
      return;
    }
    this.#deletable = isDeletable;
    this.#render();
  }

  set disableListItemFocus(disableFocus: boolean) {
    if (this.#disableListItemFocus === disableFocus) {
      return;
    }
    this.#disableListItemFocus = disableFocus;
    this.#render();
  }

  attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null): void {
    const isSet = newValue !== null;
    if (name === 'editable') {
      this.editable = isSet;
    } else if (name === 'deletable') {
      this.deletable = isSet;
    } else if (name === 'disable-li-focus') {
      this.disableListItemFocus = isSet;
    }
  }

  connectedCallback(): void {
    this.#observer.observe(this, {childList: true});
    this.#render();
  }

  disconnectedCallback(): void {
    this.#observer.disconnect();
  }

  createSlottedListItem(index: number): TemplateResult {
    return html`
    <li role='listitem' tabindex=${this.#disableListItemFocus ? '-1' : '0'}>
    <slot name='slot-${index}'></slot>
    <div class='controls-container'>
              <div class='controls-gradient'></div>
              <div class='controls-buttons'>
                ${
        this.#editable ? html`
            <devtools-button
              title=${i18nString(UIStrings.edit)}
              aria-label=${i18nString(UIStrings.edit)}
              .iconName=${'edit'}
              .jslogContext=${'edit-item'}
              .variant=${Buttons.Button.Variant.ICON}
              @click=${this.#dispatchEdit.bind(this, index)}
            ></devtools-button>
          ` :
                         nothing}
                ${
        this.#deletable ? html`
            <devtools-button
              title=${i18nString(UIStrings.remove)}
              aria-label=${i18nString(UIStrings.remove)}
              .iconName=${'bin'}
              .jslogContext=${'remove-item'}
              .variant=${Buttons.Button.Variant.ICON}
              @click=${this.#dispatchRemove.bind(this, index)}
            ></devtools-button>
          ` :
                          nothing}
              </div>
            </div>
            </li>`;
  }

  #render(): void {
    if (this.shadowRoot) {
      const items = [...this.children] as HTMLElement[];
      const listData = items.map((item, index) => {
        const slotName = `slot-${index}`;
        if (item.getAttribute('slot') !== slotName) {
          item.setAttribute('slot', slotName);
        }
        return {index, item};
      });
      render(
          html`
    <style>${listStyles}</style>
    <ul role='list'>
    ${Directives.repeat(listData, data => data.item, data => this.createSlottedListItem(data.index))}
    </ul>
  `,
          this.shadowRoot);
    }
  }

  #dispatchRemove(index: number): void {
    this.dispatchEvent(new ItemRemoveEvent({index}));
  }

  #dispatchEdit(index: number): void {
    this.dispatchEvent(new ItemEditEvent({index}));
  }
}

customElements.define('devtools-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-list': List;
  }
}

declare global {
  interface HTMLElementEventMap extends Record<'delete', ItemRemoveEvent>, Record<'edit', ItemEditEvent> {}
}
