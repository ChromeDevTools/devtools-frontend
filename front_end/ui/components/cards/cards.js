var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/cards/Card.js
var Card_exports = {};
__export(Card_exports, {
  Card: () => Card
});
import { html, nothing, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/cards/card.css.js
var card_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  max-width: var(--sys-size-35);
  width: 100%;
}

:host([hidden]) {
  display: none;
}

#card {
  break-inside: avoid;
  min-width: var(--sys-size-31);
  margin: var(--sys-size-3) var(--sys-size-6) var(--sys-size-5) var(--sys-size-5);
  flex: 1;

  #heading {
    display: flex;
    white-space: nowrap;
    margin-bottom: var(--sys-size-5);

    [role="heading"] {
      color: var(--sys-color-on-surface);
      font: var(--sys-typescale-body2-medium);
    }

    [name="heading-prefix"]::slotted(*) {
      margin-right: var(--sys-size-3);
    }

    [name="heading-suffix"]::slotted(*) {
      margin-left: auto;
    }
  }

  #content {
    border-radius: var(--sys-shape-corner-small);
    box-shadow: var(--sys-elevation-level2);
    display: flex;
    flex-direction: column;
    background: var(--app-color-card-background);

    &::slotted(*) {
      padding: var(--sys-size-4) var(--sys-size-6);
    }

    &::slotted(*:not(:first-child)) {
      border-top: var(--sys-size-1) solid var(--app-color-card-divider);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./card.css")} */`;

// gen/front_end/ui/components/cards/Card.js
var Card = class extends HTMLElement {
  static observedAttributes = ["heading"];
  #shadow = this.attachShadow({ mode: "open" });
  constructor() {
    super();
    this.#render();
  }
  /**
   * Yields the value of the `"heading"` attribute of this `Card`.
   *
   * @returns the value of the `"heading"` attribute or `null` if the attribute
   *          is absent.
   */
  get heading() {
    return this.getAttribute("heading");
  }
  /**
   * Changes the value of the `"heading"` attribute of this `Card`. If you pass
   * `null`, the `"heading"` attribute will be removed from this element.
   *
   * @param heading the new heading of `null` to unset.
   */
  set heading(heading) {
    if (heading) {
      this.setAttribute("heading", heading);
    } else {
      this.removeAttribute("heading");
    }
  }
  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#render();
    }
  }
  #render() {
    render(html`
        <style>${card_css_default}</style>
        <div id="card">
          <div id="heading">
            <slot name="heading-prefix"></slot>
            <div role="heading" aria-level="2">${this.heading ?? nothing}</div>
            <slot name="heading-suffix"></slot>
          </div>
          <slot id="content"></slot>
        </div>`, this.#shadow, { host: this });
  }
};
customElements.define("devtools-card", Card);
export {
  Card_exports as Card
};
//# sourceMappingURL=cards.js.map
