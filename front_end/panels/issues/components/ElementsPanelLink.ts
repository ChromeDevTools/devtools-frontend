// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import {html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import elementsPanelLinkStyles from './elementsPanelLink.css.js';

export interface ViewInput {
  onElementRevealIconClick: () => void;
  onElementRevealIconMouseEnter: () => void;
  onElementRevealIconMouseLeave: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${elementsPanelLinkStyles}</style>
    <button
      class="element-reveal-icon"
      jslog=${VisualLogging.link('elements-panel').track({click: true})}
      @click=${input.onElementRevealIconClick}
      @mouseenter=${input.onElementRevealIconMouseEnter}
      @mouseleave=${input.onElementRevealIconMouseLeave}></button>
    `, target);
  // clang-format on
};

export interface ElementsPanelLinkData {
  onElementRevealIconClick: () => void;
  onElementRevealIconMouseEnter: () => void;
  onElementRevealIconMouseLeave: () => void;
}
export class ElementsPanelLink extends UI.Widget.Widget {
  #onElementRevealIconClick: () => void = () => {};
  #onElementRevealIconMouseEnter: () => void = () => {};
  #onElementRevealIconMouseLeave: () => void = () => {};
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  set onElementRevealIconClick(onElementRevealIconClick: () => void) {
    if (this.#onElementRevealIconClick === onElementRevealIconClick) {
      return;
    }
    this.#onElementRevealIconClick = onElementRevealIconClick;
    this.requestUpdate();
  }

  set onElementRevealIconMouseEnter(onElementRevealIconMouseEnter: () => void) {
    if (this.#onElementRevealIconMouseEnter === onElementRevealIconMouseEnter) {
      return;
    }
    this.#onElementRevealIconMouseEnter = onElementRevealIconMouseEnter;
    this.requestUpdate();
  }

  set onElementRevealIconMouseLeave(onElementRevealIconMouseLeave: () => void) {
    if (this.#onElementRevealIconMouseLeave === onElementRevealIconMouseLeave) {
      return;
    }
    this.#onElementRevealIconMouseLeave = onElementRevealIconMouseLeave;
    this.requestUpdate();
  }

  set data(data: ElementsPanelLinkData) {
    this.onElementRevealIconClick = data.onElementRevealIconClick;
    this.onElementRevealIconMouseEnter = data.onElementRevealIconMouseEnter;
    this.onElementRevealIconMouseLeave = data.onElementRevealIconMouseLeave;
  }

  override performUpdate(): void {
    this.#view({
      onElementRevealIconClick: this.#onElementRevealIconClick,
      onElementRevealIconMouseEnter: this.#onElementRevealIconMouseEnter,
      onElementRevealIconMouseLeave: this.#onElementRevealIconMouseLeave,
    },
               undefined, this.contentElement);
  }
}
