// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import {html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import computedStylePropertyStyles from './computedStyleProperty.css.js';

export class NavigateToSourceEvent extends Event {
  static readonly eventName = 'onnavigatetosource';
  constructor() {
    super(NavigateToSourceEvent.eventName, {bubbles: true, composed: true});
  }
}

export class ComputedStyleProperty extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #inherited = false;
  #traceable = false;

  connectedCallback(): void {
    this.#render();
  }

  set inherited(inherited: boolean) {
    if (inherited === this.#inherited) {
      return;
    }
    this.#inherited = inherited;
    this.#render();
  }

  set traceable(traceable: boolean) {
    if (traceable === this.#traceable) {
      return;
    }
    this.#traceable = traceable;
    this.#render();
  }

  #onNavigateToSourceClick(): void {
    this.dispatchEvent(new NavigateToSourceEvent());
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${computedStylePropertyStyles}</style>
      <div class="computed-style-property ${this.#inherited ? 'inherited' : ''}">
        <div class="property-name">
          <slot name="name"></slot>
        </div>
        <span class="hidden" aria-hidden="false">: </span>
        ${this.#traceable ?
            html`<span class="goto" @click=${this.#onNavigateToSourceClick} jslog=${VisualLogging.action('elements.jump-to-style').track({click:true})}></span>` :
            null}
        <div class="property-value">
          <slot name="value"></slot>
        </div>
        <span class="hidden" aria-hidden="false">;</span>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-computed-style-property', ComputedStyleProperty);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-computed-style-property': ComputedStyleProperty;
  }
}
