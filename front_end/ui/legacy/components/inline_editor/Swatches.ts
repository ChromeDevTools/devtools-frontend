// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../components/icon_button/icon_button.js';

import type * as IconButton from '../../../components/icon_button/icon_button.js';
import {html, render} from '../../../lit/lit.js';

import type {CSSShadowModel} from './CSSShadowEditor.js';
import cssShadowSwatchStyles from './cssShadowSwatch.css.js';

export class CSSShadowSwatch extends HTMLElement {
  readonly #icon: IconButton.Icon.Icon;
  readonly #model: CSSShadowModel;

  constructor(model: CSSShadowModel) {
    super();
    this.#model = model;

    // clang-format off
    render(html`
        <style>${cssShadowSwatchStyles}</style>
        <devtools-icon tabindex=-1 name="shadow" class="shadow-swatch-icon"></devtools-icon>`,
        this, {host: this});
    // clang-format on

    this.#icon = this.querySelector('devtools-icon') as IconButton.Icon.Icon;
  }

  model(): CSSShadowModel {
    return this.#model;
  }

  iconElement(): IconButton.Icon.Icon {
    return this.#icon;
  }
}

customElements.define('css-shadow-swatch', CSSShadowSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'css-shadow-swatch': CSSShadowSwatch;
  }
}
