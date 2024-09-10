// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as IconButton from '../icon_button/icon_button.js';
import * as Input from '../input/input.js';

import settingCheckboxStyles from './settingCheckbox.css.js';
import {SettingDeprecationWarning} from './SettingDeprecationWarning.js';

export interface SettingCheckboxData {
  setting: Common.Settings.Setting<boolean>;
  textOverride?: string;
}

/**
 * A simple checkbox that is backed by a boolean setting.
 */
export class SettingCheckbox extends HTMLElement {
  static readonly litTagName = LitHtml.literal`setting-checkbox`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #setting?: Common.Settings.Setting<boolean>;
  #changeListenerDescriptor?: Common.EventTarget.EventDescriptor;
  #textOverride?: string;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, settingCheckboxStyles];
  }

  set data(data: SettingCheckboxData) {
    if (this.#changeListenerDescriptor && this.#setting) {
      this.#setting.removeChangeListener(this.#changeListenerDescriptor.listener);
    }

    this.#setting = data.setting;
    this.#textOverride = data.textOverride;

    this.#changeListenerDescriptor = this.#setting.addChangeListener(() => {
      this.#render();
    });
    this.#render();
  }

  icon(): LitHtml.TemplateResult|undefined {
    if (!this.#setting) {
      return undefined;
    }

    if (this.#setting.deprecation) {
      return LitHtml.html`<${SettingDeprecationWarning.litTagName} .data=${
          this.#setting.deprecation as Common.Settings.Deprecation}></${SettingDeprecationWarning.litTagName}>`;
    }

    const learnMore = this.#setting.learnMore();
    if (learnMore) {
      const jslog = VisualLogging.link()
                        .track({click: true, keydown: 'Enter|Space'})
                        .context(this.#setting.name + '-documentation');
      return LitHtml.html`<x-link id="learn-more"
                                  href=${learnMore.url}
                                  title=${learnMore.tooltip()}
                                  jslog=${jslog}
                                  tabIndex="0"
                                  class="devtools-link">
                            <${IconButton.Icon.Icon.litTagName} name="help" class="link-icon"></${
          IconButton.Icon.Icon.litTagName}>
                          </x-link>`;
    }

    return undefined;
  }

  #render(): void {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }

    const icon = this.icon();
    const reason = this.#setting.disabledReason() ?
        LitHtml.html`
      <${IconButton.Icon.Icon.litTagName} class="disabled-reason" name="info" title=${
            this.#setting.disabledReason()} @click=${onclick}></${IconButton.Icon.Icon.litTagName}>
    ` :
        LitHtml.nothing;
    LitHtml.render(
        LitHtml.html`
      <p>
        <label>
          <input
            type="checkbox"
            .checked=${this.#setting.disabledReason() ? false : this.#setting.get()}
            ?disabled=${this.#setting.disabled()}
            @change=${this.#checkboxChanged}
            jslog=${VisualLogging.toggle().track({click: true}).context(this.#setting.name)}
            aria-label=${this.#setting.title()}
          />
          ${this.#textOverride || this.#setting.title()}${reason}
        </label>
        ${icon}
      </p>`,
        this.#shadow, {host: this});
  }

  #checkboxChanged(e: Event): void {
    this.#setting?.set((e.target as HTMLInputElement).checked);
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      composed: false,
    }));
  }
}

customElements.define('setting-checkbox', SettingCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'setting-checkbox': SettingCheckbox;
  }
}
