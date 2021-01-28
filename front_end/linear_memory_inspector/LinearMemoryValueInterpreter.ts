// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './ValueInterpreterDisplay.js';
import './ValueInterpreterSettings.js';

import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';
import * as Components from '../ui/components/components.js';

import type {ValueDisplayData} from './ValueInterpreterDisplay.js';
import {Endianness, endiannessToLocalizedString, ValueType, ValueTypeMode} from './ValueInterpreterDisplayUtils.js';
import type {TypeToggleEvent, ValueInterpreterSettingsData} from './ValueInterpreterSettings.js';

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Tooltip text that appears when hovering over the gear button to open and close settings in the Linear Memory Inspector
  */
  toggleValueTypeSettings: 'Toggle value type settings',
  /**
  *@description Tooltip text that appears when hovering over the 'Little Endian' or 'Big Endian' setting in the Linear Memory Inspector
  */
  changeEndianness: 'Change Endianness',
};
const str_ = i18n.i18n.registerUIStrings('linear_memory_inspector/LinearMemoryValueInterpreter.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html} = LitHtml;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;

export class EndiannessChangedEvent extends Event {
  data: Endianness;

  constructor(endianness: Endianness) {
    super('endianness-changed');
    this.data = endianness;
  }
}

export class ValueTypeToggledEvent extends Event {
  data: {type: ValueType, checked: boolean};

  constructor(type: ValueType, checked: boolean) {
    super('value-type-toggled');
    this.data = {type, checked};
  }
}

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

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {enableLegacyPatching: true}),
    ];
  }


  set data(data: LinearMemoryValueInterpreterData) {
    this.endianness = data.endianness;
    this.buffer = data.value;
    this.valueTypes = data.valueTypes;
    this.valueTypeModeConfig = data.valueTypeModes || new Map();
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

        .value-interpreter {
          --text-highlight-color: #80868b;

          border: var(--divider-border, 1px solid #d0d0d0);
          background-color: var(--toolbar-bg-color, #f3f3f3);
          overflow: hidden;
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
          align-items: center;
          width: 20px;
          height: 20px;
          border: none;
          background-color: transparent;
          cursor: pointer;
        }

        .settings-toolbar-button devtools-icon {
          height: 14px;
          width: 14px;
          min-height: 14px;
          min-width: 14px;
        }

        .settings-toolbar-button.active devtools-icon {
          --icon-color: var(--color-primary);
        }

        .divider {
          display: block;
          height: 1px;
          margin-bottom: 12px;
          background-color: var(--divider-color, #d0d0d0);
        }
      </style>
      <div class="value-interpreter">
        <div class="settings-toolbar">
          ${this.renderSetting()}
          <button data-settings="true" class="settings-toolbar-button ${this.showSettings ? 'active' : ''}" title=${i18nString(UIStrings.toggleValueTypeSettings)} @click=${this.onSettingsToggle}>
            <devtools-icon
              .data=${{ iconName: 'settings_14x14_icon', color: 'var(--color-text-secondary)', width: '14px' } as Components.Icon.IconWithName}>
            </devtools-icon>
          </button>
        </div>
        <span class="divider"></span>
        <div>
          ${this.showSettings ?
            html`
              <devtools-linear-memory-inspector-interpreter-settings
                .data=${{ valueTypes: this.valueTypes } as ValueInterpreterSettingsData}
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
      this.shadow, { eventContext: this },
    );
    // clang-format on
  }

  private onEndiannessChange(event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLInputElement;
    const endianness = select.value as Endianness;
    this.dispatchEvent(new EndiannessChangedEvent(endianness));
  }

  private renderSetting(): LitHtml.TemplateResult {
    const onEnumSettingChange = this.onEndiannessChange.bind(this);
    return html`
    <label data-endianness-setting="true" title=${i18nString(UIStrings.changeEndianness)}>
      <select class="chrome-select" data-endianness="true" @change=${onEnumSettingChange}>
        ${[Endianness.Little, Endianness.Big].map(endianness => {
      return html`<option value=${endianness} .selected=${this.endianness === endianness}>${
          endiannessToLocalizedString(endianness)}</option>`;
    })}
      </select>
    </label>
    `;
  }

  private onSettingsToggle(): void {
    this.showSettings = !this.showSettings;
    this.render();
  }

  private onTypeToggle(e: TypeToggleEvent): void {
    this.dispatchEvent(new ValueTypeToggledEvent(e.data.type, e.data.checked));
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter', LinearMemoryValueInterpreter);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter': LinearMemoryValueInterpreter;
  }
}
