// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import sidebarInsightStyles from './sidebarInsight.css.js';

export interface InsightDetails {
  title: string;
  expanded: boolean;
}

export class InsightActivated extends Event {
  static readonly eventName = 'insightactivated';

  constructor(
      public name: string, public navigationId: string,
      public createOverlayFn: () => Array<Overlays.Overlays.TimelineOverlay>) {
    super(InsightActivated.eventName, {bubbles: true, composed: true});
  }
}

export class InsightDeactivated extends Event {
  static readonly eventName = 'insightdeactivated';
  constructor() {
    super(InsightDeactivated.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    [InsightActivated.eventName]: InsightActivated;
    [InsightDeactivated.eventName]: InsightDeactivated;
  }
}

export class SidebarInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #insightTitle: string = '';
  #expanded: boolean = false;

  set data(data: InsightDetails) {
    this.#insightTitle = data.title;
    this.#expanded = data.expanded;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sidebarInsightStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    let output: LitHtml.TemplateResult;
    if (!this.#expanded) {
      output = LitHtml.html`
        <div class="insight closed">
            <h3 class="insight-title">${this.#insightTitle}</h3>
        </div>`;
    } else {
      output = LitHtml.html`
        <div class="insight">
            <h3 class="insight-title">${this.#insightTitle}</h3>
            <slot name="insight-description"></slot>
            <slot name="insight-content"></slot>
        </div>`;
    }
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insight': SidebarInsight;
  }
}

customElements.define('devtools-performance-sidebar-insight', SidebarInsight);
