// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Utils from '../utils/utils.js';

import * as Insights from './insights/insights.js';
import {type ActiveInsight} from './Sidebar.js';
import styles from './sidebarInsightsTab.css.js';
import {SidebarSingleInsightSet, type SidebarSingleInsightSetData} from './SidebarSingleInsightSet.js';

const FEEDBACK_URL = 'https://crbug.com/371170842' as Platform.DevToolsPath.UrlString;

const UIStrings = {
  /**
   *@description text show in feedback button
   */
  feedbackButton: 'Feedback',
  /**
   *@description text show in feedback tooltip
   */
  feedbackTooltip: 'Insights is an experimental feature. Your feedback will help us improve it.',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarInsightsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SidebarInsightsTab extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-sidebar-insights`;
  readonly #boundRender = this.#render.bind(this);
  readonly #shadow = this.attachShadow({mode: 'open'});

  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;
  #insights: Trace.Insights.Types.TraceInsightSets|null = null;
  #activeInsight: ActiveInsight|null = null;
  #selectedCategory = Insights.Types.Category.ALL;
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

    // Only update the insightSetKey if there is an active insight. Otherwise, closing an insight
    // would also collapse the insight set. Usually the proper insight set is already set because
    // the user has it open already in order for this setter to be called, but insights can also
    // be activated by clicking on a insight chip in the Summary panel, which may require opening
    // a different insight set.
    if (this.#activeInsight) {
      this.#insightSetKey = this.#activeInsight.insightSetKey;
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightSetToggled(id: string): void {
    this.#insightSetKey = this.#insightSetKey === id ? null : id;
    // Update the active insight set.
    if (this.#insightSetKey !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #insightSetHovered(id: string): void {
    const data = this.#insights?.get(id);
    data && this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered(data.bounds));
  }

  #insightSetUnhovered(): void {
    this.dispatchEvent(new Insights.SidebarInsight.InsightSetHovered());
  }

  #onFeedbackClick(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(FEEDBACK_URL);
  }

  #render(): void {
    if (!this.#parsedTrace || !this.#insights) {
      LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
      return;
    }

    const hasMultipleInsightSets = this.#insights.size > 1;
    const labels = Utils.Helpers.createUrlLabels([...this.#insights.values()].map(({url}) => url));

    // clang-format off
    const html = LitHtml.html`
      <div class="insight-sets-wrapper">
        ${[...this.#insights.values()].map(({id, url}, index) => {
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
                @click=${() => this.#insightSetToggled(id)}
                @mouseenter=${() => this.#insightSetHovered(id)}
                @mouseleave=${() => this.#insightSetUnhovered()}
                title=${url.href}
                >${labels[index]}</summary>
              ${contents}
            </details>`;
          }

          return contents;
        })}
      </div>

      <div class="feedback-wrapper">
        <${Buttons.Button.Button.litTagName} .variant=${Buttons.Button.Variant.OUTLINED} .iconName=${'experiment'} @click=${this.#onFeedbackClick}>
          ${i18nString(UIStrings.feedbackButton)}
        </${Buttons.Button.Button.litTagName}>

        <p class="tooltip">${i18nString(UIStrings.feedbackTooltip)}</p>
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
