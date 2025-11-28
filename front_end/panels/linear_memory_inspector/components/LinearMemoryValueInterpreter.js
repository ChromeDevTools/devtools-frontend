// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import './ValueInterpreterDisplay.js';
import './ValueInterpreterSettings.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import linearMemoryValueInterpreterStyles from './linearMemoryValueInterpreter.css.js';
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
export class EndiannessChangedEvent extends Event {
    static eventName = 'endiannesschanged';
    data;
    constructor(endianness) {
        super(EndiannessChangedEvent.eventName);
        this.data = endianness;
    }
}
export class ValueTypeToggledEvent extends Event {
    static eventName = 'valuetypetoggled';
    data;
    constructor(type, checked) {
        super(ValueTypeToggledEvent.eventName);
        this.data = { type, checked };
    }
}
export class LinearMemoryValueInterpreter extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
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
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{ valueTypes: this.#valueTypes }}
                @typetoggle=${this.#onTypeToggle}>
              </devtools-linear-memory-inspector-interpreter-settings>` :
            html `
              <devtools-linear-memory-inspector-interpreter-display
                .data=${{
                buffer: this.#buffer,
                valueTypes: this.#valueTypes,
                endianness: this.#endianness,
                valueTypeModes: this.#valueTypeModeConfig,
                memoryLength: this.#memoryLength,
            }}>
              </devtools-linear-memory-inspector-interpreter-display>`}
        </div>
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
    }
    #onEndiannessChange(event) {
        event.preventDefault();
        const select = event.target;
        const endianness = select.value;
        this.dispatchEvent(new EndiannessChangedEvent(endianness));
    }
    #renderEndiannessSetting() {
        const onEnumSettingChange = this.#onEndiannessChange.bind(this);
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        return html `
    <label data-endianness-setting="true" title=${i18nString(UIStrings.changeEndianness)}>
      <select
        jslog=${VisualLogging.dropDown('linear-memory-inspector.endianess').track({ change: true })}
        style="border: none;"
        data-endianness="true" @change=${onEnumSettingChange}>
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
    #onTypeToggle(e) {
        this.dispatchEvent(new ValueTypeToggledEvent(e.data.type, e.data.checked));
    }
}
customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);
//# sourceMappingURL=LinearMemoryValueInterpreter.js.map