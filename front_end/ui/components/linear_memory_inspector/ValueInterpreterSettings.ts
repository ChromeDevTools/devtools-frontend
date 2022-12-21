// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';
import * as Input from '../input/input.js';

import {ValueType, valueTypeToLocalizedString} from './ValueInterpreterDisplayUtils.js';
import valueInterpreterSettingsStyles from './valueInterpreterSettings.css.js';

const {render, html} = LitHtml;

const UIStrings = {
  /**
   *@description Name of a group of selectable value types that do not fall under integer and floating point value types, e.g. Pointer32. The group appears name appears under the Value Interpreter Settings.
   */
  otherGroup: 'Other',
};
const str_ =
    i18n.i18n.registerUIStrings('ui/components/linear_memory_inspector/ValueInterpreterSettings.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ValueInterpreterSettingsData {
  valueTypes: Set<ValueType>;
}

const enum ValueTypeGroup {
  Integer = 'Integer',
  Float = 'Floating point',
  Other = 'Other',
}

const GROUP_TO_TYPES = new Map(
    [
      [ValueTypeGroup.Integer, [ValueType.Int8, ValueType.Int16, ValueType.Int32, ValueType.Int64]],
      [ValueTypeGroup.Float, [ValueType.Float32, ValueType.Float64]],
      [ValueTypeGroup.Other, [ValueType.Pointer32, ValueType.Pointer64]],
    ],
);

function valueTypeGroupToLocalizedString(group: ValueTypeGroup): string {
  if (group === ValueTypeGroup.Other) {
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
  static readonly litTagName = LitHtml.literal`devtools-linear-memory-inspector-interpreter-settings`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #valueTypes: Set<ValueType> = new Set();

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, valueInterpreterSettingsStyles];
  }

  set data(data: ValueInterpreterSettingsData) {
    this.#valueTypes = data.valueTypes;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="settings">
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

  #plotTypeSelections(group: ValueTypeGroup): LitHtml.TemplateResult {
    const types = GROUP_TO_TYPES.get(group);
    if (!types) {
      throw new Error(`Unknown group ${group}`);
    }
    return html`
      ${types.map(type => {
        return html`
          <label class="type-label" title=${valueTypeToLocalizedString(type)}>
            <input data-input="true" type="checkbox" .checked=${this.#valueTypes.has(type)} @change=${(e: Event): void => this.#onTypeToggle(type, e)}>
            <span data-title="true">${valueTypeToLocalizedString(type)}</span>
          </label>
     `;})}`;
  }

  #onTypeToggle(type: ValueType, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.dispatchEvent(new TypeToggleEvent(type, checkbox.checked));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-linear-memory-inspector-interpreter-settings', ValueInterpreterSettings);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-settings': ValueInterpreterSettings;
  }
}
