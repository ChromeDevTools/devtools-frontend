// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import computedStylePropertyStyles from './computedStyleProperty.css.js';

const {classMap} = Directives;

export interface ViewInput {
  inherited: boolean;
  traceable: boolean;
  onNavigateToSource: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  render(html`
    <style>${computedStylePropertyStyles}</style>
    <div class=${classMap({'computed-style-property': true, inherited: input.inherited})}>
      <div class="property-name">
        <slot name="name"></slot>
      </div>
      <span class="hidden" aria-hidden="false">: </span>
      ${input.traceable ?
          html`<button class="goto" @click=${(event: Event) => {
            event.consume(true);
            input.onNavigateToSource();
          }} jslog=${VisualLogging.action('elements.jump-to-style').track({click:true})}></button>` :
          nothing}
      <div class="property-value">
        <slot name="value"></slot>
      </div>
      <span class="hidden" aria-hidden="false">;</span>
    </div>
  `, target);
  // clang-format on
};

export class ComputedStyleProperty extends UI.Widget.Widget {
  #inherited = false;
  #traceable = false;
  #onNavigateToSource: () => void = () => {};
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true, classes: ['computed-style-property']});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  set inherited(inherited: boolean) {
    if (inherited === this.#inherited) {
      return;
    }
    this.#inherited = inherited;
    this.requestUpdate();
  }

  set traceable(traceable: boolean) {
    if (traceable === this.#traceable) {
      return;
    }
    this.#traceable = traceable;
    this.requestUpdate();
  }

  set onNavigateToSource(onNavigateToSource: () => void) {
    if (onNavigateToSource === this.#onNavigateToSource) {
      return;
    }
    this.#onNavigateToSource = onNavigateToSource;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          inherited: this.#inherited,
          traceable: this.#traceable,
          onNavigateToSource: this.#onNavigateToSource,
        },
        undefined,
        this.contentElement,
    );
  }
}
