// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
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

export interface ValueInterpreterSettingsData {
  valueTypes: Set<ValueType>;
}

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

export class TypeToggleEvent extends Event {
  static readonly eventName = 'typetoggle';
  data: {type: ValueType, checked: boolean};

  constructor(type: ValueType, checked: boolean) {
    super(TypeToggleEvent.eventName);
    this.data = {type, checked};
  }
}

export class ValueInterpreterSettings extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #valueTypes = new Set<ValueType>();

  set data(data: ValueInterpreterSettingsData) {
    this.#valueTypes = data.valueTypes;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${valueInterpreterSettingsStyles}</style>
      <div class="settings" jslog=${VisualLogging.pane('settings')}>
       ${[...GROUP_TO_TYPES.keys()].map(group => {
        return html`
          <div class="value-types-selection">
            <span class="group">${valueTypeGroupToLocalizedString(group)}</span>
            ${this.#plotTypeSelections(group)}
          </div>
        `;})}
      </div>
      `, this.#shadow, {host: this});
  }

  #plotTypeSelections(group: ValueTypeGroup): Lit.TemplateResult {
    const types = GROUP_TO_TYPES.get(group);
    if (!types) {
      throw new Error(`Unknown group ${group}`);
    }
    return html`
      ${types.map(type => {
        return html`
            <devtools-checkbox
              title=${valueTypeToLocalizedString(type)}
              ?checked=${this.#valueTypes.has(type)}
              @change=${(e: Event) => this.#onTypeToggle(type, e)} jslog=${VisualLogging.toggle().track({change: true}).context(Platform.StringUtilities.toKebabCase(type))}
              >${valueTypeToLocalizedString(type)}</devtools-checkbox>
     `;})}`;
  }

  #onTypeToggle(type: ValueType, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.dispatchEvent(new TypeToggleEvent(type, checkbox.checked));
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter-settings', ValueInterpreterSettings);

declare global {

interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-settings': ValueInterpreterSettings;
  }
}
