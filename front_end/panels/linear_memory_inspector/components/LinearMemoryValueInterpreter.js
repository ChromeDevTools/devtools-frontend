// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import linearMemoryValueInterpreterStyles from './linearMemoryValueInterpreter.css.js';
import { ValueInterpreterDisplay } from './ValueInterpreterDisplay.js';
import { ValueInterpreterSettings } from './ValueInterpreterSettings.js';
const UIStrings = {
    /**
     * @description Tooltip text that appears when hovering over the gear button to open and close settings in the Linear memory inspector. These settings
     *             allow the user to change the value type to view, such as 32-bit Integer, or 32-bit Float.
     */
    toggleValueTypeSettings: 'Toggle value type settings',
    /**
     * @description Tooltip text that appears when hovering over the 'Little Endian' or 'Big Endian' setting in the Linear memory inspector.
     */
    changeEndianness: 'Change `Endianness`',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
const { widgetConfig } = UI.Widget;
export class LinearMemoryValueInterpreter extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #onValueTypeModeChange = () => { };
    #onJumpToAddressClicked = () => { };
    #onEndiannessChanged = () => { };
    #onValueTypeToggled = () => { };
    #endianness = "Little Endian" /* Endianness.LITTLE */;
    #buffer = new ArrayBuffer(0);
    #valueTypes = new Set();
    #valueTypeModeConfig = new Map();
    #memoryLength = 0;
    #showSettings = false;
    set data(data) {
        this.#endianness = data.endianness;
        this.#buffer = data.value;
        this.#valueTypes = data.valueTypes;
        this.#valueTypeModeConfig = data.valueTypeModes || new Map();
        this.#memoryLength = data.memoryLength;
        this.#onValueTypeModeChange = data.onValueTypeModeChange;
        this.#onJumpToAddressClicked = data.onJumpToAddressClicked;
        this.#onEndiannessChanged = data.onEndiannessChanged;
        this.#onValueTypeToggled = data.onValueTypeToggled;
        this.#render();
    }
    get onValueTypeModeChange() {
        return this.#onValueTypeModeChange;
    }
    set onValueTypeModeChange(value) {
        this.#onValueTypeModeChange = value;
        this.#render();
    }
    get onJumpToAddressClicked() {
        return this.#onJumpToAddressClicked;
    }
    set onJumpToAddressClicked(value) {
        this.#onJumpToAddressClicked = value;
        this.#render();
    }
    get onEndiannessChanged() {
        return this.#onEndiannessChanged;
    }
    set onEndiannessChanged(value) {
        this.#onEndiannessChanged = value;
        this.#render();
    }
    get onValueTypeToggled() {
        return this.#onValueTypeToggled;
    }
    set onValueTypeToggled(value) {
        this.#onValueTypeToggled = value;
        this.#render();
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${UI.inspectorCommonStyles}</style>
      <style>${linearMemoryValueInterpreterStyles}</style>
      <div class="value-interpreter">
        <div class="settings-toolbar">
          ${this.#renderEndiannessSetting()}
          <devtools-button data-settings="true" class="toolbar-button ${this.#showSettings ? '' : 'disabled'}"
              title=${i18nString(UIStrings.toggleValueTypeSettings)} @click=${this.#onSettingsToggle}
              jslog=${VisualLogging.toggleSubpane('linear-memory-inspector.toggle-value-settings').track({ click: true })}
              .iconName=${'gear'}
              .toggledIconName=${'gear-filled'}
              .toggleType=${"primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */}
              .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
          ></devtools-button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.#showSettings ?
            html `
              <devtools-widget .widgetConfig=${widgetConfig(ValueInterpreterSettings, {
                valueTypes: this.#valueTypes, onToggle: this.#onValueTypeToggled
            })}>
              </devtools-widget>` :
            html `
              <devtools-widget .widgetConfig=${widgetConfig(ValueInterpreterDisplay, {
                buffer: this.#buffer,
                valueTypes: this.#valueTypes,
                endianness: this.#endianness,
                valueTypeModes: this.#valueTypeModeConfig,
                memoryLength: this.#memoryLength,
                onValueTypeModeChange: this.#onValueTypeModeChange,
                onJumpToAddressClicked: this.#onJumpToAddressClicked,
            })}>
              </devtools-widget>`}
        </div>
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
    #renderEndiannessSetting() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
    <label data-endianness-setting="true" title=${i18nString(UIStrings.changeEndianness)}>
      <select
        jslog=${VisualLogging.dropDown('linear-memory-inspector.endianess').track({ change: true })}
        style="border: none;"
        data-endianness="true" @change=${(e) => this.#onEndiannessChanged(e.target.value)}>
        ${["Little Endian" /* Endianness.LITTLE */, "Big Endian" /* Endianness.BIG */].map(endianness => {
            return html `<option value=${endianness} .selected=${this.#endianness === endianness}
            jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(endianness)).track({ click: true })}>${i18n.i18n.lockedString(endianness)}</option>`;
        })}
      </select>
    </label>
    `;
        // clang-format on
    }
    #onSettingsToggle() {
        this.#showSettings = !this.#showSettings;
        this.#render();
    }
}
customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);
//# sourceMappingURL=LinearMemoryValueInterpreter.js.map