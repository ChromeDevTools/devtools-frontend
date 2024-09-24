// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as Insights from './insights/insights.js';
import {type ActiveInsight} from './Sidebar.js';
import styles from './sidebarInsightsTab.css.js';
import {SidebarSingleInsightSet, type SidebarSingleInsightSetData} from './SidebarSingleInsightSet.js';

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

  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #insights: Trace.Insights.Types.TraceInsightSets|null = null;
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

    // TODO(crbug.com/366049346): move "shouldShow" logic to insight result (rather than the component),
    // and if none are visible, exclude it here.
    this.#insights = data;
    this.#insightSetKey = null;
    if (!this.#insights || !this.#parsedTrace) {
      return;
    }

    // Select by default the first non-trivial insight set:
    // - greater than 5s in duration
    // - or, has a navigation
    // In practice this means selecting either the first or the second insight set.
    const trivialThreshold = Trace.Helpers.Timing.millisecondsToMicroseconds(Trace.Types.Timing.MilliSeconds(5000));
    const insightSets = [...this.#insights.values()];
    this.#insightSetKey =
        insightSets.find(insightSet => insightSet.navigation || insightSet.bounds.range > trivialThreshold)?.id
        // If everything is "trivial", just select the first one.
        ?? insightSets[0]?.id ?? null;

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

  #insightSetClicked(id: string): void {
    // Update the active insight set.
    if (id !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    this.#insightSetKey = id;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightSetHovered(id: string): void {
    const data = this.#insights?.get(id);
    data && this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered(data.bounds));
  }

  #insightSetUnhovered(): void {
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered());
  }

  #render(): void {
    if (!this.#parsedTrace || !this.#insights) {
      LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
      return;
    }

    const hasMultipleInsightSets = this.#insights.size > 1;

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

      <div class="insight-sets-wrapper">
        ${[...this.#insights.values()].map(({id, label}) => {
          const data = {
            parsedTrace: this.#parsedTrace,
            insights: this.#insights,
            insightSetKey: id,
            activeCategory: this.#selectedCategory,
            activeInsight: this.#activeInsight,
          };

          const contents = LitHtml.html`
            <${SidebarSingleInsightSet.litTagName}
              .data=${data as SidebarSingleInsightSetData}>
            </${SidebarSingleInsightSet.litTagName}>
          `;

          if (hasMultipleInsightSets) {
            return LitHtml.html`<details
              ?open=${id === this.#insightSetKey}
            >
              <summary
                @click=${() => this.#insightSetClicked(id)}
                @mouseenter=${() => this.#insightSetHovered(id)}
                @mouseleave=${() => this.#insightSetUnhovered()}
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
