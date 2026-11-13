// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';

const {ifDefined} = Directives;

export interface RadioOption {
  value: string;
  label: () => Common.UIString.LocalizedString;
  tooltip?: () => Common.UIString.LocalizedString;
}

export interface ViewInput {
  options: RadioOption[];
  name: string;
  value: string;
  description: string;
  label?: string;
  onChange: (value: string) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(
    html`
      ${input.options.map(option => {
        const tooltip = option.tooltip?.() || input.description || undefined;
        return html`
          <label class="lighthouse-radio">
            <input
              type="radio"
              value=${option.value}
              name=${input.name}
              .checked=${option.value === input.value}
              @change=${(event: Event) => {
                if ((event.target as HTMLInputElement).checked) {
                  input.onChange(option.value);
                }
              }}
              title=${ifDefined(tooltip)}
            />
            <span
              class="lighthouse-radio-text"
              title=${ifDefined(tooltip)}
            >${option.label()}</span>
          </label>
        `;
      })}
    `,
    target,
    {
      container: {
        attributes: {
          role: 'radiogroup',
          'aria-label': input.label,
          'aria-description': input.description,
        },
      },
    },
  );
  // clang-format on
};

export class RadioSetting extends UI.Widget.Widget {
  readonly #view: View;
  #options: RadioOption[] = [];
  #setting?: Common.Settings.Setting<string>;
  #description = '';
  #label?: string;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set options(options: RadioOption[]) {
    if (this.#options === options) {
      return;
    }
    this.#options = options;
    this.requestUpdate();
  }

  set setting(setting: Common.Settings.Setting<string>|undefined) {
    if (this.#setting === setting) {
      return;
    }
    if (this.isShowing()) {
      this.#setting?.removeChangeListener(this.requestUpdate, this);
      setting?.addChangeListener(this.requestUpdate, this);
    }
    this.#setting = setting;
    this.requestUpdate();
  }

  set description(description: string) {
    if (this.#description === description) {
      return;
    }
    this.#description = description;
    this.requestUpdate();
  }

  set label(label: string|undefined) {
    if (this.#label === label) {
      return;
    }
    this.#label = label;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#setting?.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#setting?.removeChangeListener(this.requestUpdate, this);
  }

  override performUpdate(): void {
    const setting = this.#setting;
    if (!setting) {
      return;
    }
    const input: ViewInput = {
      options: this.#options,
      name: setting.name,
      value: setting.get(),
      description: this.#description,
      label: this.#label,
      onChange: (value: string) => setting.set(value),
    };
    this.#view(input, undefined, this.contentElement);
  }
}
