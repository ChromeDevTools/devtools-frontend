// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export class RadioSetting {
  /**
   * @param {!Array<!{value: string, label: string}>} options
   * @param {!Common.Settings.Setting} setting
   * @param {string} description
   */
  constructor(options, setting, description) {
    this._setting = setting;
    this._options = options;

    this.element = createElement('div');
    this.element.title = description;
    UI.ARIAUtils.setDescription(this.element, description);
    UI.ARIAUtils.markAsRadioGroup(this.element);

    this._radioElements = [];
    for (const option of this._options) {
      const fragment = UI.Fragment.Fragment.build`
        <label $="label" class="lighthouse-radio">
          <input $="input" type="radio" value=${option.value} name=${setting.name}>
          <span class="lighthouse-radio-text">${option.label}</span>
        </label>
      `;

      this.element.appendChild(fragment.element());
      if (option.title) {
        UI.Tooltip.Tooltip.install(fragment.$('label'), option.title);
      }
      const radioElement = fragment.$('input');
      radioElement.addEventListener('change', this._valueChanged.bind(this));
      this._radioElements.push(radioElement);
    }

    this._ignoreChangeEvents = false;
    this._selectedIndex = -1;

    setting.addChangeListener(this._settingChanged, this);
    this._settingChanged();
  }

  _updateUI() {
    this._ignoreChangeEvents = true;
    this._radioElements[this._selectedIndex].checked = true;
    this._ignoreChangeEvents = false;
  }

  _settingChanged() {
    const value = this._setting.get();
    this._selectedIndex = this._options.findIndex(option => option.value === value);
    this._updateUI();
  }

  /**
   * @param {!Event} event
   */
  _valueChanged(event) {
    if (this._ignoreChangeEvents) {
      return;
    }

    const selectedRadio = this._radioElements.find(radio => radio.checked);
    this._setting.set(selectedRadio.value);
  }
}
