// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../icon_button/icon_button.js';
import * as Common from '../../../core/common/common.js';
import * as Lit from '../../lit/lit.js';
import settingDeprecationWarningStyles from './settingDeprecationWarning.css.js';
const { html } = Lit;
export class SettingDeprecationWarning extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    set data(data) {
        this.#render(data);
    }
    #render({ disabled, warning, experiment }) {
        const classes = { clickable: false, medium: true };
        let onclick;
        if (disabled && experiment) {
            classes.clickable = true;
            onclick = () => {
                void Common.Revealer.reveal(experiment);
            };
        }
        Lit.render(html `
        <style>${settingDeprecationWarningStyles}</style>
        <devtools-icon class=${Lit.Directives.classMap(classes)} name="info" title=${warning} @click=${onclick}></devtools-icon>`, this.#shadow, { host: this });
    }
}
customElements.define('devtools-setting-deprecation-warning', SettingDeprecationWarning);
//# sourceMappingURL=SettingDeprecationWarning.js.map