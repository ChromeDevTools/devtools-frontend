// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as i18n from '../core/i18n/i18n.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Components from '../ui/components/components.js';

import {Endianness, format, getDefaultValueTypeMapping, getPointerAddress, isNumber, isPointer, isValidMode, VALUE_TYPE_MODE_LIST, ValueType, ValueTypeMode, valueTypeModeToLocalizedString, valueTypeToLocalizedString} from './ValueInterpreterDisplayUtils.js';

const UIStrings = {
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
  /**
  *@description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) under the Value Interpreter
  */
  jumpToPointer: 'Jump to address',
  /**
  *@description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) with an invalid address under the Value Interpreter.
  */
  addressOutOfRange: 'Address out of memory range',

};
const str_ = i18n.i18n.registerUIStrings('linear_memory_inspector/ValueInterpreterDisplay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = LitHtml;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;

const SORTED_VALUE_TYPES = Array.from(getDefaultValueTypeMapping().keys());

export interface ValueDisplayData {
  buffer: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  memoryLength: number;
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

export class JumpToPointerAddressEvent extends Event {
  data: number;

  constructor(address: number) {
    super('jump-to-pointer-address', {
      composed: true,
    });
    this.data = address;
  }
}

export class ValueInterpreterDisplay extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private endianness = Endianness.Little;
  private buffer = new ArrayBuffer(0);
  private valueTypes: Set<ValueType> = new Set();
  private valueTypeModeConfig: Map<ValueType, ValueTypeMode> = getDefaultValueTypeMapping();
  private memoryLength = 0;

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/legacy/inspectorCommon.css', {enableLegacyPatching: true}),
    ];
  }

  set data(data: ValueDisplayData) {
    this.buffer = data.buffer;
    this.endianness = data.endianness;
    this.valueTypes = data.valueTypes;
    this.memoryLength = data.memoryLength;

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
          min-height: 24px;
          overflow: hidden;
          padding: 2px 12px;
          align-items: baseline;
          justify-content: start;
        }

        .value-type-cell {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 24px;
        }

        .value-type-value-with-link {
          display: flex;
          align-items: center;
        }

        .value-type-cell-no-mode {
          grid-column: 1 / 3;
        }

        .jump-to-button {
          display: flex;
          width: 20px;
          height: 20px;
          border: none;
          padding: 0;
          outline: none;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        .signed-divider {
          width: 1px;
          height: 15px;
          background-color: var(--color-details-hairline);
          margin: 0 4px;
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
    if (isNumber(type)) {
      return this.renderNumberValues(type);
    }
    if (isPointer(type)) {
      return this.renderPointerValue(type);
    }
    throw new Error(`No known way to format ${type}`);
  }

  private renderPointerValue(type: ValueType): LitHtml.TemplateResult {
    const unsignedValue = this.parse({type, signed: false});
    const localizedType = valueTypeToLocalizedString(type);
    const address = getPointerAddress(type, this.buffer, this.endianness);
    const jumpDisabled = Number.isNaN(address) || BigInt(address) >= BigInt(this.memoryLength);
    const buttonTitle = jumpDisabled ? i18nString(UIStrings.addressOutOfRange) : i18nString(UIStrings.jumpToPointer);
    const iconColor = jumpDisabled ? 'var(--color-text-secondary)' : 'var(--color-primary)';
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="value-type-cell-no-mode value-type-cell">${localizedType}</span>
      <div class="value-type-cell">
        <div class="value-type-value-with-link" data-value="true">
        <span>${unsignedValue}</span>
          ${html`
              <button class="jump-to-button" data-jump="true" title=${buttonTitle} ?disabled=${jumpDisabled}
                @click=${this.onJumpToAddressClicked.bind(this, Number(address))}>
                <devtools-icon .data=${
                  {iconName: 'link_icon', color: iconColor, width: '14px'} as Components.Icon.IconWithName}>
                </devtools-icon>
              </button>`}
        </div>
      </div>
    `;
    // clang-format on
  }

  private onJumpToAddressClicked(address: number): void {
    this.dispatchEvent(new JumpToPointerAddressEvent(address));
  }

  private renderNumberValues(type: ValueType): LitHtml.TemplateResult {
    const localizedType = valueTypeToLocalizedString(type);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="value-type-cell">${localizedType}</span>
      <div>
        <select title=${i18nString(UIStrings.changeValueTypeMode)}
          data-mode-settings="true"
          class="chrome-select"
          style="border: none; background-color: transparent; cursor: pointer; color: var(--color-text-secondary);"
          @change=${this.onValueTypeModeChange.bind(this, type)}>
            ${VALUE_TYPE_MODE_LIST.filter(x => isValidMode(type, x)).map(mode => {
              return html`
                <option value=${mode} .selected=${this.valueTypeModeConfig.get(type) === mode}>${
                  valueTypeModeToLocalizedString(mode)}
                </option>`;
            })}
        </select>
      </div>
      ${this.renderSignedAndUnsigned(type)}
    `;
    // clang-format on
  }

  private renderSignedAndUnsigned(type: ValueType): LitHtml.TemplateResult {
    const unsignedValue = this.parse({type, signed: false});
    const signedValue = this.parse({type, signed: true});
    const mode = this.valueTypeModeConfig.get(type);
    const showSignedAndUnsigned =
        signedValue !== unsignedValue && mode !== ValueTypeMode.Hexadecimal && mode !== ValueTypeMode.Octal;

    const unsignedRendered = html`<span class="value-type-cell"  title=${
        i18nString(UIStrings.unsignedValue)} data-value="true">${unsignedValue}</span>`;
    if (!showSignedAndUnsigned) {
      return unsignedRendered;
    }

    // Some values are too long to show in one line, we're putting them into the next line.
    const showInMultipleLines = type === ValueType.Int32 || type === ValueType.Int64;
    const signedRendered =
        html`<span data-value="true" title=${i18nString(UIStrings.signedValue)}>${signedValue}</span>`;

    if (showInMultipleLines) {
      return html`
        <div class="value-type-cell">
          ${unsignedRendered}
          ${signedRendered}
        </div>
        `;
    }

    return html`
      <div class="value-type-cell" style="flex-direction: row;">
        ${unsignedRendered}
        <span class="signed-divider"></span>
        ${signedRendered}
      </div>
    `;
  }

  private onValueTypeModeChange(type: ValueType, event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLInputElement;
    const mode = select.value as ValueTypeMode;
    this.dispatchEvent(new ValueTypeModeChangedEvent(type, mode));
  }

  private parse(data: {type: ValueType, signed?: boolean}): string {
    const mode = this.valueTypeModeConfig.get(data.type);
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
