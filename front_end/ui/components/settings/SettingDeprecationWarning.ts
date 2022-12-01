// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as IconButton from '../icon_button/icon_button.js';

import settingDeprecationWarning from './settingDeprecationWarning.css.js';

export class SettingDeprecationWarning extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-setting-deprecation-warning`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [settingDeprecationWarning];
  }

  set data(data: Common.Settings.Deprecation) {
    this.#render(data);
  }

  #render({disabled, warning, experiment}: Common.Settings.Deprecation): void {
    const iconData = {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'};

    const classes = {clickable: false};
    let onclick: (() => void)|undefined;
    if (disabled && experiment) {
      classes.clickable = true;
      onclick = (): void => {
        void Common.Revealer.reveal(experiment);
      };
    }

    LitHtml.render(
        LitHtml.html`<${IconButton.Icon.Icon.litTagName} class=${LitHtml.Directives.classMap(classes)} .data=${
            iconData as
            IconButton.Icon.IconData} title=${warning} @click=${onclick}></${IconButton.Icon.Icon.litTagName}>`,
        this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-setting-deprecation-warning', SettingDeprecationWarning);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-setting-deprecation-warning': SettingDeprecationWarning;
  }
}
