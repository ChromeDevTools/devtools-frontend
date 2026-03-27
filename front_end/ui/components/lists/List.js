// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import * as i18n from '../../../core/i18n/i18n.js';
import { Directives, html, nothing, render } from '../../lit/lit.js';
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
};
const str_ = i18n.i18n.registerUIStrings('ui/components/lists/List.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ItemEditEvent extends CustomEvent {
    constructor(detail) {
        super('edit', {
            bubbles: true,
            composed: true,
            detail,
        });
    }
}
export class ItemRemoveEvent extends CustomEvent {
    constructor(detail) {
        super('delete', {
            bubbles: true,
            composed: true,
            detail,
        });
    }
}
export class List extends HTMLElement {
    static observedAttributes = ['editable', 'deletable', 'disable-li-focus'];
    #observer;
    #editable = false;
    #deletable = false;
    #disableListItemFocus;
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.#observer = new MutationObserver(this.#render.bind(this));
    }
    set editable(isEditable) {
        if (this.#editable === isEditable) {
            return;
        }
        this.#editable = isEditable;
        this.#render();
    }
    set deletable(isDeletable) {
        if (this.#deletable === isDeletable) {
            return;
        }
        this.#deletable = isDeletable;
        this.#render();
    }
    set disableListItemFocus(disableFocus) {
        if (this.#disableListItemFocus === disableFocus) {
            return;
        }
        this.#disableListItemFocus = disableFocus;
        this.#render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        const isSet = newValue !== null;
        if (name === 'editable') {
            this.editable = isSet;
        }
        else if (name === 'deletable') {
            this.deletable = isSet;
        }
        else if (name === 'disable-li-focus') {
            this.disableListItemFocus = isSet;
        }
    }
    connectedCallback() {
        this.#observer.observe(this, { childList: true });
        this.#render();
    }
    disconnectedCallback() {
        this.#observer.disconnect();
    }
    createSlottedListItem(index) {
        return html `
    <li role='listitem' tabindex=${this.#disableListItemFocus ? '-1' : '0'}>
    <slot name='slot-${index}'></slot>
    <div class='controls-container'>
              <div class='controls-gradient'></div>
              <div class='controls-buttons'>
                ${this.#editable ? html `
            <devtools-button
              title=${i18nString(UIStrings.edit)}
              aria-label=${i18nString(UIStrings.edit)}
              .iconName=${'edit'}
              .jslogContext=${'edit-item'}
              .variant=${"icon" /* Buttons.Button.Variant.ICON */}
              @click=${this.#dispatchEdit.bind(this, index)}
            ></devtools-button>
          ` :
            nothing}
                ${this.#deletable ? html `
            <devtools-button
              title=${i18nString(UIStrings.remove)}
              aria-label=${i18nString(UIStrings.remove)}
              .iconName=${'bin'}
              .jslogContext=${'remove-item'}
              .variant=${"icon" /* Buttons.Button.Variant.ICON */}
              @click=${this.#dispatchRemove.bind(this, index)}
            ></devtools-button>
          ` :
            nothing}
              </div>
            </div>
            </li>`;
    }
    #render() {
        if (this.shadowRoot) {
            const items = [...this.children];
            const listData = items.map((item, index) => {
                const slotName = `slot-${index}`;
                if (item.getAttribute('slot') !== slotName) {
                    item.setAttribute('slot', slotName);
                }
                return { index, item };
            });
            render(html `
    <style>${listStyles}</style>
    <ul role='list'>
    ${Directives.repeat(listData, data => data.item, data => this.createSlottedListItem(data.index))}
    </ul>
  `, this.shadowRoot);
        }
    }
    #dispatchRemove(index) {
        this.dispatchEvent(new ItemRemoveEvent({ index }));
    }
    #dispatchEdit(index) {
        this.dispatchEvent(new ItemEditEvent({ index }));
    }
}
customElements.define('devtools-list', List);
//# sourceMappingURL=List.js.map