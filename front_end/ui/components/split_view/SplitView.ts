// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

const {html} = LitHtml;

// clean-css does not compile this file correctly. So as a workaround adding styles inline.
const styles = `
  :host {
    --current-main-area-size: 50%;
    --resizer-size: 3px;
    --min-main-area-size: 200px;
    --min-sidebar-size: 150px;
    --main-area-size: calc(max(var(--current-main-area-size), var(--min-main-area-size)));

    height: 100%;
    width: 100%;
    display: block;
    overflow: auto;
  }

  .wrapper {
    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
    container: sidebar / size; /* stylelint-disable-line property-no-unknown */
  }

  .container {
    --resizer-position: calc(min(var(--main-area-size), calc(100% - var(--min-sidebar-size))));
    --min-container-size: calc(var(--min-sidebar-size) + var(--min-main-area-size) + var(--resizer-size));

    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
    position: relative;
    gap: var(--resizer-size);

    min-width: var(--min-container-size);
  }

  #resizer {
    background-color: var(--sys-color-surface1);
    position: absolute;
    user-select: none;

    /* horizontal */
    width: var(--resizer-size);
    cursor: col-resize;
    left: var(--resizer-position);
    bottom: 0;
    top: 0;
  }

  slot {
    overflow: auto;
    display: block;
  }

  slot[name="main"] {

    /* horizontal */
    width: var(--resizer-position);
    min-width: var(--min-main-area-size);
  }

  slot[name="sidebar"] {
    flex: 1 0 0;

    min-width: var(--min-sidebar-size);
  }

  .horizontal .container {
    flex-direction: column;
    min-height: var(--min-container-size);
    min-width: auto;
  }

  .horizontal #resizer {
    width: auto;
    height: var(--resizer-size);
    cursor: row-resize;
    top: var(--resizer-position);
    left: 0;
    right: 0;
  }

  .horizontal slot[name="main"] {
    width: auto;
    min-width: auto;
    height: var(--resizer-position);
    min-height: var(--min-main-area-size);
  }

  .horizontal slot[name="sidebar"] {
    min-width: auto;
    min-height: var(--min-sidebar-size);
  }
`;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-split-view': SplitView;
  }
}

const splitViewStyles = new CSSStyleSheet();
splitViewStyles.replaceSync(styles);

export class SplitView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #mousePos = [0, 0];
  #mainAxisIdx = 0;
  #mainDimensions = [0, 0];
  #observer?: ResizeObserver;
  #horizontal = false;

  connectedCallback(): void {
    this.style.setProperty('--current-main-area-size', '60%');
    this.#shadow.adoptedStyleSheets = [splitViewStyles];
    this.#observer = new ResizeObserver(
        entries => this.#onResize(entries[0].contentRect),
    );
    this.#observer.observe(this);
    this.#render();
  }

  get horizontal(): boolean {
    return this.#horizontal;
  }

  set horizontal(horizontal: boolean) {
    this.#horizontal = horizontal;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onResize = (rect: DOMRectReadOnly): void => {
    const prevMainAxisIdx = this.#mainAxisIdx;
    if (rect.width <= 600 && rect.height >= 600 || this.#horizontal) {
      this.#mainAxisIdx = 1;
    } else {
      this.#mainAxisIdx = 0;
    }
    if (this.#mainAxisIdx !== prevMainAxisIdx) {
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
  };

  #onMouseDown = (event: MouseEvent): void => {
    const main = this.#shadow.querySelector('slot[name=main]');
    if (!main) {
      throw new Error('Main slot not found');
    }
    const rect = main.getBoundingClientRect();
    this.#mainDimensions = [rect.width, rect.height];
    this.#mousePos = [event.clientX, event.clientY];
    window.addEventListener('mousemove', this.#onMouseMove, true);
    window.addEventListener('mouseup', this.#onMouseUp, true);
  };

  #onMouseUp = (): void => {
    window.removeEventListener('mousemove', this.#onMouseMove, true);
    window.removeEventListener('mouseup', this.#onMouseUp, true);
  };

  #onMouseMove = (event: MouseEvent): void => {
    const mousePos = [event.clientX, event.clientY];
    const delta = mousePos[this.#mainAxisIdx] - this.#mousePos[this.#mainAxisIdx];
    const rect = this.getBoundingClientRect();
    const containerDimensions = [rect.width, rect.height];
    const length = ((this.#mainDimensions[this.#mainAxisIdx] + delta) * 100) / containerDimensions[this.#mainAxisIdx];
    this.style.setProperty('--current-main-area-size', length + '%');
  };

  #render = (): void => {
    // clang-format off
    LitHtml.render(
      html`
        <div class="wrapper ${this.#mainAxisIdx === 1 ? 'horizontal' : ''}">
          <div class="container">
            <slot name="main"></slot>
            <div id="resizer" @mousedown=${this.#onMouseDown}></div>
            <slot name="sidebar"></slot>
          </div>
        </div>
      `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

customElements.define(
    'devtools-split-view',
    SplitView,
);
