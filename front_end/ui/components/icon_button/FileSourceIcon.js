"use strict";
import "./IconButton.js";
import { Directives, html, render } from "../../lit/lit.js";
import fileSourceIconStyles from "./fileSourceIcon.css.js";
const { classMap } = Directives;
export class FileSourceIcon extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #iconType;
  #contentType;
  #hasDotBadge;
  #isDotPurple;
  set data(data) {
    this.#contentType = data.contentType;
    this.#hasDotBadge = data.hasDotBadge;
    this.#isDotPurple = data.isDotPurple;
    this.#iconType = data.iconType;
    this.#render();
  }
  get data() {
    return {
      iconType: this.#iconType,
      contentType: this.#contentType,
      hasDotBadge: this.#hasDotBadge,
      isDotPurple: this.#isDotPurple
    };
  }
  connectedCallback() {
    this.#render();
  }
  #render() {
    const iconClasses = classMap({
      dot: Boolean(this.#hasDotBadge),
      purple: Boolean(this.#hasDotBadge && this.#isDotPurple),
      green: Boolean(this.#hasDotBadge && !this.#isDotPurple),
      ...this.#contentType ? { [this.#contentType]: this.#contentType } : null
    });
    render(
      html`
      <style>${fileSourceIconStyles}</style>
      <devtools-icon .name=${this.#iconType ?? null} class=${iconClasses}></devtools-icon>`,
      this.#shadow,
      { host: this }
    );
  }
}
customElements.define("devtools-file-source-icon", FileSourceIcon);
//# sourceMappingURL=FileSourceIcon.js.map
