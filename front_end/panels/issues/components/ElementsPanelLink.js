// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import { html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import elementsPanelLinkStyles from './elementsPanelLink.css.js';
export class ElementsPanelLink extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #onElementRevealIconClick = () => { };
    #onElementRevealIconMouseEnter = () => { };
    #onElementRevealIconMouseLeave = () => { };
    set data(data) {
        this.#onElementRevealIconClick = data.onElementRevealIconClick;
        this.#onElementRevealIconMouseEnter = data.onElementRevealIconMouseEnter;
        this.#onElementRevealIconMouseLeave = data.onElementRevealIconMouseLeave;
        this.#update();
    }
    #update() {
        this.#render();
    }
    #render() {
        // clang-format off
        render(html `
      <style>${elementsPanelLinkStyles}</style>
      <span
        class="element-reveal-icon"
        jslog=${VisualLogging.link('elements-panel').track({ click: true })}
        @click=${this.#onElementRevealIconClick}
        @mouseenter=${this.#onElementRevealIconMouseEnter}
        @mouseleave=${this.#onElementRevealIconMouseLeave}></span>
      `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-elements-panel-link', ElementsPanelLink);
//# sourceMappingURL=ElementsPanelLink.js.map