// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import { html, nothing, render } from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import switchStyles from './switch.css.js';
export class SwitchChangeEvent extends Event {
    checked;
    static eventName = 'switchchange';
    constructor(checked) {
        super(SwitchChangeEvent.eventName);
        this.checked = checked;
    }
}
export class Switch extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #checked = false;
    #disabled = false;
    #jslogContext = '';
    #label = '';
    connectedCallback() {
        this.#render();
    }
    set checked(isChecked) {
        this.#checked = isChecked;
        this.#render();
    }
    get checked() {
        return this.#checked;
    }
    set disabled(isDisabled) {
        this.#disabled = isDisabled;
        this.#render();
    }
    get disabled() {
        return this.#disabled;
    }
    get jslogContext() {
        return this.#jslogContext;
    }
    set jslogContext(jslogContext) {
        this.#jslogContext = jslogContext;
        this.#render();
    }
    get label() {
        return this.#label;
    }
    set label(label) {
        this.#label = label;
        this.#render();
    }
    #handleChange = (ev) => {
        this.#checked = ev.target.checked;
        this.dispatchEvent(new SwitchChangeEvent(this.#checked));
    };
    #render() {
        const jslog = this.#jslogContext && VisualLogging.toggle(this.#jslogContext).track({ change: true });
        /* eslint-disable @devtools/inject-checkbox-styles */
        // clang-format off
        render(html `
    <style>${switchStyles}</style>
    <label jslog=${jslog || nothing}>
      <input type="checkbox"
        aria-label=${this.#label || nothing}
        @change=${this.#handleChange}
        ?disabled=${this.#disabled}
        .checked=${this.#checked}
      >
      <span class="slider" @click=${(ev) => ev.stopPropagation()}></span>
    </label>
    `, this.#shadow, { host: this });
        // clang-format on
        /* eslint-enable @devtools/inject-checkbox-styles */
    }
}
customElements.define('devtools-switch', Switch);
//# sourceMappingURL=SwitchImpl.js.map