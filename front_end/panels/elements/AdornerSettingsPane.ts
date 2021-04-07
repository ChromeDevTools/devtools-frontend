// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';

import {AdornerSettingsMap} from './AdornerManager.js';

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
const str_ = i18n.i18n.registerUIStrings('panels/elements/AdornerSettingsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

export class AdornerSettingUpdatedEvent extends Event {
  data: {
    adornerName: string,
    isEnabledNow: boolean,
    newSettings: AdornerSettingsMap,
  };

  constructor(adornerName: string, isEnabledNow: boolean, newSettings: AdornerSettingsMap) {
    super('adorner-setting-updated', {});
    this.data = {adornerName, isEnabledNow, newSettings};
  }
}

export interface AdornerSettingsPaneData {
  settings: Readonly<AdornerSettingsMap>;
}

export class AdornerSettingsPane extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private settings: AdornerSettingsMap = new Map();

  set data(data: AdornerSettingsPaneData) {
    this.settings = new Map(data.settings.entries());
    this.render();
  }

  show(): void {
    this.classList.remove('hidden');
    const settingsPane = this.shadow.querySelector<HTMLElement>('.adorner-settings-pane');
    if (settingsPane) {
      settingsPane.focus();
    }
  }

  hide(): void {
    this.classList.add('hidden');
  }

  private onChange(ev: Event): void {
    const inputEl = ev.target as HTMLInputElement;
    const adorner = inputEl.dataset.adorner;
    if (adorner === undefined) {
      return;
    }
    const isEnabledNow = inputEl.checked;
    this.settings.set(adorner, isEnabledNow);
    this.dispatchEvent(new AdornerSettingUpdatedEvent(adorner, isEnabledNow, this.settings));
    this.render();
  }

  private render(): void {
    const settingTemplates = [];
    for (const [adorner, isEnabled] of this.settings) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      settingTemplates.push(html`
        <label class="setting" title=${adorner}>
          <input
            class="adorner-status"
            type="checkbox" name=${adorner}
            .checked=${isEnabled}
            data-adorner=${adorner}>
          <span class="adorner-name">${adorner}</span>
        </label>
      `);
      // clang-format on
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .adorner-settings-pane {
          display: flex;
          height: 2.67em;
          padding: 0 12px;
          color: var(--color-text-primary);
          font-size: 12px;
          align-items: center;
        }

        .settings-title {
          font-weight: 500;
        }

        .setting {
          margin-left: 1em;
        }

        .adorner-status {
          margin: auto 0.4em auto 0;
        }

        .adorner-status,
        .adorner-name {
          vertical-align: middle;
        }

        .close {
          position: relative;
          margin-left: auto;
          font-size: 1em;
          width: 1.5em;
          height: 1.5em;
          border: none;
          border-radius: 50%;
          background-color: var(--color-background-elevation-1);
          cursor: pointer;
        }

        .close::before,
        .close::after {
          content: '';
          display: inline-block;
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          margin: auto;
          width: 1em;
          height: 0.2em;
          background-color: var(--color-text-secondary);
          border-radius: 2px;
        }

        .close::before {
          transform: rotate(45deg);
        }

        .close::after {
          transform: rotate(-45deg);
        }
      </style>

      <div class="adorner-settings-pane" tabindex="-1">
        <div class="settings-title">${i18nString(UIStrings.settingsTitle)}</div>
        <div class="setting-list" @change=${this.onChange}>
          ${settingTemplates}
        </div>
        <button class="close" @click=${this.hide} aria-label=${i18nString(UIStrings.closeButton)}></button>
      </div>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

if (!customElements.get('devtools-adorner-settings-pane')) {
  customElements.define('devtools-adorner-settings-pane', AdornerSettingsPane);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-adorner-settings-pane': AdornerSettingsPane;
  }
}
