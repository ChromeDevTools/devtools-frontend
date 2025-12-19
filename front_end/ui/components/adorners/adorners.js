var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/adorners/Adorner.js
var Adorner_exports = {};
__export(Adorner_exports, {
  Adorner: () => Adorner
});
import { html, render } from "./../../lit/lit.js";
import * as UI from "./../../legacy/legacy.js";

// gen/front_end/ui/components/adorners/adorner.css.js
var adorner_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline-flex;
}

:host(.hidden) {
  display: none;
}

slot {
  display: inline-flex;
  box-sizing: border-box;
  height: 14px;
  line-height: 13px;
  padding: 0 6px;
  font-size: var(--override-adorner-font-size, 8.5px);
  color: var(--override-adorner-text-color, var(--sys-color-primary));
  background-color: var(--override-adorner-background-color, var(--sys-color-cdt-base-container));
  border: 1px solid var(--override-adorner-border-color, var(--sys-color-tonal-outline));
  border-radius: 10px;
  position: relative;

  &:hover::after,
  &:active::before {
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:hover::after {
    background-color: var(--sys-color-state-hover-on-subtle);
  }

  &:active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
  }
}

:host(:focus-visible) slot {
  outline: 2px solid var(--sys-color-state-focus-ring);
  outline-offset: 2px;
  z-index: 999;
}

:host([aria-pressed="true"]) slot {
  color: var(--override-adorner-active-text-color, var(--sys-color-on-primary));
  background-color: var(--override-adorner-active-background-color, var(--sys-color-primary));
  border: 1px solid var(--override-adorner-active-background-color, var(--sys-color-primary));

  &:hover::after {
    background-color: var(--sys-color-state-hover-on-prominent);
  }

  &:active::before {
    background-color: var(--sys-color-state-ripple-primary);
  }
}

::slotted(*) {
  height: 10px;
}

/*# sourceURL=${import.meta.resolve("./adorner.css")} */`;

// gen/front_end/ui/components/adorners/Adorner.js
var Adorner = class extends HTMLElement {
  name = "";
  #shadow = this.attachShadow({ mode: "open" });
  #isToggle = false;
  cloneNode(deep) {
    const node = UI.UIUtils.cloneCustomElement(this, deep);
    node.name = this.name;
    node.#isToggle = this.#isToggle;
    return node;
  }
  connectedCallback() {
    if (!this.getAttribute("aria-label")) {
      this.setAttribute("aria-label", this.name);
    }
    this.#render();
  }
  static observedAttributes = ["active", "toggleable"];
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case "active":
        this.#toggle(newValue === "true");
        break;
      case "toggleable":
        this.#isToggle = newValue === "true";
        this.#toggle(this.getAttribute("active") === "true");
        break;
    }
  }
  isActive() {
    return this.getAttribute("aria-pressed") === "true";
  }
  /**
   * Toggle the active state of the adorner. Optionally pass `true` to force-set
   * an active state; pass `false` to force-set an inactive state.
   */
  #toggle(forceActiveState) {
    if (!this.#isToggle) {
      return;
    }
    const shouldBecomeActive = forceActiveState === void 0 ? !this.isActive() : forceActiveState;
    this.setAttribute("role", "button");
    this.setAttribute("aria-pressed", Boolean(shouldBecomeActive).toString());
  }
  show() {
    this.classList.remove("hidden");
  }
  hide() {
    this.classList.add("hidden");
  }
  #render() {
    render(html`<style>${adorner_css_default}</style><slot></slot>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-adorner", Adorner);
export {
  Adorner_exports as Adorner
};
//# sourceMappingURL=adorners.js.map
