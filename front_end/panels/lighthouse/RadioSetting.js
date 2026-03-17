// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
const { ifDefined } = Directives;
export class RadioSetting {
    setting;
    options;
    element;
    radioElements;
    ignoreChangeEvents;
    selectedIndex;
    constructor(options, setting, description) {
        this.setting = setting;
        this.options = options;
        this.element = document.createElement('div');
        UI.ARIAUtils.setDescription(this.element, description);
        UI.ARIAUtils.markAsRadioGroup(this.element);
        this.radioElements = [];
        // clang-format off
        render(html `
        ${this.options.map(option => {
            const tooltip = option.tooltip?.() || description;
            return html `
            <label class="lighthouse-radio">
              <input
                type="radio"
                value=${option.value}
                name=${setting.name}
                @change=${this.valueChanged.bind(this)}
                title=${ifDefined(description ? tooltip : undefined)}
                ${Directives.ref(el => {
                this.radioElements.push(el);
            })}
              />
              <span
                class="lighthouse-radio-text"
               title=${ifDefined(description ? tooltip : undefined)}
                >${option.label()}</span
              >
            </label>
          `;
        })}
      `, this.element);
        // clang-format on
        this.ignoreChangeEvents = false;
        this.selectedIndex = -1;
        setting.addChangeListener(this.settingChanged, this);
        this.settingChanged();
    }
    updateUI() {
        this.ignoreChangeEvents = true;
        if (this.radioElements[this.selectedIndex]) {
            this.radioElements[this.selectedIndex].checked = true;
        }
        this.ignoreChangeEvents = false;
    }
    settingChanged() {
        const value = this.setting.get();
        this.selectedIndex = this.options.findIndex(option => option.value === value);
        this.updateUI();
    }
    valueChanged(_event) {
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
//# sourceMappingURL=RadioSetting.js.map