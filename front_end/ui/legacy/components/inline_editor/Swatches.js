// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../kit/kit.js';
import { Directives, html, render } from '../../../lit/lit.js';
import cssShadowSwatchStyles from './cssShadowSwatch.css.js';
export class CSSShadowSwatch extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #icon;
    #model;
    constructor(model) {
        super();
        this.#model = model;
        const icon = Directives.createRef();
        // clang-format off
        render(html `
        <style>${cssShadowSwatchStyles}</style>
        <devtools-icon ${Directives.ref(icon)} tabindex=-1 name="shadow" class="shadow-swatch-icon"></devtools-icon>`, this.#shadow, { host: this });
        // clang-format on
        this.#icon = icon.value;
    }
    model() {
        return this.cssShadowModel;
    }
    get cssShadowModel() {
        if (!this.#model) {
            throw new Error('No model set on CSSShadowSwatch');
        }
        return this.#model;
    }
    set cssShadowModel(model) {
        this.#model = model;
    }
    iconElement() {
        return this.#icon;
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('css-shadow-swatch', CSSShadowSwatch);
//# sourceMappingURL=Swatches.js.map