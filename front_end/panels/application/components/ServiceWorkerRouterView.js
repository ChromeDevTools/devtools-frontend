// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
import serviceWorkerRouterViewStyles from './serviceWorkerRouterView.css.js';
function renderRouterRule(rule) {
    return html `
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
const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${serviceWorkerRouterViewStyles}</style>
    <ul class="router-rules">
      ${input.rules.map(renderRouterRule)}
    </ul>`, target);
    // clang-format on
};
export class ServiceWorkerRouterView extends UI.Widget.Widget {
    #rules = [];
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set rules(rules) {
        this.#rules = rules;
        if (this.#rules.length > 0) {
            this.requestUpdate();
        }
    }
    get rules() {
        return this.#rules;
    }
    performUpdate() {
        this.#view({ rules: this.#rules }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ServiceWorkerRouterView.js.map