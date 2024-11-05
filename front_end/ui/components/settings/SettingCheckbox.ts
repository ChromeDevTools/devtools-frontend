// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './SettingDeprecationWarning.js';

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as Buttons from '../buttons/buttons.js';
import * as Input from '../input/input.js';

import settingCheckboxStyles from './settingCheckbox.css.js';

const {html, Directives: {ifDefined}} = LitHtml;

const UIStrings = {
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/settings/SettingCheckbox.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SettingCheckboxData {
  setting: Common.Settings.Setting<boolean>;
  textOverride?: string;
}

/**
 * A simple checkbox that is backed by a boolean setting.
 */
export class SettingCheckbox extends HTMLElement {
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
      return html`<devtools-setting-deprecation-warning .data=${
          this.#setting.deprecation}></devtools-setting-deprecation-warning>`;
    }

    const learnMore = this.#setting.learnMore();
    if (learnMore && learnMore.url) {
      const url = learnMore.url;
      const data: Buttons.Button.ButtonData = {
        iconName: 'help',
        variant: Buttons.Button.Variant.ICON,
        size: Buttons.Button.Size.SMALL,
        jslogContext: `${this.#setting.name}-documentation`,
        title: i18nString(UIStrings.learnMore),
      };
      const handleClick = (event: MouseEvent): void => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
        event.consume();
      };
      return html`<devtools-button
                    class=learn-more
                    @click=${handleClick}
                    .data=${data}></devtools-button>`;
    }

    return undefined;
  }

  #render(): void {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }

    const icon = this.icon();
    const title = `${this.#setting.learnMore() ? this.#setting.learnMore()?.tooltip() : ''}`;
    const reason = this.#setting.disabledReason() ?
        html`
      <devtools-button class="disabled-reason" .iconName=${'info'} .variant=${Buttons.Button.Variant.ICON} .size=${
            Buttons.Button.Size.SMALL} title=${ifDefined(this.#setting.disabledReason())} @click=${
            onclick}></devtools-button>
    ` :
        LitHtml.nothing;
    LitHtml.render(
        html`
      <p>
        <label title=${title}>
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
