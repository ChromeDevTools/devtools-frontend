// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */

import '../tooltips/tooltips.js';
import '../../kit/kit.js';

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Lit from '../../lit/lit.js';
import * as SettingUIRegistration from '../../settings/settings.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as Buttons from '../buttons/buttons.js';
import * as Input from '../input/input.js';

import settingCheckboxStyles from './settingCheckbox.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Text that is usually a hyperlink to more documentation.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/components/settings/SettingCheckbox.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SettingCheckboxData {
  setting: Common.Settings.Setting<boolean>;
  textOverride?: string;
  disabled?: boolean;
}

/**
 * A simple checkbox that is backed by a boolean setting.
 */
export class SettingCheckbox extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #setting?: Common.Settings.Setting<boolean>;
  #changeListenerDescriptor?: Common.EventTarget.EventDescriptor;
  #textOverride?: string;
  #disabled?: boolean;

  set data(data: SettingCheckboxData) {
    if (this.#changeListenerDescriptor && this.#setting) {
      this.#setting.removeChangeListener(this.#changeListenerDescriptor.listener);
    }

    this.#setting = data.setting;
    this.#textOverride = data.textOverride;
    this.#disabled = data.disabled;

    this.#changeListenerDescriptor = this.#setting.addChangeListener(() => {
      this.#render();
    });
    this.#render();
  }

  icon(): Lit.TemplateResult|undefined {
    if (!this.#setting) {
      return undefined;
    }

    const uiDescriptor = SettingUIRegistration.SettingUIRegistration.maybeResolve(this.#setting.descriptor());
    const learnMore = uiDescriptor?.learnMore;
    if (learnMore) {
      const jsLogContext = `${this.#setting.name}-documentation`;
      const data: Buttons.Button.ButtonData = {
        iconName: 'info',
        variant: Buttons.Button.Variant.ICON,
        size: Buttons.Button.Size.SMALL,
        jslogContext: jsLogContext,
      };

      const url = learnMore.url;
      if (learnMore.tooltip) {
        const id = `${this.#setting.name}-information`;
        // clang-format off
        return html`
          <devtools-button
            class="info-icon"
            aria-details=${id}
            aria-disabled=true
            accessibleLabel=${learnMore.tooltip()}
            .data=${data}
          ></devtools-button>
          <devtools-tooltip id=${id} variant="rich">
            <span>${learnMore.tooltip()}</span><br />
            ${url
              ? html`<devtools-link
                  href=${url}
                  class="link"
                  .jslogContext=${jsLogContext}
                  >${i18nString(UIStrings.learnMore)}</devtools-link
                >`
              : Lit.nothing}
          </devtools-tooltip>
        `;
        // clang-format on
      }
      if (url) {
        const handleClick = (event: MouseEvent): void => {
          Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
          event.consume();
        };
        data.iconName = 'help';
        data.title = i18nString(UIStrings.learnMore);
        // clang-format off
        return html`<devtools-button
          class="info-icon"
          @click=${handleClick}
          .data=${data}
        ></devtools-button>`;
        // clang-format on
      }
    }

    return undefined;
  }

  get checked(): boolean {
    if (!this.#setting) {
      return false;
    }

    return this.#setting.get();
  }

  #render(): void {
    if (!this.#setting) {
      throw new Error('No "Setting" object provided for rendering');
    }

    const uiDescriptor = SettingUIRegistration.SettingUIRegistration.maybeResolve(this.#setting.descriptor());
    const learnMore = uiDescriptor?.learnMore;
    const titleText = uiDescriptor?.title ?? '';

    const icon = this.icon();
    const title = learnMore?.tooltip?.() ?? '';
    Lit.render(html`
      <style>${Input.checkboxStyles}</style>
      <style>${settingCheckboxStyles}</style>
      <p>
        <label title=${title}>
          <input
            type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.#disabled}
            @change=${this.#checkboxChanged}
            jslog=${VisualLogging.toggle().track({change: true}).context(this.#setting.name)}
            aria-label=${titleText}
          />
          ${this.#textOverride || titleText}
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

// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('setting-checkbox', SettingCheckbox);

declare global {
  interface HTMLElementTagNameMap {
    'setting-checkbox': SettingCheckbox;
  }
}
