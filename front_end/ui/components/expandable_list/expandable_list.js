var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/expandable_list/ExpandableList.js
var ExpandableList_exports = {};
__export(ExpandableList_exports, {
  ExpandableList: () => ExpandableList
});
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/expandable_list/expandableList.css.js
var expandableList_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: hidden;
}

div {
  line-height: 1.7em;
}

.arrow-icon-button {
  cursor: pointer;
  padding: 1px 0;
  border: none;
  background: none;
  margin-right: 2px;
}

.arrow-icon {
  display: inline-block;
  mask-image: var(--image-file-triangle-right);
  background-color: var(--icon-default);
  margin-top: 2px;
  height: 14px;
  width: 14px;
  transition: transform 200ms;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.expandable-list-container {
  display: flex;
  margin-top: 4px;
}

.expandable-list-items {
  overflow: hidden;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: var(--sys-size-6);

  &:focus-visible {
    outline: 2px solid var(--sys-color-state-focus-ring);
    outline-offset: 0;
    border-radius: var(--sys-shape-corner-extra-small);
  }
}

button.link {
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*# sourceURL=${import.meta.resolve("./expandableList.css")} */`;

// gen/front_end/ui/components/expandable_list/ExpandableList.js
var { html, Directives: { ifDefined } } = Lit;
var ExpandableList = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #expanded = false;
  #rows = [];
  #title;
  set data(data) {
    this.#rows = data.rows;
    this.#title = data.title;
    this.#render();
  }
  #onArrowClick() {
    this.#expanded = !this.#expanded;
    this.#render();
  }
  #render() {
    if (this.#rows.length < 1) {
      return;
    }
    Lit.render(html`
      <style>${expandableList_css_default}</style>
      <div class="expandable-list-container">
        <div>
          ${this.#rows.length > 1 ? html`
              <button title='${ifDefined(this.#title)}' aria-label='${ifDefined(this.#title)}' aria-expanded=${this.#expanded ? "true" : "false"} @click=${() => this.#onArrowClick()} class="arrow-icon-button">
                <span class="arrow-icon ${this.#expanded ? "expanded" : ""}"
                jslog=${VisualLogging.expand().track({ click: true })}></span>
              </button>
            ` : Lit.nothing}
        </div>
        <div class="expandable-list-items">
          ${this.#rows.filter((_, index) => this.#expanded || index === 0).map((row) => html`
            ${row}
          `)}
        </div>
      </div>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-expandable-list", ExpandableList);
export {
  ExpandableList_exports as ExpandableList
};
//# sourceMappingURL=expandable_list.js.map
