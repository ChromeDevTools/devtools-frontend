// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './ValueInterpreterDisplay.js';

import * as Elements from '../elements/elements.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import type {ValueDisplayData} from './ValueInterpreterDisplay.js';
import {Endianness, ValueType, ValueTypeMode} from './ValueInterpreterDisplayUtils.js';

const {render, html} = LitHtml;

export interface LinearMemoryValueInterpreterData {
  value: ArrayBuffer;
  valueTypes: ValueType[];
  endianness: Endianness;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
}

export class LinearMemoryValueInterpreter extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private endianness = Endianness.Little;
  private buffer = new ArrayBuffer(0);
  private valueTypes: ValueType[] = [];
  private valueTypeModeConfig: Map<ValueType, ValueTypeMode> = new Map();

  set data(data: LinearMemoryValueInterpreterData) {
    this.endianness = data.endianness;
    this.buffer = data.value;
    this.valueTypes = data.valueTypes;
    this.valueTypeModeConfig = data.valueTypeModes || new Map();
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

        .value-interpreter {
          border: var(--divider-border, 1px solid #d0d0d0);
          background-color: var(--toolbar-bg-color, #f3f3f3);
          overflow: hidden;
          --text-highlight-color: #80868b;
        }

        .settings-toolbar {
          min-height: 26px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          padding-left: 12px;
          padding-right: 12px
        }

        .settings-item {
          line-height: 26px;
        }

        .divider {
          display: block;
          height: 1px;
          margin-bottom: 12px;
          background-color: var(--divider-color,  #d0d0d0);
        }
      </style>
      <div class="value-interpreter">
        <div class="settings-toolbar">
          <div class="settings-item">
            <span>${this.endianness}</span>
            <devtools-icon
              .data=${{iconName: 'dropdown_7x6_icon', color: 'rgb(110 110 110)', width: '7px'} as Elements.Icon.IconWithName}>
            </devtools-icon>
          </div>
          <div class="settings-item">
            <devtools-icon
              .data=${{iconName: 'settings_14x14_icon', color: 'rgb(110 110 110)', width: '14px'} as Elements.Icon.IconWithName}>
            </devtools-icon>
          </div>
        </div>
        <span class="divider"></span>
        <devtools-linear-memory-inspector-interpreter-display
          .data=${{
            buffer: this.buffer,
            valueTypes: this.valueTypes,
            endianness: this.endianness,
            valueTypeModes: this.valueTypeModeConfig,
          } as ValueDisplayData}>
        </devtools-linear-memory-inspector-interpreter-display>
      </div>
    `,
        this.shadow, {eventContext: this},
    );
    // clang-format on
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
  }
}
