// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
// eslint-disable-next-line rulesdir/es_modules_import
import inspectorCommonStyles from '../../../ui/legacy/inspectorCommon.css.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import valueInterpreterDisplayStyles from './valueInterpreterDisplay.css.js';
import {
  Endianness,
  format,
  getDefaultValueTypeMapping,
  getPointerAddress,
  isNumber,
  isPointer,
  isValidMode,
  VALUE_TYPE_MODE_LIST,
  ValueType,
  ValueTypeMode,
} from './ValueInterpreterDisplayUtils.js';

const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over an unsigned interpretation of the memory under the Value Interpreter
   */
  unsignedValue: '`Unsigned` value',
  /**
   *@description Tooltip text that appears when hovering over the element to change value type modes of under the Value Interpreter. Value type modes
   *             are different ways of viewing a certain value, e.g.: 10 (decimal) can be 0xa in hexadecimal mode, or 12 in octal mode.
   */
  changeValueTypeMode: 'Change mode',
  /**
   *@description Tooltip text that appears when hovering over a signed interpretation of the memory under the Value Interpreter
   */
  signedValue: '`Signed` value',
  /**
   *@description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) under the Value Interpreter
   */
  jumpToPointer: 'Jump to address',
  /**
   *@description Tooltip text that appears when hovering over a 'jump-to-address' button that is next to a pointer (32-bit or 64-bit) with an invalid address under the Value Interpreter.
   */
  addressOutOfRange: 'Address out of memory range',

};
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/ValueInterpreterDisplay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = LitHtml;

const SORTED_VALUE_TYPES = Array.from(getDefaultValueTypeMapping().keys());

export interface ValueDisplayData {
  buffer: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  memoryLength: number;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
}

export class ValueTypeModeChangedEvent extends Event {
  static readonly eventName = 'valuetypemodechanged';
  data: {type: ValueType, mode: ValueTypeMode};

  constructor(type: ValueType, mode: ValueTypeMode) {
    super(ValueTypeModeChangedEvent.eventName, {
      composed: true,
    });
    this.data = {type, mode};
  }
}

export class JumpToPointerAddressEvent extends Event {
  static readonly eventName = 'jumptopointeraddress';
  data: number;

  constructor(address: number) {
    super(JumpToPointerAddressEvent.eventName, {
      composed: true,
    });
    this.data = address;
  }
}

export class ValueInterpreterDisplay extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #endianness = Endianness.LITTLE;
  #buffer = new ArrayBuffer(0);
  #valueTypes: Set<ValueType> = new Set();
  #valueTypeModeConfig: Map<ValueType, ValueTypeMode> = getDefaultValueTypeMapping();
  #memoryLength = 0;

  constructor() {
    super();
    this.#shadow.adoptedStyleSheets = [
      inspectorCommonStyles,
    ];
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [valueInterpreterDisplayStyles];
  }

  set data(data: ValueDisplayData) {
    this.#buffer = data.buffer;
    this.#endianness = data.endianness;
    this.#valueTypes = data.valueTypes;
    this.#memoryLength = data.memoryLength;

    if (data.valueTypeModes) {
      data.valueTypeModes.forEach((mode, valueType) => {
        if (isValidMode(valueType, mode)) {
          this.#valueTypeModeConfig.set(valueType, mode);
        }
      });
    }

    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="value-types">
        ${SORTED_VALUE_TYPES.map(type => this.#valueTypes.has(type) ? this.#showValue(type) : '')}
      </div>
    `, this.#shadow, {host: this},
    );
    // clang-format on
  }

  #showValue(type: ValueType): LitHtml.TemplateResult {
    if (isNumber(type)) {
      return this.#renderNumberValues(type);
    }
    if (isPointer(type)) {
      return this.#renderPointerValue(type);
    }
    throw new Error(`No known way to format ${type}`);
  }

  #renderPointerValue(type: ValueType): LitHtml.TemplateResult {
    const unsignedValue = this.#parse({type, signed: false});
    const address = getPointerAddress(type, this.#buffer, this.#endianness);
    const jumpDisabled = Number.isNaN(address) || BigInt(address) >= BigInt(this.#memoryLength);
    const buttonTitle = jumpDisabled ? i18nString(UIStrings.addressOutOfRange) : i18nString(UIStrings.jumpToPointer);
    const iconColor = jumpDisabled ? 'var(--icon-default)' : 'var(--icon-link)';
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="value-type-cell-no-mode value-type-cell selectable-text">${i18n.i18n.lockedString(type)}</span>
      <div class="value-type-cell">
        <div class="value-type-value-with-link" data-value="true">
        <span class="selectable-text">${unsignedValue}</span>
          ${
            html`
              <button class="jump-to-button" data-jump="true" title=${buttonTitle} ?disabled=${jumpDisabled}
                jslog=${VisualLogging.action('linear-memory-inspector.jump-to-address').track({click: true})}
                @click=${this.#onJumpToAddressClicked.bind(this, Number(address))}>
                <devtools-icon .data=${
                  {iconName: 'open-externally', color: iconColor, width: '16px'} as IconButton.Icon.IconWithName}>
                </devtools-icon>
              </button>`}
        </div>
      </div>
    `;
    // clang-format on
  }

  #onJumpToAddressClicked(address: number): void {
    this.dispatchEvent(new JumpToPointerAddressEvent(address));
  }

  #renderNumberValues(type: ValueType): LitHtml.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="value-type-cell selectable-text">${i18n.i18n.lockedString(type)}</span>
      <div>
        <select title=${i18nString(UIStrings.changeValueTypeMode)}
          data-mode-settings="true"
          class="chrome-select"
          style="border: none; background-color: transparent; cursor: pointer; color: var(--sys-color-token-subtle);"
          jslog=${VisualLogging.dropDown('linear-memory-inspector.value-type-mode').track({change: true})}
          @change=${this.#onValueTypeModeChange.bind(this, type)}>
            ${VALUE_TYPE_MODE_LIST.filter(x => isValidMode(type, x)).map(mode => {
              return html`
                <option value=${mode} .selected=${this.#valueTypeModeConfig.get(type) === mode}
                        jslog=${VisualLogging.item(mode).track({click: true})}>${
                  i18n.i18n.lockedString(mode)}
                </option>`;
            })}
        </select>
      </div>
      ${this.#renderSignedAndUnsigned(type)}
    `;
    // clang-format on
  }

  #renderSignedAndUnsigned(type: ValueType): LitHtml.TemplateResult {
    const unsignedValue = this.#parse({type, signed: false});
    const signedValue = this.#parse({type, signed: true});
    const mode = this.#valueTypeModeConfig.get(type);
    const showSignedAndUnsigned =
        signedValue !== unsignedValue && mode !== ValueTypeMode.HEXADECIMAL && mode !== ValueTypeMode.OCTAL;

    const unsignedRendered = html`<span class="value-type-cell selectable-text"  title=${
        i18nString(UIStrings.unsignedValue)} data-value="true">${unsignedValue}</span>`;
    if (!showSignedAndUnsigned) {
      return unsignedRendered;
    }

    // Some values are too long to show in one line, we're putting them into the next line.
    const showInMultipleLines = type === ValueType.INT32 || type === ValueType.INT64;
    const signedRendered = html`<span class="selectable-text" data-value="true" title=${
        i18nString(UIStrings.signedValue)}>${signedValue}</span>`;

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

  #onValueTypeModeChange(type: ValueType, event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLInputElement;
    const mode = select.value as ValueTypeMode;
    this.dispatchEvent(new ValueTypeModeChangedEvent(type, mode));
  }

  #parse(data: {type: ValueType, signed?: boolean}): string {
    const mode = this.#valueTypeModeConfig.get(data.type);
    return format(
        {buffer: this.#buffer, type: data.type, endianness: this.#endianness, signed: data.signed || false, mode});
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter-display', ValueInterpreterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-display': ValueInterpreterDisplay;
  }
}
