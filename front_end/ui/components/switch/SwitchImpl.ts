// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {html, nothing, render} from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import switchStylesRaw from './switch.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const switchStyles = new CSSStyleSheet();
switchStyles.replaceSync(switchStylesRaw.cssContent);

export class SwitchChangeEvent extends Event {
  static readonly eventName = 'switchchange';

  constructor(readonly checked: boolean) {
    super(SwitchChangeEvent.eventName);
  }
}

export class Switch extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #checked = false;
  #disabled = false;
  #jslogContext = '';

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [switchStyles];
    this.#render();
  }

  set checked(isChecked: boolean) {
    this.#checked = isChecked;
    this.#render();
  }

  get checked(): boolean {
    return this.#checked;
  }

  set disabled(isDisabled: boolean) {
    this.#disabled = isDisabled;
    this.#render();
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  get jslogContext(): string {
    return this.#jslogContext;
  }

  set jslogContext(jslogContext: string) {
    this.#jslogContext = jslogContext;
    this.#render();
  }

  #handleChange = (ev: Event): void => {
    this.#checked = (ev.target as HTMLInputElement).checked;
    this.dispatchEvent(new SwitchChangeEvent(this.#checked));
  };

  #render(): void {
    const jslog = this.#jslogContext && VisualLogging.toggle(this.#jslogContext).track({change: true});
    /* eslint-disable rulesdir/inject-checkbox-styles */
    // clang-format off
    render(html`
    <label role="button" jslog=${jslog || nothing}>
      <input type="checkbox"
        @change=${this.#handleChange}
        ?disabled=${this.#disabled}
        .checked=${this.#checked}
      >
      <span class="slider" @click=${(ev: Event) => ev.stopPropagation()}></span>
    </label>
    `, this.#shadow, {host: this});
    // clang-format on
    /* eslint-enable rulesdir/inject-checkbox-styles */
  }
}

customElements.define('devtools-switch', Switch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-switch': Switch;
  }
}

declare global {
  interface HTMLElementEventMap {
    [SwitchChangeEvent.eventName]: SwitchChangeEvent;
  }
}
