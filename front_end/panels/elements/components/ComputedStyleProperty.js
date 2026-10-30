// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import computedStylePropertyStyles from './computedStyleProperty.css.js';
const { classMap } = Directives;
export const DEFAULT_VIEW = (input, _output, target) => {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${computedStylePropertyStyles}</style>
    <div class=${classMap({ 'computed-style-property': true, inherited: input.inherited })}>
      <div class="property-name">
        <slot name="name"></slot>
      </div>
      <span class="hidden" aria-hidden="false">: </span>
      ${input.traceable ?
        html `<button class="goto" @click=${(event) => {
            event.consume(true);
            input.onNavigateToSource();
        }} jslog=${VisualLogging.action('elements.jump-to-style').track({ click: true })}></button>` :
        nothing}
      <div class="property-value">
        <slot name="value"></slot>
      </div>
      <span class="hidden" aria-hidden="false">;</span>
    </div>
  `, target, { container: { classes: ['computed-style-property'] } });
    // clang-format on
};
export class ComputedStyleProperty extends UI.Widget.Widget {
    #inherited = false;
    #traceable = false;
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
    set inherited(inherited) {
        if (inherited === this.#inherited) {
            return;
        }
        this.#inherited = inherited;
        this.requestUpdate();
    }
    set traceable(traceable) {
        if (traceable === this.#traceable) {
            return;
        }
        this.#traceable = traceable;
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
            inherited: this.#inherited,
            traceable: this.#traceable,
            onNavigateToSource: this.#onNavigateToSource,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=ComputedStyleProperty.js.map