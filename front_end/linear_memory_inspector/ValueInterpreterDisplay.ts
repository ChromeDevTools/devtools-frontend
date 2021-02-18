// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as i18n from '../i18n/i18n.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {DEFAULT_MODE_MAPPING, Endianness, format, isNumber, isValidMode, VALUE_TYPE_MODE_LIST, ValueType, ValueTypeMode, valueTypeModeToLocalizedString, valueTypeToLocalizedString} from './ValueInterpreterDisplayUtils.js';

export const UIStrings = {
  /**
  *@description Tooltip text that appears when hovering over an unsigned interpretation of the memory under the Value Interpreter
  */
  unsignedValue: 'Unsigned value',
  /**
   *@description Tooltip text that appears when hovering over the element to change value type modes of under the Value Interpreter
   */
  changeValueTypeMode: 'Change mode',
  /**
  *@description Tooltip text that appears when hovering over a signed interpretation of the memory under the Value Interpreter
  */
  signedValue: 'Signed value',
};
const str_ = i18n.i18n.registerUIStrings('linear_memory_inspector/ValueInterpreterDisplay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = LitHtml;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;

const SORTED_VALUE_TYPES = Array.from(DEFAULT_MODE_MAPPING.keys());

export interface ValueDisplayData {
  buffer: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
}

export class ValueTypeModeChangedEvent extends Event {
  data: {type: ValueType, mode: ValueTypeMode};

  constructor(type: ValueType, mode: ValueTypeMode) {
    super('value-type-mode-changed', {
      composed: true,
    });
    this.data = {type, mode};
  }
}
export class ValueInterpreterDisplay extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private endianness = Endianness.Little;
  private buffer = new ArrayBuffer(0);
  private valueTypes: Set<ValueType> = new Set();
  private valueTypeModeConfig: Map<ValueType, ValueTypeMode> = DEFAULT_MODE_MAPPING;

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {enableLegacyPatching: true}),
    ];
  }

  set data(data: ValueDisplayData) {
    this.buffer = data.buffer;
    this.endianness = data.endianness;
    this.valueTypes = data.valueTypes;
    this.valueTypeModeConfig = DEFAULT_MODE_MAPPING;

    if (data.valueTypeModes) {
      data.valueTypeModes.forEach((mode, valueType) => {
        if (isValidMode(valueType, mode)) {
          this.valueTypeModeConfig.set(valueType, mode);
        }
      });
    }

    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .mode-type {
          color: var(--text-highlight-color); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }

        .value-types {
          width: 100%;
          display: grid;
          grid-template-columns: auto auto 1fr;
          grid-column-gap: 24px;
          grid-row-gap: 4px;
          overflow: hidden;
          padding: 2px 12px;
        }

        .value-type-cell-multiple-values {
          gap: 5px;
        }

        .value-type-cell {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          display: flex;
          align-items: center;
        }

        .value-type-cell-no-mode {
          grid-column: 1 / 3;
        }

      </style>
      <div class="value-types">
        ${SORTED_VALUE_TYPES.map(type => this.valueTypes.has(type) ? this.showValue(type) : '')}
      </div>
    `, this.shadow, {eventContext: this},
    );
    // clang-format on
  }

  private showValue(type: ValueType): LitHtml.TemplateResult {
    const mode = this.valueTypeModeConfig.get(type);
    if (!mode) {
      throw new Error(`No mode found for type ${type}`);
    }
    const localizedType = valueTypeToLocalizedString(type);
    const unsignedValue = this.parse({type, signed: false});
    const signedValue = this.parse({type, signed: true});
    const showSignedAndUnsigned = signedValue !== unsignedValue;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      ${isNumber(type) ?
        html`
          <span class="value-type-cell">${localizedType}</span>
            <select title=${i18nString(UIStrings.changeValueTypeMode)} data-mode-settings="true"  class="chrome-select" @change=${this.onValueTypeModeChange.bind(this, type)}>
              ${VALUE_TYPE_MODE_LIST.filter(x => isValidMode(type, x)).map(mode => {
                return html`<option value=${mode} .selected=${this.valueTypeModeConfig.get(type) === mode}>${
                valueTypeModeToLocalizedString(mode)}</option>`;
            })}
            </select>` :
        html`
          <span class="value-type-cell-no-mode value-type-cell">${localizedType}</span>`}

        ${showSignedAndUnsigned ?
        html`
          <div class="value-type-cell-multiple-values value-type-cell">
            <span data-value="true" title=${i18nString(UIStrings.unsignedValue)}>${unsignedValue}</span>
            <span>/<span>
            <span data-value="true" title=${i18nString(UIStrings.signedValue)}>${signedValue}</span>
          </div>` :
        html`
          <span class="value-type-cell" data-value="true">${unsignedValue}</span>`}
    `;
    // clang-format on
  }

  private onValueTypeModeChange(type: ValueType, event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLInputElement;
    const mode = select.value as ValueTypeMode;
    this.dispatchEvent(new ValueTypeModeChangedEvent(type, mode));
  }

  private parse(data: {type: ValueType, signed?: boolean}): string {
    const mode = this.valueTypeModeConfig.get(data.type);
    if (!mode) {
      console.error(`No known way of showing value for ${data.type}`);
      return 'N/A';
    }

    return format(
        {buffer: this.buffer, type: data.type, endianness: this.endianness, signed: data.signed || false, mode});
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter-display', ValueInterpreterDisplay);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-display': ValueInterpreterDisplay;
  }
}
