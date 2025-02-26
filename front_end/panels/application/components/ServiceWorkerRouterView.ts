// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Lit from '../../../ui/lit/lit.js';

import stylesRaw from './serviceWorkerRouterView.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const styles = new CSSStyleSheet();
styles.replaceSync(stylesRaw.cssContent);

const {html, render} = Lit;

export class ServiceWorkerRouterView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  update(rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[]): void {
    this.#rules = rules;
    if (this.#rules.length > 0) {
      this.#render();
    }
  }

  #render(): void {
    // clang-format off
    render(html`
      <ul class="router-rules">
        ${this.#rules.map(this.#renderRouterRule)}
      </ul>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderRouterRule(rule: SDK.ServiceWorkerManager.ServiceWorkerRouterRule): Lit.TemplateResult {
    return html`
      <li class="router-rule">
        <div class="rule-id">Rule ${rule.id}</div>
        <ul class="item">
          <li class="condition">
            <div class="rule-type">Condition</div>
            <div class="rule-value">${rule.condition}</div>
          </li>
          <li class="source">
            <div class="rule-type">Source</div>
            <div class="rule-value">${rule.source}</div>
          </li>
        </ul>
      </li>
    `;
  }
}

customElements.define('devtools-service-worker-router-view', ServiceWorkerRouterView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-service-worker-router-view': ServiceWorkerRouterView;
  }
}
