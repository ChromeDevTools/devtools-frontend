// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './ValueInterpreterDisplay.js';
import './ValueInterpreterSettings.js';

import * as Elements from '../elements/elements.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import type {ValueDisplayData} from './ValueInterpreterDisplay.js';
import {Endianness, ValueType, ValueTypeMode} from './ValueInterpreterDisplayUtils.js';
import type {TypeToggleEvent, ValueInterpreterSettingsData} from './ValueInterpreterSettings.js';

const {render, html} = LitHtml;

export interface LinearMemoryValueInterpreterData {
  value: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
}

export class LinearMemoryValueInterpreter extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private endianness = Endianness.Little;
  private buffer = new ArrayBuffer(0);
  private valueTypes: Set<ValueType> = new Set();
  private valueTypeModeConfig: Map<ValueType, ValueTypeMode> = new Map();
  private showSettings = false;

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
          width: 400px;
        }

        .settings-toolbar {
          min-height: 26px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          padding-left: 12px;
          padding-right: 12px;
          align-items: center;
        }

        .settings-toolbar-button {
          display: flex;
          justify-content: center;
          width: 30px;
          height: 20px;
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
          <div>
            <span>${this.endianness}</span>
            <devtools-icon
              .data=${{iconName: 'dropdown_7x6_icon', color: 'rgb(110 110 110)', width: '7px'} as Elements.Icon.IconWithName}>
            </devtools-icon>
          </div>
          <button data-settings="true" class="settings-toolbar-button" title="Toggle value type settings" @click=${this.onSettingsToggled}>
            <devtools-icon
              .data=${{iconName: 'settings_14x14_icon', color: 'rgb(110 110 110)', width: '14px'} as Elements.Icon.IconWithName}>
            </devtools-icon>
          </button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.showSettings ?
            html`
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{valueTypes: this.valueTypes} as ValueInterpreterSettingsData}
                @type-toggle=${this.onTypeToggle}>
              </devtools-linear-memory-inspector-interpreter-settings>` :
            html`
              <devtools-linear-memory-inspector-interpreter-display
                .data=${{
                  buffer: this.buffer,
                  valueTypes: this.valueTypes,
                  endianness: this.endianness,
                  valueTypeModes: this.valueTypeModeConfig,
                } as ValueDisplayData}>
              </devtools-linear-memory-inspector-interpreter-display>`}
        </div>
      </div>
    `,
        this.shadow, {eventContext: this},
    );
    // clang-format on
  }

  private onSettingsToggled() {
    this.showSettings = !this.showSettings;
    this.render();
  }

  private onTypeToggle(e: TypeToggleEvent) {
    this.dispatchEvent(new ValueTypeToggleEvent(e.data.type, e.data.checked));
  }
}

export class ValueTypeToggleEvent extends Event {
  data: {type: ValueType, checked: boolean};

  constructor(type: ValueType, checked: boolean) {
    super('value-type-toggle');
    this.data = {type, checked};
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
  }
}
