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
import * as VisualElements from "./../../visual_logging/visual_logging.js";

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
  #ariaLabelDefault;
  #ariaLabelActive;
  #content;
  #jslogContext;
  set data(data) {
    this.name = data.name;
    this.#jslogContext = data.jslogContext;
    if (data.content) {
      this.#content?.remove();
      this.append(data.content);
      this.#content = data.content;
    }
    this.#render();
  }
  cloneNode(deep) {
    const node = UI.UIUtils.cloneCustomElement(this, deep);
    node.data = { name: this.name, content: this.#content, jslogContext: this.#jslogContext };
    return node;
  }
  connectedCallback() {
    if (!this.getAttribute("aria-label")) {
      this.setAttribute("aria-label", this.name);
    }
    if (this.#jslogContext && !this.getAttribute("jslog")) {
      this.setAttribute("jslog", `${VisualElements.adorner(this.#jslogContext)}`);
    }
    this.#render();
  }
  isActive() {
    return this.getAttribute("aria-pressed") === "true";
  }
  /**
   * Toggle the active state of the adorner. Optionally pass `true` to force-set
   * an active state; pass `false` to force-set an inactive state.
   */
  toggle(forceActiveState) {
    if (!this.#isToggle) {
      return;
    }
    const shouldBecomeActive = forceActiveState === void 0 ? !this.isActive() : forceActiveState;
    this.setAttribute("aria-pressed", Boolean(shouldBecomeActive).toString());
    this.setAttribute("aria-label", (shouldBecomeActive ? this.#ariaLabelActive : this.#ariaLabelDefault) || this.name);
  }
  show() {
    this.classList.remove("hidden");
  }
  hide() {
    this.classList.add("hidden");
  }
  /**
   * Make adorner interactive by responding to click events with the provided action
   * and simulating ARIA-capable toggle button behavior.
   */
  addInteraction(action, options) {
    const { isToggle = false, shouldPropagateOnKeydown = false, ariaLabelDefault, ariaLabelActive } = options;
    this.#isToggle = isToggle;
    this.#ariaLabelDefault = ariaLabelDefault;
    this.#ariaLabelActive = ariaLabelActive;
    this.setAttribute("aria-label", ariaLabelDefault);
    if (this.#jslogContext) {
      this.setAttribute("jslog", `${VisualElements.adorner(this.#jslogContext).track({ click: true })}`);
    }
    if (isToggle) {
      this.addEventListener("click", () => {
        this.toggle();
      });
      this.toggle(
        false
        /* initialize inactive state */
      );
    }
    this.addEventListener("click", action);
    this.classList.add("clickable");
    this.setAttribute("role", "button");
    this.tabIndex = 0;
    this.addEventListener("keydown", (event) => {
      if (event.code === "Enter" || event.code === "Space") {
        this.click();
        if (!shouldPropagateOnKeydown) {
          event.stopPropagation();
        }
      }
    });
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
