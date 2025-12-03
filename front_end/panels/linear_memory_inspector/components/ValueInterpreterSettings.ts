// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {ValueType, valueTypeToLocalizedString} from './ValueInterpreterDisplayUtils.js';
import valueInterpreterSettingsStyles from './valueInterpreterSettings.css.js';

const {render, html} = Lit;

const UIStrings = {
  /**
   * @description Name of a group of selectable value types that do not fall under integer and floating point value types, e.g. Pointer32. The group appears name appears under the Value Interpreter Settings.
   */
  otherGroup: 'Other',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/ValueInterpreterSettings.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum ValueTypeGroup {
  INTEGER = 'Integer',
  FLOAT = 'Floating point',
  OTHER = 'Other',
}

const GROUP_TO_TYPES = new Map(
    [
      [ValueTypeGroup.INTEGER, [ValueType.INT8, ValueType.INT16, ValueType.INT32, ValueType.INT64]],
      [ValueTypeGroup.FLOAT, [ValueType.FLOAT32, ValueType.FLOAT64]],
      [ValueTypeGroup.OTHER, [ValueType.POINTER32, ValueType.POINTER64]],
    ],
);

function valueTypeGroupToLocalizedString(group: ValueTypeGroup): string {
  if (group === ValueTypeGroup.OTHER) {
    return i18nString(UIStrings.otherGroup);
  }

  // The remaining group type names should not be localized.
  return group;
}

export interface ViewInput {
  valueTypes: Set<ValueType>;
  onToggle: (type: ValueType, checked: boolean) => void;
}

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
    render(html`
      <style>${valueInterpreterSettingsStyles}</style>
      <div class="settings" jslog=${VisualLogging.pane('settings')}>
       ${[...GROUP_TO_TYPES.keys()].map(group => {
        const types = GROUP_TO_TYPES.get(group) ?? [];
        return html`
          <div class="value-types-selection">
            <span class="group">${valueTypeGroupToLocalizedString(group)}</span>
            ${types.map(type => {
            return html`
                <devtools-checkbox
                  title=${valueTypeToLocalizedString(type)}
                  ?checked=${input.valueTypes.has(type)}
                  @change=${(e: Event) => {
                    const checkbox = e.target as HTMLInputElement;
                    input.onToggle(type, checkbox.checked);
                  }} jslog=${VisualLogging.toggle().track({change: true}).context(Platform.StringUtilities.toKebabCase(type))}
                  }>${valueTypeToLocalizedString(type)}</devtools-checkbox>
         `;})}
          </div>
        `;})}
      </div>
      `, target);
};
// clang-format on

export type View = typeof DEFAULT_VIEW;

export class ValueInterpreterSettings extends UI.Widget.Widget {
  #view: View;
  #valueTypes = new Set<ValueType>();
  #onToggle: (type: ValueType, checked: boolean) => void = () => {};

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  get valueTypes(): Set<ValueType> {
    return this.#valueTypes;
  }

  set valueTypes(value: Set<ValueType>) {
    this.#valueTypes = value;
    this.requestUpdate();
  }

  get onToggle(): (type: ValueType, checked: boolean) => void {
    return this.#onToggle;
  }

  set onToggle(value: (type: ValueType, checked: boolean) => void) {
    this.#onToggle = value;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput = {
      valueTypes: this.#valueTypes,
      onToggle: this.#onToggle,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
