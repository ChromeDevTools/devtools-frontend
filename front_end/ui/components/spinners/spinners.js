var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/spinners/Spinner.js
var Spinner_exports = {};
__export(Spinner_exports, {
  Spinner: () => Spinner
});
import { html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/spinners/spinner.css.js
var spinner_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: hidden;
  width: var(--sys-size-7);
  height: var(--sys-size-7);
  display: inline-block;
  font-size: 0;
  letter-spacing: 0;
  white-space: nowrap;
}

:host([active]) {
  animation: spinner-container-animation 1.5s linear infinite;
}

.indeterminate-spinner {
  /*
  * The value for animation duration has been obtained by plugging in values defined
  * in packages/mdc-circular-progress/_circular-progress-theme.scss to
  * functions defined in packages/mdc-circular-progress/_circular-progress.scss.
  * https://github.com/material-components/material-components-web
  */
  animation: indeterminate-spinner-animation 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
  height: 100%;
  width: 100%;

  .left-circle {
    height: 100%;
    width: 50%;
    display: inline-block;
    position: relative;
    overflow: hidden;

    & > svg {
      position: absolute;
      width: 200%;
      /*
      * The value for animation duration has been obtained from values defined
      * in packages/mdc-circular-progress/_circular-progress-theme.scss
      * https://github.com/material-components/material-components-web
      */
      animation: indeterminate-left-circle-spinner-animation 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
    }
  }

  .center-circle {
    height: 100%;
    width: 5%;
    display: inline-block;
    position: absolute;
    overflow: hidden;
    top: 0;
    left: 47.5%;
    box-sizing: border-box;

    & > svg {
      position: absolute;
      width: 2000%;
      left: -900%;
      transform: rotate(180deg);
    }
  }

  .right-circle {
    height: 100%;
    width: 50%;
    display: inline-block;
    position: relative;
    overflow: hidden;

    & > svg {
      position: absolute;
      width: 200%;
      left: -100%;
      /*
      * The value for animation duration has been obtained from values defined
      * in packages/mdc-circular-progress/_circular-progress-theme.scss
      * https://github.com/material-components/material-components-web
      */
      animation: indeterminate-right-circle-spinner-animation 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
    }
  }
}

.inactive-spinner circle {
  stroke: var(--sys-color-state-disabled);
  stroke-width: var(--sys-size-6);
  fill: transparent;
}

.indeterminate-spinner circle {
  stroke: var(--sys-color-primary);
  stroke-width: var(--sys-size-6);
  fill: transparent;
  stroke-dasharray: 290px;
  stroke-dashoffset: 150px;
}

@keyframes spinner-container-animation {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes indeterminate-spinner-animation {
  12.5% {
    transform: rotate(135deg);
  }

  25% {
    transform: rotate(270deg);
  }

  37.5% {
    transform: rotate(405deg);
  }

  50% {
    transform: rotate(540deg);
  }

  62.5% {
    transform: rotate(675deg);
  }

  75% {
    transform: rotate(810deg);
  }

  87.5% {
    transform: rotate(945deg);
  }

  100% {
    transform: rotate(1080deg);
  }
}

@keyframes indeterminate-left-circle-spinner-animation {
  0% {
    transform: rotate(265deg);
  }

  50% {
    transform: rotate(130deg);
  }

  100% {
    transform: rotate(265deg);
  }
}

@keyframes indeterminate-right-circle-spinner-animation {
  0% {
    transform: rotate(-265deg);
  }

  50% {
    transform: rotate(-130deg);
  }

  100% {
    transform: rotate(-265deg);
  }
}

/*# sourceURL=${import.meta.resolve("./spinner.css")} */`;

// gen/front_end/ui/components/spinners/Spinner.js
var Spinner = class extends HTMLElement {
  static observedAttributes = ["active"];
  #shadow = this.attachShadow({ mode: "open" });
  constructor(props) {
    super();
    this.active = props?.active ?? true;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    if (name === "active") {
      this.#render();
    }
  }
  /**
   * Returns whether the spinner is active or not.
   */
  get active() {
    return this.hasAttribute("active");
  }
  /**
   * Sets the `"active"` attribute for the spinner.
   */
  set active(active) {
    this.toggleAttribute("active", active);
  }
  connectedCallback() {
    this.#render();
  }
  #render() {
    const content = this.active ? html`
      <div class="indeterminate-spinner">
        <div class="left-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
        <div class="center-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
        <div class="right-circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
      </div>
    ` : html`
      <div class="inactive-spinner">
        <svg viewBox="0 0 100 100">
          <circle cx="50%" cy="50%" r="2.75rem"></circle>
        </svg>
      </div>
    `;
    render(html`
      <style>
        ${spinner_css_default}
      </style>
      ${content}
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-spinner", Spinner);
export {
  Spinner_exports as Spinner
};
//# sourceMappingURL=spinners.js.map
