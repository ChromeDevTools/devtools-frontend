// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';

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
    for (const option of this.options) {
      const fragment = UI.Fragment.Fragment.build`
  <label $="label" class="lighthouse-radio">
  <input $="input" type="radio" value=${option.value} name=${setting.name}>
  <span $="span" class="lighthouse-radio-text">${option.label()}</span>
  </label>
  `;

      this.element.appendChild(fragment.element());

      const tooltip = option.tooltip?.() || description;
      if (description) {
        UI.Tooltip.Tooltip.install(fragment.$('input') as HTMLElement, tooltip);
        UI.Tooltip.Tooltip.install(fragment.$('span') as HTMLElement, tooltip);
      }
      const radioElement = fragment.$('input') as HTMLInputElement;
      radioElement.addEventListener('change', this.valueChanged.bind(this));
      this.radioElements.push(radioElement);
    }

    this.ignoreChangeEvents = false;
    this.selectedIndex = -1;

    setting.addChangeListener(this.settingChanged, this);
    this.settingChanged();
  }

  private updateUI(): void {
    this.ignoreChangeEvents = true;
    this.radioElements[this.selectedIndex].checked = true;
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
