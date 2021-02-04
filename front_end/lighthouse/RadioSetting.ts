// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export class RadioSetting {
  _setting: Common.Settings.Setting<string>;
  _options: {value: string, label: string}[];
  element: HTMLDivElement;
  _radioElements: HTMLInputElement[];
  _ignoreChangeEvents: boolean;
  _selectedIndex: number;
  constructor(
      options: {value: string, label: string}[], setting: Common.Settings.Setting<string>, description: string) {
    this._setting = setting;
    this._options = options;

    this.element = document.createElement('div');
    UI.ARIAUtils.setDescription(this.element, description);
    UI.ARIAUtils.markAsRadioGroup(this.element);

    this._radioElements = [];
    for (const option of this._options) {
      const fragment = UI.Fragment.Fragment.build`
  <label $="label" class="lighthouse-radio">
  <input $="input" type="radio" value=${option.value} name=${setting.name}>
  <span $="span" class="lighthouse-radio-text">${option.label}</span>
  </label>
  `;

      this.element.appendChild(fragment.element());
      if (description) {
        UI.Tooltip.Tooltip.install(fragment.$('input'), description);
        UI.Tooltip.Tooltip.install(fragment.$('span'), description);
      }
      const radioElement = fragment.$('input') as HTMLInputElement;
      radioElement.addEventListener('change', this._valueChanged.bind(this));
      this._radioElements.push(radioElement);
    }

    this._ignoreChangeEvents = false;
    this._selectedIndex = -1;

    setting.addChangeListener(this._settingChanged, this);
    this._settingChanged();
  }

  _updateUI(): void {
    this._ignoreChangeEvents = true;
    this._radioElements[this._selectedIndex].checked = true;
    this._ignoreChangeEvents = false;
  }

  _settingChanged(): void {
    const value = this._setting.get();
    this._selectedIndex = this._options.findIndex(option => option.value === value);
    this._updateUI();
  }

  _valueChanged(_event: Event): void {
    if (this._ignoreChangeEvents) {
      return;
    }

    const selectedRadio = this._radioElements.find(radio => radio.checked);
    if (!selectedRadio) {
      return;
    }
    this._setting.set(selectedRadio.value);
  }
}
