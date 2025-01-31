// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';

import controlButtonStylesRaw from './controlButton.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const controlButtonStyles = new CSSStyleSheet();
controlButtonStyles.replaceSync(controlButtonStylesRaw.cssContent);

const {html, Decorators, LitElement} = Lit;
const {customElement, property} = Decorators;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-control-button': ControlButton;
  }
}

@customElement('devtools-control-button')
export class ControlButton extends LitElement {
  static override styles = [controlButtonStyles];

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
    return html`
            <button
                @click=${this.#handleClickEvent}
                .disabled=${this.disabled}
                class="control"
            >
                <div class="icon ${this.shape}"></div>
                <div class="label">${this.label}</div>
            </button>
        `;
  }
}
