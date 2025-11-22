// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, render, type TemplateResult} from '../../../ui/lit/lit.js';

import serviceWorkerRouterViewStyles from './serviceWorkerRouterView.css.js';

function renderRouterRule(rule: SDK.ServiceWorkerManager.ServiceWorkerRouterRule): TemplateResult {
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
    </li>`;
}

interface ViewInterface {
  rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[];
}

type View = (input: ViewInterface, output: undefined, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${serviceWorkerRouterViewStyles}</style>
    <ul class="router-rules">
      ${input.rules.map(renderRouterRule)}
    </ul>`, target);
  // clang-format on
};

export class ServiceWorkerRouterView extends UI.Widget.Widget {
  #rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[] = [];
  #view: View;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set rules(rules: SDK.ServiceWorkerManager.ServiceWorkerRouterRule[]) {
    this.#rules = rules;
    if (this.#rules.length > 0) {
      this.requestUpdate();
    }
  }

  get rules(): SDK.ServiceWorkerManager.ServiceWorkerRouterRule[] {
    return this.#rules;
  }

  override performUpdate(): void {
    this.#view({rules: this.#rules}, undefined, this.contentElement);
  }
}
