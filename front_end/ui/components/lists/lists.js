var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/lists/List.js
var List_exports = {};
__export(List_exports, {
  ItemEditEvent: () => ItemEditEvent,
  ItemRemoveEvent: () => ItemRemoveEvent,
  List: () => List
});
import * as i18n from "./../../../core/i18n/i18n.js";
import { Directives, html, nothing, render } from "./../../lit/lit.js";
import * as Buttons from "./../buttons/buttons.js";

// gen/front_end/ui/components/lists/list.css.js
var list_css_default = `/*
* Copyright 2025 The Chromium Authors
* Use of this source code is governed by a BSD-style license that can be
* found in the LICENSE file.
 */

:host {
  width: 100%;
  flex: auto 0 1;
  overflow-y: auto;
  flex-direction: column;

  --override-background-list-item-color: var(--sys-color-cdt-base-container);
}

:host([hidden]) {
  display: none;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  flex: none;
  min-height: 30px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  border-radius: var(--sys-shape-corner-extra-small);

  &:hover {
    .controls-gradient {
      background-image: linear-gradient(90deg, transparent, var(--sys-color-cdt-base-container));
    }

    .controls-buttons {
      visibility: visible;
    }

  }

  &:focus-within:not(:active),
  &:focus-visible {
    background-color: var(--sys-color-state-hover-on-subtle);

    --override-background-list-item-color: hsl(0deg 0% 96%);

    outline: none;


    .controls-gradient {
      background-image: linear-gradient(90deg, transparent, var(--override-background-list-item-color));
    }

    .controls-buttons {
      background-color: var(--override-background-list-item-color);
      visibility: visible;
    }

  }
}

.controls-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: stretch;
  pointer-events: none;
  position: absolute;
  right: 0;
}

.controls-gradient {
  width: var(--sys-size-16);
}

.controls-buttons {
  flex: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: auto;
  visibility: hidden;
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./list.css")} */`;

// gen/front_end/ui/components/lists/List.js
var UIStrings = {
  /**
   * @description Title of the edit button for the list items.
   */
  edit: "Edit",
  /**
   * @description Title of the remove button for the list items.
   */
  remove: "Remove"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/lists/List.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ItemEditEvent = class extends CustomEvent {
  constructor(detail) {
    super("edit", {
      bubbles: true,
      composed: true,
      detail
    });
  }
};
var ItemRemoveEvent = class extends CustomEvent {
  constructor(detail) {
    super("delete", {
      bubbles: true,
      composed: true,
      detail
    });
  }
};
var List = class extends HTMLElement {
  static observedAttributes = ["editable", "deletable", "disable-li-focus"];
  #observer;
  #editable = false;
  #deletable = false;
  #disableListItemFocus;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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
    if (name === "editable") {
      this.editable = isSet;
    } else if (name === "deletable") {
      this.deletable = isSet;
    } else if (name === "disable-li-focus") {
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
    return html`
    <li role='listitem' tabindex=${this.#disableListItemFocus ? "-1" : "0"}>
    <slot name='slot-${index}'></slot>
    <div class='controls-container'>
              <div class='controls-gradient'></div>
              <div class='controls-buttons'>
                ${this.#editable ? html`
            <devtools-button
              title=${i18nString(UIStrings.edit)}
              aria-label=${i18nString(UIStrings.edit)}
              .iconName=${"edit"}
              .jslogContext=${"edit-item"}
              .variant=${"icon"}
              @click=${this.#dispatchEdit.bind(this, index)}
            ></devtools-button>
          ` : nothing}
                ${this.#deletable ? html`
            <devtools-button
              title=${i18nString(UIStrings.remove)}
              aria-label=${i18nString(UIStrings.remove)}
              .iconName=${"bin"}
              .jslogContext=${"remove-item"}
              .variant=${"icon"}
              @click=${this.#dispatchRemove.bind(this, index)}
            ></devtools-button>
          ` : nothing}
              </div>
            </div>
            </li>`;
  }
  #render() {
    if (this.shadowRoot) {
      const items = [...this.children];
      const listData = items.map((item, index) => {
        const slotName = `slot-${index}`;
        if (item.getAttribute("slot") !== slotName) {
          item.setAttribute("slot", slotName);
        }
        return { index, item };
      });
      render(html`
    <style>${list_css_default}</style>
    <ul role='list'>
    ${Directives.repeat(listData, (data) => data.item, (data) => this.createSlottedListItem(data.index))}
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
};
customElements.define("devtools-list", List);
export {
  List_exports as List
};
//# sourceMappingURL=lists.js.map
