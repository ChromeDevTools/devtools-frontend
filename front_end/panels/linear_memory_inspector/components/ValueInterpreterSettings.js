// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/legacy/legacy.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { valueTypeToLocalizedString } from './ValueInterpreterDisplayUtils.js';
import valueInterpreterSettingsStyles from './valueInterpreterSettings.css.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Name of a group of selectable value types that do not fall under integer and floating point value types, e.g. Pointer32. The group appears name appears under the Value Interpreter Settings.
     */
    otherGroup: 'Other',
};
const str_ = i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/ValueInterpreterSettings.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const GROUP_TO_TYPES = new Map([
    ["Integer" /* ValueTypeGroup.INTEGER */, ["Integer 8-bit" /* ValueType.INT8 */, "Integer 16-bit" /* ValueType.INT16 */, "Integer 32-bit" /* ValueType.INT32 */, "Integer 64-bit" /* ValueType.INT64 */]],
    ["Floating point" /* ValueTypeGroup.FLOAT */, ["Float 32-bit" /* ValueType.FLOAT32 */, "Float 64-bit" /* ValueType.FLOAT64 */]],
    ["Other" /* ValueTypeGroup.OTHER */, ["Pointer 32-bit" /* ValueType.POINTER32 */, "Pointer 64-bit" /* ValueType.POINTER64 */]],
]);
function valueTypeGroupToLocalizedString(group) {
    if (group === "Other" /* ValueTypeGroup.OTHER */) {
        return i18nString(UIStrings.otherGroup);
    }
    // The remaining group type names should not be localized.
    return group;
}
export class TypeToggleEvent extends Event {
    static eventName = 'typetoggle';
    data;
    constructor(type, checked) {
        super(TypeToggleEvent.eventName);
        this.data = { type, checked };
    }
}
export class ValueInterpreterSettings extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #valueTypes = new Set();
    set data(data) {
        this.#valueTypes = data.valueTypes;
        this.#render();
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${valueInterpreterSettingsStyles}</style>
      <div class="settings" jslog=${VisualLogging.pane('settings')}>
       ${[...GROUP_TO_TYPES.keys()].map(group => {
            return html `
          <div class="value-types-selection">
            <span class="group">${valueTypeGroupToLocalizedString(group)}</span>
            ${this.#plotTypeSelections(group)}
          </div>
        `;
        })}
      </div>
      `, this.#shadow, { host: this });
    }
    #plotTypeSelections(group) {
        const types = GROUP_TO_TYPES.get(group);
        if (!types) {
            throw new Error(`Unknown group ${group}`);
        }
        return html `
      ${types.map(type => {
            return html `
            <devtools-checkbox
              title=${valueTypeToLocalizedString(type)}
              ?checked=${this.#valueTypes.has(type)}
              @change=${(e) => this.#onTypeToggle(type, e)} jslog=${VisualLogging.toggle().track({ change: true }).context(Platform.StringUtilities.toKebabCase(type))}
              >${valueTypeToLocalizedString(type)}</devtools-checkbox>
     `;
        })}`;
    }
    #onTypeToggle(type, event) {
        const checkbox = event.target;
        this.dispatchEvent(new TypeToggleEvent(type, checkbox.checked));
    }
}
customElements.define('devtools-linear-memory-inspector-interpreter-settings', ValueInterpreterSettings);
//# sourceMappingURL=ValueInterpreterSettings.js.map