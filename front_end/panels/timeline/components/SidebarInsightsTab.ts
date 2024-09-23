// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
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

/** Represents the portion of the trace that insights have been collected for. */
interface InsightSet {
  /** If for a navigation, this is the navigationId. Else it is NO_NAVIGATION. */
  id: string;
  /** The URL. Shown in the accordion list. */
  label: string;
}

export class SidebarInsightsTab extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insights`;
  readonly #boundRender = this.#render.bind(this);
  readonly #shadow = this.attachShadow({mode: 'open'});

  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #insights: Trace.Insights.Types.TraceInsightSets|null = null;
  #insightSets: InsightSet[]|null = null;
  #activeInsight: ActiveInsight|null = null;
  #selectedCategory: InsightsCategories = InsightsCategories.ALL;
  /**
   * When a trace has sets of insights, we show an accordion with each
   * set within. A set can be specific to a single navigation, or include the
   * beginning of the trace up to the first navigation.
   * You can only have one of these open at any time, and we track it via this ID.
   */
  #insightSetKey: string|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  set parsedTrace(data: Trace.Handlers.Types.ParsedTrace|null) {
    if (data === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = data;
    this.#insightSetKey = null;

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  set insights(data: Trace.Insights.Types.TraceInsightSets|null) {
    if (data === this.#insights) {
      return;
    }

    this.#insights = data;
    this.#insightSets = [];
    this.#insightSetKey = null;
    if (!this.#insights || !this.#parsedTrace) {
      return;
    }

    for (const insightSet of this.#insights.values()) {
      // TODO(crbug.com/366049346): move "shouldShow" logic to insight result (rather than the component),
      // and if none are visible, don't push the insight set.
      this.#insightSets.push({
        id: insightSet.id,
        label: insightSet.label,
      });
    }

    // TODO(crbug.com/366049346): skip the first insight set if trivial.
    this.#insightSetKey = this.#insightSets[0]?.id ?? null;

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
    if (id !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    this.#insightSetKey = id;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #navigationHovered(id: string): void {
    const data = this.#insights?.get(id);
    data && this.dispatchEvent(new Insights.SidebarInsight.NavigationBoundsHovered(data.bounds));
  }

  #navigationUnhovered(): void {
    this.dispatchEvent(new Insights.SidebarInsight.NavigationBoundsHovered());
  }

  #render(): void {
    if (!this.#parsedTrace || !this.#insights || !this.#insightSets) {
      LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
      return;
    }

    const hasMultipleInsightSets = this.#insightSets.length > 1;

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
        ${this.#insightSets.map(({id, label}) => {
          const data = {
            parsedTrace: this.#parsedTrace,
            insights: this.#insights,
            insightSetKey: id,
            activeCategory: this.#selectedCategory,
            activeInsight: this.#activeInsight,
          };

          const contents = LitHtml.html`
            <${SidebarSingleNavigation.litTagName}
              .data=${data as SidebarSingleNavigationData}>
            </${SidebarSingleNavigation.litTagName}>
          `;

          if (hasMultipleInsightSets) {
            return LitHtml.html`<details
              ?open=${id === this.#insightSetKey}
              class="navigation-wrapper"
            >
              <summary
                @click=${() => this.#navigationClicked(id)}
                @mouseenter=${() => this.#navigationHovered(id)}
                @mouseleave=${() => this.#navigationUnhovered()}
                >${label}</summary>
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
