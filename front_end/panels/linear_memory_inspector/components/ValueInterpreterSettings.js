// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as UI from '../../../ui/legacy/legacy.js';
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
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${valueInterpreterSettingsStyles}</style>
      <div class="settings" jslog=${VisualLogging.pane('settings')}>
       ${[...GROUP_TO_TYPES.keys()].map(group => {
        const types = GROUP_TO_TYPES.get(group) ?? [];
        return html `
          <div class="value-types-selection">
            <span class="group">${valueTypeGroupToLocalizedString(group)}</span>
            ${types.map(type => {
            return html `
                <devtools-checkbox
                  title=${valueTypeToLocalizedString(type)}
                  ?checked=${input.valueTypes.has(type)}
                  @change=${(e) => {
                const checkbox = e.target;
                input.onToggle(type, checkbox.checked);
            }} jslog=${VisualLogging.toggle().track({ change: true }).context(Platform.StringUtilities.toKebabCase(type))}
                  }>${valueTypeToLocalizedString(type)}</devtools-checkbox>
         `;
        })}
          </div>
        `;
    })}
      </div>
      `, target);
};
export class ValueInterpreterSettings extends UI.Widget.Widget {
    #view;
    #valueTypes = new Set();
    #onToggle = () => { };
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    get valueTypes() {
        return this.#valueTypes;
    }
    set valueTypes(value) {
        this.#valueTypes = value;
        this.requestUpdate();
    }
    get onToggle() {
        return this.#onToggle;
    }
    set onToggle(value) {
        this.#onToggle = value;
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            valueTypes: this.#valueTypes,
            onToggle: this.#onToggle,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ValueInterpreterSettings.js.map