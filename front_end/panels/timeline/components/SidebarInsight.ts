// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import sidebarInsightStyles from './sidebarInsight.css.js';

export interface InsightDetails {
  title: string;
}

export class SidebarInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #insightTitle: string = '';

  set data(data: InsightDetails) {
    this.#insightTitle = data.title;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    const output = LitHtml.html`
        <div class="insight">
            <h3 class="insight-title">${this.#insightTitle}</h3>
            <slot name="insight-description"></slot>
            <slot name="insight-content"></slot>
        </div>`;
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insight': SidebarInsight;
  }
}

customElements.define('devtools-performance-sidebar-insight', SidebarInsight);
