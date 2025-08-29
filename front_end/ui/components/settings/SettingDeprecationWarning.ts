// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../icon_button/icon_button.js';

import * as Common from '../../../core/common/common.js';
import * as Lit from '../../lit/lit.js';

import settingDeprecationWarningStyles from './settingDeprecationWarning.css.js';

const {html} = Lit;

export class SettingDeprecationWarning extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  set data(data: Common.Settings.Deprecation) {
    this.#render(data);
  }

  #render({disabled, warning, experiment}: Common.Settings.Deprecation): void {
    const classes = {clickable: false, medium: true};
    let onclick: (() => void)|undefined;
    if (disabled && experiment) {
      classes.clickable = true;
      onclick = () => {
        void Common.Revealer.reveal(experiment);
      };
    }

    Lit.render(
        html`
        <style>${settingDeprecationWarningStyles}</style>
        <devtools-icon class=${Lit.Directives.classMap(classes)} name="info" title=${warning} @click=${
            onclick}></devtools-icon>`,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-setting-deprecation-warning', SettingDeprecationWarning);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-setting-deprecation-warning': SettingDeprecationWarning;
  }
}
