// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import type {AdornerSettingsMap} from './AdornerManager.js';
import adornerSettingsPaneStyles from './adornerSettingsPane.css.js';

const UIStrings = {
  /**
   * @description Title of a list of settings to toggle badges.
   */
  settingsTitle: 'Show badges',
  /**
   * @description ARIA label of the button to close the badge settings pane
   */
  closeButton: 'Close',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/AdornerSettingsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

export class AdornerSettingUpdatedEvent extends Event {
  static readonly eventName = 'adornersettingupdated';
  data: {
    adornerName: string,
    isEnabledNow: boolean,
    newSettings: AdornerSettingsMap,
  };

  constructor(adornerName: string, isEnabledNow: boolean, newSettings: AdornerSettingsMap) {
    super(AdornerSettingUpdatedEvent.eventName, {});
    this.data = {adornerName, isEnabledNow, newSettings};
  }
}

export interface AdornerSettingsPaneData {
  settings: Readonly<AdornerSettingsMap>;
}

export class AdornerSettingsPane extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #settings: AdornerSettingsMap = new Map();

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, adornerSettingsPaneStyles];
  }

  set data(data: AdornerSettingsPaneData) {
    this.#settings = new Map(data.settings.entries());
    this.#render();
  }

  show(): void {
    this.classList.remove('hidden');
    const settingsPane = this.#shadow.querySelector<HTMLElement>('.adorner-settings-pane');
    if (settingsPane) {
      settingsPane.focus();
    }
  }

  hide(): void {
    this.classList.add('hidden');
  }

  #onChange(ev: Event): void {
    const inputEl = ev.target as HTMLInputElement;
    const adorner = inputEl.dataset.adorner;
    if (adorner === undefined) {
      return;
    }
    const isEnabledNow = inputEl.checked;
    this.#settings.set(adorner, isEnabledNow);
    this.dispatchEvent(new AdornerSettingUpdatedEvent(adorner, isEnabledNow, this.#settings));
    this.#render();
  }

  #render(): void {
    const settingTemplates = [];
    for (const [adorner, isEnabled] of this.#settings) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      settingTemplates.push(html`
        <label class="setting" title=${adorner}>
          <input
            class="adorner-status"
            type="checkbox" name=${adorner}
            .checked=${isEnabled}
            jslog=${VisualLogging.toggle(adorner).track({change: true})}
            data-adorner=${adorner}>
          <span class="adorner-name">${adorner}</span>
        </label>
      `);
      // clang-format on
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="adorner-settings-pane" tabindex="-1" jslog=${VisualLogging.pane('adorner-settings')}>
        <div class="settings-title">${i18nString(UIStrings.settingsTitle)}</div>
        <div class="setting-list" @change=${this.#onChange}>
          ${settingTemplates}
        </div>
        <devtools-button aria-label=${i18nString(UIStrings.closeButton)}
                                             .iconName=${'cross'}
                                             .size=${Buttons.Button.Size.SMALL}
                                             .title=${i18nString(UIStrings.closeButton)}
                                             .variant=${Buttons.Button.Variant.ICON}
                                             jslog=${VisualLogging.close().track({click: true})}
                                             @click=${this.hide}></devtools-button>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-adorner-settings-pane', AdornerSettingsPane);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-adorner-settings-pane': AdornerSettingsPane;
  }
}
