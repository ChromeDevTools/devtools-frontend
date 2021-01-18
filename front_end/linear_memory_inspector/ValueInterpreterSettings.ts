// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {ValueType, valueTypeToLocalizedString} from './ValueInterpreterDisplayUtils.js';

const {render, html} = LitHtml;

export interface ValueInterpreterSettingsData {
  valueTypes: Set<ValueType>;
}

const enum ValueTypeGroup {
  Integer = 'Integer',
  Float = 'Floating point',
}

const GROUP_TO_TYPES = new Map(
    [
      [ValueTypeGroup.Integer, [ValueType.Int8, ValueType.Int16, ValueType.Int32, ValueType.Int64]],
      [ValueTypeGroup.Float, [ValueType.Float32, ValueType.Float64]],
    ],
);

export class TypeToggleEvent extends Event {
  data: {type: ValueType, checked: boolean};

  constructor(type: ValueType, checked: boolean) {
    super('type-toggle');
    this.data = {type, checked};
  }
}

export class ValueInterpreterSettings extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private valueTypes: Set<ValueType> = new Set();

  set data(data: ValueInterpreterSettingsData) {
    this.valueTypes = data.valueTypes;
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
          min-height: 20px;
        }

        .settings {
          display: flex;
          flex-wrap: wrap;
          margin: 0 12px 12px 12px;
          column-gap: 45px;
          row-gap: 15px;
        }

        .value-types-selection {
          display: flex;
          flex-direction: column;
        }

        .value-types-selection + .value-types-selection {
          margin-left: 45px;
        }

        .group {
          font-weight: bold;
          margin-bottom: 11px;
        }

        .type-label {
          white-space: nowrap;
        }

        .group + .type-label {
          margin-top: 5px;
        }

        .type-label input {
          margin: 0 6px 0 0;
          padding: 0;
        }

        .type-label + .type-label {
          margin-top: 6px;
        }
      </style>
      <div class="settings">
       ${[...GROUP_TO_TYPES.keys()].map(group => {
        return html`
          <div class="value-types-selection">
            <span class="group">${group}</span>
            ${this.plotTypeSelections(group)}
          </div>
        `;})}
      </div>
      `, this.shadow, {eventContext: this});
  }

  private plotTypeSelections(group: ValueTypeGroup): LitHtml.TemplateResult {
    const types = GROUP_TO_TYPES.get(group);
    if (!types) {
      throw new Error(`Unknown group ${group}`);
    }
    return html`
      ${types.map(type => {
        return html`
          <label class="type-label" title=${valueTypeToLocalizedString(type)}>
            <input data-input="true" type="checkbox" .checked=${this.valueTypes.has(type)} @change=${(e: Event): void => this.onTypeToggle(type, e)}>
            <span data-title="true">${valueTypeToLocalizedString(type)}</span>
          </label>
     `;})}`;
  }

  private onTypeToggle(type: ValueType, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.dispatchEvent(new TypeToggleEvent(type, checkbox.checked));
  }
}

customElements.define('devtools-linear-memory-inspector-interpreter-settings', ValueInterpreterSettings);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HTMLElementTagNameMap {
    'devtools-linear-memory-inspector-interpreter-settings': ValueInterpreterSettings;
  }
}
