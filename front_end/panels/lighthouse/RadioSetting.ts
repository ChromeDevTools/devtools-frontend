// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

const {ifDefined} = Directives;
interface RadioOption {
  value: string;
  label: () => Common.UIString.LocalizedString;
  tooltip?: () => Common.UIString.LocalizedString;
}

export class RadioSetting {
  private readonly setting: Common.Settings.Setting<string>;
  private options: RadioOption[];
  element: HTMLDivElement;
  private radioElements: HTMLInputElement[];
  private ignoreChangeEvents: boolean;
  private selectedIndex: number;
  constructor(options: RadioOption[], setting: Common.Settings.Setting<string>, description: string) {
    this.setting = setting;
    this.options = options;

    this.element = document.createElement('div');
    UI.ARIAUtils.setDescription(this.element, description);
    UI.ARIAUtils.markAsRadioGroup(this.element);

    this.radioElements = [];
    // clang-format off
    render(
      html`
        ${this.options.map(option => {
          const tooltip = option.tooltip?.() || description;
          return html`
            <label class="lighthouse-radio">
              <input
                type="radio"
                value=${option.value}
                name=${setting.name}
                @change=${this.valueChanged.bind(this)}
                title=${ifDefined(description ? tooltip : undefined)}
                ${Directives.ref(el => {
                    this.radioElements.push(el as HTMLInputElement);
                  }
                )}
              />
              <span
                class="lighthouse-radio-text"
               title=${ifDefined(description ? tooltip : undefined)}
                >${option.label()}</span
              >
            </label>
          `;
        })}
      `,
      this.element,
    );
    // clang-format on

    this.ignoreChangeEvents = false;
    this.selectedIndex = -1;

    setting.addChangeListener(this.settingChanged, this);
    this.settingChanged();
  }

  private updateUI(): void {
    this.ignoreChangeEvents = true;
    if (this.radioElements[this.selectedIndex]) {
      this.radioElements[this.selectedIndex].checked = true;
    }
    this.ignoreChangeEvents = false;
  }

  private settingChanged(): void {
    const value = this.setting.get();
    this.selectedIndex = this.options.findIndex(option => option.value === value);
    this.updateUI();
  }

  private valueChanged(_event: Event): void {
    if (this.ignoreChangeEvents) {
      return;
    }

    const selectedRadio = this.radioElements.find(radio => radio.checked);
    if (!selectedRadio) {
      return;
    }
    this.setting.set(selectedRadio.value);
  }
}
