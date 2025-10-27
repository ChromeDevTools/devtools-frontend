"use strict";
import "./Icon.js";
import * as Lit from "../../lit/lit.js";
import iconButtonStyles from "./iconButton.css.js";
const { html } = Lit;
export class IconButton extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #clickHandler = void 0;
  #groups = [];
  #compact = false;
  #leadingText = "";
  #trailingText = "";
  #accessibleName;
  set data(data) {
    this.#groups = data.groups.map((group) => ({ ...group }));
    this.#clickHandler = data.clickHandler;
    this.#trailingText = data.trailingText ?? "";
    this.#leadingText = data.leadingText ?? "";
    this.#accessibleName = data.accessibleName;
    this.#compact = Boolean(data.compact);
    this.#render();
  }
  get data() {
    return {
      groups: this.#groups.map((group) => ({ ...group })),
      // Ensure we make a deep copy.
      accessibleName: this.#accessibleName,
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      trailingText: this.#trailingText,
      compact: this.#compact
    };
  }
  #onClickHandler(event) {
    if (this.#clickHandler) {
      event.preventDefault();
      this.#clickHandler();
    }
  }
  #render() {
    const buttonClasses = Lit.Directives.classMap({
      "icon-button": true,
      "with-click-handler": Boolean(this.#clickHandler),
      compact: this.#compact
    });
    const filteredGroups = this.#groups.filter((counter) => counter.text !== void 0).filter((_, index) => this.#compact ? index === 0 : true);
    Lit.render(html`
      <style>${iconButtonStyles}</style>
      <button class=${buttonClasses} @click=${this.#onClickHandler} aria-label=${Lit.Directives.ifDefined(this.#accessibleName)}>
      ${!this.#compact && this.#leadingText ? html`<span class="icon-button-title">${this.#leadingText}</span>` : Lit.nothing}
      ${filteredGroups.map(
      (counter) => html`
      <devtools-icon class="status-icon" name=${counter.iconName} style="color: ${counter.iconColor}; width: ${counter.iconWidth || "var(--sys-size-7)"}; height: ${counter.iconHeight || "var(--sys-size-7)"}">
      </devtools-icon>
      ${this.#compact ? html`<!-- Force line-height for this element --><span>&#8203;</span>` : Lit.nothing}
      <span class="icon-button-title">${counter.text}</span>`
    )}
      </button>
      ${!this.#compact && this.#trailingText ? html`<span class="icon-button-title">${this.#trailingText}</span>` : Lit.nothing}
    `, this.#shadow, { host: this });
  }
}
customElements.define("icon-button", IconButton);
//# sourceMappingURL=IconButton.js.map
