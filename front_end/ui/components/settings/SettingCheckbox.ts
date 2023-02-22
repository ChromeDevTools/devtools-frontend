// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import * as Input from '../input/input.js';
import settingCheckboxStyles from './settingCheckbox.css.js';
import {SettingDeprecationWarning} from './SettingDeprecationWarning.js';

export interface SettingCheckboxData {
  setting: Common.Settings.Setting<boolean>;
  /**
   * If set to true, the checkbox is disabled and not clickable by the user.
   * The checkbox will still reflect the current value of the setting (i.e. checked/unchecked).
   */
  disabled?: boolean;
}

/**
 * A simple checkbox that is backed by a boolean setting.
 */
export class SettingCheckbox extends HTMLElement {
  static readonly litTagName = LitHtml.literal`setting-checkbox`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #setting?: Common.Settings.Setting<boolean>;
  #disabled: boolean = false;
  #changeListenerDescriptor?: Common.EventTarget.EventDescriptor;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, settingCheckboxStyles];
  }

  set data(data: SettingCheckboxData) {
    if (this.#changeListenerDescriptor && this.#setting) {
      this.#setting.removeChangeListener(this.#changeListenerDescriptor.listener);
    }

    this.#setting = data.setting;
    this.#disabled = Boolean(data.disabled);

    this.#changeListenerDescriptor = this.#setting.addChangeListener(() => {
      this.#render();
    });
    this.#render();
  }

  #deprecationIcon(): LitHtml.TemplateResult|undefined {
    if (!this.#setting?.deprecation) {
      return undefined;
    }

    return LitHtml.html`<${SettingDeprecationWarning.litTagName} .data=${
        this.#setting.deprecation as Common.Settings.Deprecation}></${SettingDeprecationWarning.litTagName}>`;
  }

  #render(): void {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }

    const icon = this.#deprecationIcon();
    LitHtml.render(
        LitHtml.html`
      <p>
        <label>
          <input type="checkbox" .checked=${this.#setting.get()} ?disabled=${
            this.#disabled || this.#setting.disabled()} @change=${this.#checkboxChanged} aria-label=${
            this.#setting.title()} /> ${this.#setting.title()}${icon}
        </label>
      </p>`,
        this.#shadow, {host: this});
  }

  #checkboxChanged(e: Event): void {
    this.#setting?.set((e.target as HTMLInputElement).checked);
  }
}

ComponentHelpers.CustomElements.defineComponent('setting-checkbox', SettingCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'setting-checkbox': SettingCheckbox;
  }
}
