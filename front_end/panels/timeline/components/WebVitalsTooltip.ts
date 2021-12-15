// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import webVitalsTooltipStyles from './WebVitalsTooltip.css.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-timeline-webvitals-tooltip': WebVitalsTooltip;
  }
}

export interface WebVitalsTooltipData {
  content: LitHtml.TemplateResult|null;
}

export class WebVitalsTooltip extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-timeline-webvitals-tooltip`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #content: LitHtml.TemplateResult|null = null;

  set data(data: WebVitalsTooltipData) {
    this.#content = data.content;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [webVitalsTooltipStyles];
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`<div class="tooltip">
        ${this.#content}
      </div>
    `, this.#shadow, {host: this});
    // clang-format off
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-timeline-webvitals-tooltip', WebVitalsTooltip);
