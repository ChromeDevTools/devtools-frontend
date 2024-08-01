// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as Insights from './insights/insights.js';
import {type ActiveInsight} from './Sidebar.js';
import styles from './sidebarInsightsTab.css.js';
import {SidebarSingleNavigation, type SidebarSingleNavigationData} from './SidebarSingleNavigation.js';

export enum InsightsCategories {
  ALL = 'All',
  INP = 'INP',
  LCP = 'LCP',
  CLS = 'CLS',
  OTHER = 'Other',
}

export class SidebarInsightsTab extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insights`;
  readonly #boundRender = this.#render.bind(this);
  readonly #shadow = this.attachShadow({mode: 'open'});

  #traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null = null;
  #insights: TraceEngine.Insights.Types.TraceInsightData|null = null;
  #activeInsight: ActiveInsight|null = null;
  #selectedCategory: InsightsCategories = InsightsCategories.ALL;
  /**
   * When a trace has multiple navigations, we show an accordion with each
   * navigation in. You can only have one of these open at any time, and we
   * track it via this ID.
   */
  #activeNavigationId: string|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  set traceParsedData(data: TraceEngine.Handlers.Types.TraceParseData|null) {
    if (data === this.#traceParsedData) {
      return;
    }
    this.#traceParsedData = data;
    // When the trace data gets set, we clear the active navigation ID (as any old
    // navigation ID is now outdated) and we auto-set the first ID to be
    // active.
    if (data) {
      this.#activeNavigationId = data.Meta.mainFrameNavigations.at(0)?.args.data?.navigationId ?? null;
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set insights(data: TraceEngine.Insights.Types.TraceInsightData|null) {
    if (data === this.#insights) {
      return;
    }
    this.#insights = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set activeInsight(active: ActiveInsight|null) {
    if (active === this.#activeInsight) {
      return;
    }
    this.#activeInsight = active;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #onCategoryDropdownChange(event: Event): void {
    const target = event.target as HTMLOptionElement;
    const value = target.value as InsightsCategories;
    this.#selectedCategory = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #navigationClicked(id: string): void {
    // New navigation clicked. Update the active insight.
    if (id !== this.#activeInsight?.navigationId) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    this.#activeNavigationId = id;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#traceParsedData || !this.#insights) {
      LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
      return;
    }

    const navigations = this.#traceParsedData.Meta.mainFrameNavigations ?? [];

    const hasMultipleNavigations = navigations.length > 1;

    // clang-format off
    const html = LitHtml.html`
      <select class="chrome-select insights-category-select"
        @change=${this.#onCategoryDropdownChange}
        jslog=${VisualLogging.dropDown('timeline.sidebar-insights-category-select').track({click: true})}
      >
        ${Object.values(InsightsCategories).map(insightsCategory => {
          return LitHtml.html`
            <option value=${insightsCategory}>
              ${insightsCategory}
            </option>
          `;
        })}
      </select>

      <div class="navigations-wrapper">
        ${navigations.map(navigation => {
          const id = navigation.args.data?.navigationId;
          const url = navigation.args.data?.documentLoaderURL;
          if(!id || !url) {
            return LitHtml.nothing;
          }
          const data = {
            traceParsedData: this.#traceParsedData ?? null,
            insights: this.#insights,
            navigationId: id,
            activeCategory: this.#selectedCategory,
            activeInsight: this.#activeInsight,
          };

          const contents = LitHtml.html`
            <${SidebarSingleNavigation.litTagName}
              .data=${data as SidebarSingleNavigationData}>
            </${SidebarSingleNavigation.litTagName}>
          `;

          if(hasMultipleNavigations) {
            return LitHtml.html`<details
              ?open=${id === this.#activeNavigationId}
              class="navigation-wrapper"
            >
              <summary @click=${() => this.#navigationClicked(id)}>${url}</summary>
              ${contents}
            </details>`;
          }

          return contents;
        })}
      </div>
    `;
    // clang-format on
    LitHtml.render(LitHtml.html`${html}`, this.#shadow, {host: this});
  }
}

customElements.define('devtools-performance-sidebar-insights', SidebarInsightsTab);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-insights': SidebarInsightsTab;
  }
}
