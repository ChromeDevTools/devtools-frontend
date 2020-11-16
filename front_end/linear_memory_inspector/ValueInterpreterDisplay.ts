// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {Endianness, format, isNumber, isValidMode, typeHasSignedNotation, ValueType, ValueTypeMode} from './ValueInterpreterDisplayUtils.js';

const ls = Common.ls;
const {render, html} = LitHtml;

const DEFAULT_MODE_MAPPING = new Map([
  [ValueType.Int8, ValueTypeMode.Decimal],
  [ValueType.Int16, ValueTypeMode.Decimal],
  [ValueType.Int32, ValueTypeMode.Decimal],
  [ValueType.Int64, ValueTypeMode.Decimal],
  [ValueType.Float32, ValueTypeMode.Decimal],
  [ValueType.Float64, ValueTypeMode.Decimal],
  [ValueType.Boolean, ValueTypeMode.None],
  [ValueType.String, ValueTypeMode.None],
]);

const SORTED_VALUE_TYPES = Array.from(DEFAULT_MODE_MAPPING.keys());

export interface ValueDisplayData {
  buffer: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
}

export class ValueInterpreterDisplay extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private endianness = Endianness.Little;
  private buffer = new ArrayBuffer(0);
  private valueTypes: Set<ValueType> = new Set();
  private valueTypeModeConfig: Map<ValueType, ValueTypeMode> = DEFAULT_MODE_MAPPING;

  set data(data: ValueDisplayData) {
    this.buffer = data.buffer;
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

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        :host {
          flex: auto;
          display: flex;
        }

        .mode-type {
          color: var(--text-highlight-color);
        }

        .value-types {
          display: grid;
          grid-template-columns: auto auto 1fr 1fr;
          grid-column-gap: 24px;
          grid-row-gap: 4px;
          overflow: hidden;
          padding-left: 12px;
          padding-right: 12px;
        }

        .value-type-cell {
          height: 21px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          display: flex;
        }

        .value-type-cell-no-sign {
          grid-column: 3 / 5;
        }

        .value-type-cell-no-mode {
          grid-column: grid-column: 1 / 3;
        }

      </style>
        <div class="value-types">
          ${SORTED_VALUE_TYPES.map(type => this.valueTypes.has(type) ? this.showValue(type) : '')}
        </div>
      </div>
    `, this.shadow, {eventContext: this},
    );
    // clang-format on
  }

  private showValue(type: ValueType) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      ${isNumber(type) ?
        html`
          <span class="value-type-cell">${ls`${type}`}</span>
          <span class="mode-type value-type-cell">${ls`${this.valueTypeModeConfig.get(type)}`}</span>` :
        html`
          <span class="value-type-cell-no-mode value-type-cell">${ls`${type}`}</span>`}

        ${typeHasSignedNotation(type) ?
        html`
          <span class="value-type-cell" data-value="true">+ ${this.parse({type, signed: false})}</span>
          <span class="value-type-cell" data-value="true">± ${this.parse({type, signed: true})}</span>` :
        html`
          <span class="value-type-cell-no-sign value-type-cell" data-value="true">${this.parse({type})}</span>`}
    `;
    // clang-format on
  }

  private parse(data: {type: ValueType, signed?: boolean}) {
    const mode = this.valueTypeModeConfig.get(data.type);
    if (!mode) {
      throw new Error(`No known way of showing value for ${data.type}`);
    }

    return format(
        {buffer: this.buffer, type: data.type, endianness: this.endianness, signed: data.signed || false, mode});
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter-display', ValueInterpreterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-display': ValueInterpreterDisplay;
  }
}
