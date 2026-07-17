// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import { Directives, html, render } from '../../lit/lit.js';
import spinnerStyles from './spinner.css.js';
const { classMap } = Directives;
export class Spinner extends HTMLElement {
    static observedAttributes = ['active'];
    #shadow = this.attachShadow({ mode: 'open' });
    constructor(props) {
        super();
        this.active = props?.active ?? true;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        if (name === 'active') {
            this.#render();
        }
    }
    /**
     * Returns whether the spinner is active or not.
     */
    get active() {
        return this.hasAttribute('active');
    }
    /**
     * Sets the `"active"` attribute for the spinner.
     */
    set active(active) {
        this.toggleAttribute('active', active);
    }
    connectedCallback() {
        this.#render();
    }
    #render() {
        // The radius is set to 40 to allow for stroke width padding, and
        // pathLength=100 is used for scalable, unitless animation length.
        // clang-format off
        const spinnerClasses = {
            indeterminate: this.active,
            spinner: true,
        };
        render(html `
        <style>
          ${spinnerStyles}
        </style>
        <svg
          class=${classMap(spinnerClasses)}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            pathLength="100"
          ></circle>
        </svg>
      `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-spinner', Spinner);
//# sourceMappingURL=Spinner.js.map