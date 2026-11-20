// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
const { ifDefined } = Directives;
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      ${input.options.map(option => {
        const tooltip = option.tooltip?.() || input.description || undefined;
        return html `
          <label class="lighthouse-radio">
            <input
              type="radio"
              value=${option.value}
              name=${input.name}
              .checked=${option.value === input.value}
              @change=${(event) => {
            if (event.target.checked) {
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
    `, target, {
        container: {
            attributes: {
                role: 'radiogroup',
                'aria-label': input.label,
                'aria-description': input.description,
            },
        },
    });
    // clang-format on
};
export class RadioSetting extends UI.Widget.Widget {
    #view;
    #options = [];
    #setting;
    #description = '';
    #label;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    set options(options) {
        if (this.#options === options) {
            return;
        }
        this.#options = options;
        this.requestUpdate();
    }
    set setting(setting) {
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
    set description(description) {
        if (this.#description === description) {
            return;
        }
        this.#description = description;
        this.requestUpdate();
    }
    set label(label) {
        if (this.#label === label) {
            return;
        }
        this.#label = label;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#setting?.addChangeListener(this.requestUpdate, this);
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.#setting?.removeChangeListener(this.requestUpdate, this);
    }
    performUpdate() {
        const setting = this.#setting;
        if (!setting) {
            return;
        }
        const input = {
            options: this.#options,
            name: setting.name,
            value: setting.get(),
            description: this.#description,
            label: this.#label,
            onChange: (value) => setting.set(value),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=RadioSetting.js.map