// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as UILegacy from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

class SizeChangedEvent extends Event {
  static readonly eventName = 'sizechanged';
  constructor(public size: number) {
    super(SizeChangedEvent.eventName);
  }
}

function getInputValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

export class SizeInputElement extends HTMLElement {
  #root = this.attachShadow({mode: 'open'});
  #disabled = false;
  #size = '0';
  #placeholder = '';
  #title: Platform.UIString.LocalizedString;
  #jslogContext: string;

  static readonly litTagName = LitHtml.literal`device-mode-emulation-size-input`;

  constructor(title: Platform.UIString.LocalizedString, {jslogContext}: {jslogContext: string}) {
    super();
    this.#title = title;
    this.#jslogContext = jslogContext;
  }

  connectedCallback(): void {
    this.render();
  }

  set disabled(disabled: boolean) {
    this.#disabled = disabled;
    this.render();
  }

  set size(size: string) {
    this.#size = size;
    this.render();
  }

  set placeholder(placeholder: string) {
    this.#placeholder = placeholder;
    this.render();
  }

  render(): void {
    LitHtml.render(
        // Since the emulation code runs in a different frame, we can't
        // use constructed stylesheets (they are disallowed cross-frame).
        // For now, use an inline style tag and later we can refactor this
        // to use proper constructed stylesheets, when the code runs
        // in the correct frame context.
        // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
        LitHtml.html`
      <style>
        input {
          /*
           * 4 characters for the maximum size of the value,
           * 2 characters for the width of the step-buttons,
           * 2 pixels padding between the characters and the
           * step-buttons.
           */
          width: calc(4ch + 2ch + 2px);
          max-height: 18px;
          border: var(--sys-color-neutral-outline);
          border-radius: 4px;
          margin: 0 2px;
          text-align: center;
          font-size: inherit;
          font-family: inherit;
        }

        input:disabled {
          user-select: none;
        }

        input:focus::-webkit-input-placeholder {
          color: transparent;
        }
      </style>
      <input type="number"
             max=${EmulationModel.DeviceModeModel.MaxDeviceSize}
             min=${EmulationModel.DeviceModeModel.MinDeviceSize}
             jslog=${VisualLogging.textField().track({change: true}).context(this.#jslogContext)}
             maxlength="4"
             title=${this.#title}
             placeholder=${this.#placeholder}
             ?disabled=${this.#disabled}
             .value=${this.#size}
             @change=${this.#fireSizeChange}
             @keydown=${this.#handleModifierKeys} />
    `,
        this.#root, {host: this});
  }

  #fireSizeChange(event: Event): void {
    this.dispatchEvent(new SizeChangedEvent(getInputValue(event)));
  }

  #handleModifierKeys(event: Event): void {
    let modifiedValue = UILegacy.UIUtils.modifiedFloatNumber(getInputValue(event), event);
    if (modifiedValue === null) {
      return;
    }

    modifiedValue = Math.min(modifiedValue, EmulationModel.DeviceModeModel.MaxDeviceSize);
    modifiedValue = Math.max(modifiedValue, EmulationModel.DeviceModeModel.MinDeviceSize);

    event.preventDefault();
    (event.target as HTMLInputElement).value = String(modifiedValue);
    this.dispatchEvent(new SizeChangedEvent(modifiedValue));
  }
}

customElements.define('device-mode-emulation-size-input', SizeInputElement);

declare global {
  interface HTMLElementTagNameMap {
    'device-mode-emulation-size-input': SizeInputElement;
  }
  interface HTMLElementEventMap {
    'sizechanged': SizeChangedEvent;
  }
}
