// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import computedStyleTraceStyles from './computedStyleTrace.css.js';
const { classMap } = Directives;
export const DEFAULT_VIEW = (input, _output, target) => {
    const onNavigateToSource = (event) => {
        event.consume(true);
        input.onNavigateToSource();
    };
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${computedStyleTraceStyles}</style>
    <div class=${classMap({ 'computed-style-trace': true, active: input.active, inactive: !input.active })}>
      <button class="goto" @click=${onNavigateToSource} jslog=${VisualLogging.action('elements.jump-to-style').track({ click: true })}></button>
      <slot name="trace-value" @click=${onNavigateToSource}></slot>
      <span class="trace-selector">${input.selector}</span>
      <span class="trace-link"><slot name="trace-link"></slot></span>
    </div>
  `, target, { container: { classes: ['computed-style-trace'] } });
    // clang-format on
};
export class ComputedStyleTrace extends UI.Widget.Widget {
    #selector = '';
    #active = false;
    #onNavigateToSource = () => { };
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: 'pure' });
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    set selector(selector) {
        if (selector === this.#selector) {
            return;
        }
        this.#selector = selector;
        this.requestUpdate();
    }
    set active(active) {
        if (active === this.#active) {
            return;
        }
        this.#active = active;
        this.requestUpdate();
    }
    set onNavigateToSource(onNavigateToSource) {
        if (onNavigateToSource === this.#onNavigateToSource) {
            return;
        }
        this.#onNavigateToSource = onNavigateToSource;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            selector: this.#selector,
            active: this.#active,
            onNavigateToSource: this.#onNavigateToSource,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ComputedStyleTrace.js.map