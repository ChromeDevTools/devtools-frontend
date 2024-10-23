// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';
import './ValueInterpreterDisplay.js';
import './ValueInterpreterSettings.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import linearMemoryValueInterpreterStyles from './linearMemoryValueInterpreter.css.js';
import {Endianness, type ValueType, type ValueTypeMode} from './ValueInterpreterDisplayUtils.js';
import type {TypeToggleEvent} from './ValueInterpreterSettings.js';

const UIStrings = {
  /**
   *@description Tooltip text that appears when hovering over the gear button to open and close settings in the Linear memory inspector. These settings
   *             allow the user to change the value type to view, such as 32-bit Integer, or 32-bit Float.
   */
  toggleValueTypeSettings: 'Toggle value type settings',
  /**
   *@description Tooltip text that appears when hovering over the 'Little Endian' or 'Big Endian' setting in the Linear memory inspector.
   */
  changeEndianness: 'Change `Endianness`',
};
const str_ =
    i18n.i18n.registerUIStrings('panels/linear_memory_inspector/components/LinearMemoryValueInterpreter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;

export class EndiannessChangedEvent extends Event {
  static readonly eventName = 'endiannesschanged';
  data: Endianness;

  constructor(endianness: Endianness) {
    super(EndiannessChangedEvent.eventName);
    this.data = endianness;
  }
}

export class ValueTypeToggledEvent extends Event {
  static readonly eventName = 'valuetypetoggled';
  data: {type: ValueType, checked: boolean};

  constructor(type: ValueType, checked: boolean) {
    super(ValueTypeToggledEvent.eventName);
    this.data = {type, checked};
  }
}

export interface LinearMemoryValueInterpreterData {
  value: ArrayBuffer;
  valueTypes: Set<ValueType>;
  endianness: Endianness;
  valueTypeModes?: Map<ValueType, ValueTypeMode>;
  memoryLength: number;
}

export class LinearMemoryValueInterpreter extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #endianness = Endianness.LITTLE;
  #buffer = new ArrayBuffer(0);
  #valueTypes: Set<ValueType> = new Set();
  #valueTypeModeConfig: Map<ValueType, ValueTypeMode> = new Map();
  #memoryLength = 0;
  #showSettings = false;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [linearMemoryValueInterpreterStyles];
  }

  set data(data: LinearMemoryValueInterpreterData) {
    this.#endianness = data.endianness;
    this.#buffer = data.value;
    this.#valueTypes = data.valueTypes;
    this.#valueTypeModeConfig = data.valueTypeModes || new Map();
    this.#memoryLength = data.memoryLength;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="value-interpreter">
        <div class="settings-toolbar">
          ${this.#renderEndiannessSetting()}
          <button data-settings="true" class="settings-toolbar-button ${this.#showSettings ? 'active' : ''}"
              title=${i18nString(UIStrings.toggleValueTypeSettings)} @click=${this.#onSettingsToggle}
              jslog=${VisualLogging.toggleSubpane('linear-memory-inspector.toggle-value-settings').track({click: true})}>
            <devtools-icon name=${this.#showSettings ? 'gear-filled' : 'gear'}></devtools-icon>
          </button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.#showSettings ?
            html`
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{ valueTypes: this.#valueTypes }}
                @typetoggle=${this.#onTypeToggle}>
              </devtools-linear-memory-inspector-interpreter-settings>` :
            html`
              <devtools-linear-memory-inspector-interpreter-display
                .data=${{
                  buffer: this.#buffer,
                  valueTypes: this.#valueTypes,
                  endianness: this.#endianness,
                  valueTypeModes: this.#valueTypeModeConfig,
                  memoryLength: this.#memoryLength,
                }}>
              </devtools-linear-memory-inspector-interpreter-display>`}
        </div>
      </div>
    `,
      this.#shadow, { host: this },
    );
    // clang-format on
  }

  #onEndiannessChange(event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLInputElement;
    const endianness = select.value as Endianness;
    this.dispatchEvent(new EndiannessChangedEvent(endianness));
  }

  #renderEndiannessSetting(): LitHtml.TemplateResult {
    const onEnumSettingChange = this.#onEndiannessChange.bind(this);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
    <label data-endianness-setting="true" title=${i18nString(UIStrings.changeEndianness)}>
      <select class="chrome-select"
        jslog=${VisualLogging.dropDown('linear-memory-inspector.endianess').track({change: true})}
        style="border: none; background-color: transparent; cursor: pointer;"
        data-endianness="true" @change=${onEnumSettingChange}>
        ${[Endianness.LITTLE, Endianness.BIG].map(endianness => {
            return html`<option value=${endianness} .selected=${this.#endianness === endianness}
            jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(endianness)).track({click: true})}>${
                i18n.i18n.lockedString(endianness)}</option>`;
        })}
      </select>
    </label>
    `;
    // clang-format on
  }

  #onSettingsToggle(): void {
    this.#showSettings = !this.#showSettings;
    this.#render();
  }

  #onTypeToggle(e: TypeToggleEvent): void {
    this.dispatchEvent(new ValueTypeToggledEvent(e.data.type, e.data.checked));
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
  }
}
