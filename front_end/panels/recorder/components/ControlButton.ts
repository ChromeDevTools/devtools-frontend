// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';

import controlButtonStyles from './controlButton.css.js';

const {html, Decorators, LitElement} = Lit;
const {customElement, property} = Decorators;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-control-button': ControlButton;
  }
}

@customElement('devtools-control-button')
export class ControlButton extends LitElement {
  @property() declare label: string;
  @property() declare shape: string;
  @property({type: Boolean}) declare disabled: boolean;

  constructor() {
    super();
    this.label = '';
    this.shape = 'square';
    this.disabled = false;
  }

  #handleClickEvent = (event: Event): void => {
    if (this.disabled) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  protected override render(): unknown {
    // clang-format off
    return html`
            <style>${controlButtonStyles}</style>
            <button
                @click=${this.#handleClickEvent}
                .disabled=${this.disabled}
                class="control">
              <div class="icon ${this.shape}"></div>
              <div class="label">${this.label}</div>
            </button>
        `;
    // clang-format on
  }
}
