// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Components from '../../overlays/components/components.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, md, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Table, type TableData} from './Table.js';
import {InsightsCategories} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides details about slow CSS selectors.
   */
  title: 'Slow CSS selectors',
  /**
   * @description Text to describe how to improve the performance of CSS selectors.
   */
  description:
      'Learn how to [assess the performance of CSS selectors](https://developer.chrome.com/docs/devtools/performance/selector-stats).',

  /**
   *@description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: 'Match attempts',
  /**
   *@description Column name for count of elements that matched a style rule
   */
  matchCount: 'Match count',
  /**
   *@description Column name for elapsed time spent computing a style rule
   */
  elapsed: 'Elapsed time',
  /**
   *@description Column name for the selectors that took the longest amount of time/effort.
   */
  topSelectors: 'Top selectors',
  /**
   *@description Column name for a total sum.
   */
  total: 'Total',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/SlowCSSSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SlowCSSSelector extends BaseInsight {
  static readonly litTagName = LitHtml.literal`devtools-performance-slow-css-selector`;
  override insightCategory: InsightsCategories = InsightsCategories.OTHER;
  override internalName: string = 'slow-css-selector';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  #slowCSSSelector: Trace.Insights.InsightRunners.SlowCSSSelector.SlowCSSSelectorInsightResult|null = null;

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.data.insights || !this.data.insightSetKey) {
      return [];
    }
    const {insightSetKey: navigationId, insights} = this.data;

    const insightsByNavigation = insights.get(navigationId);
    if (!insightsByNavigation) {
      return [];
    }

    const scsInsight: Error|Trace.Insights.InsightRunners.SlowCSSSelector.SlowCSSSelectorInsightResult =
        insightsByNavigation.data.SlowCSSSelector;
    if (scsInsight instanceof Error) {
      return [];
    }

    const sections: Array<Components.TimespanBreakdownOverlay.EntryBreakdown> = [];

    return [{
      type: 'TIMESPAN_BREAKDOWN',
      sections,
    }];
  }

  renderSlowCSSSelector(): LitHtml.LitTemplate {
    const time = (us: Trace.Types.Timing.MicroSeconds): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    // clang-format off
    return this.#slowCSSSelector ? LitHtml.html`
      <div class="insights">
        <${SidebarInsight.SidebarInsight.litTagName} .data=${{
              title: this.userVisibleTitle,
              internalName: this.internalName,
              expanded: this.isActive(),
          } as SidebarInsight.InsightDetails}
          @insighttoggleclick=${this.onSidebarClick}
        >
          <div slot="insight-description" class="insight-description">
            ${md(i18nString(UIStrings.description))}
          </div>
          <div slot="insight-content">
            ${LitHtml.html`<${Table.litTagName}
              .data=${{
                headers: [i18nString(UIStrings.total), ''],
                rows: [
                  [i18nString(UIStrings.elapsed), i18n.TimeUtilities.millisToString(this.#slowCSSSelector.totalElapsedMs)],
                  [i18nString(UIStrings.matchAttempts), this.#slowCSSSelector.totalMatchAttempts],
                  [i18nString(UIStrings.matchCount), this.#slowCSSSelector.totalMatchCount],
                ],
              } as TableData}>
            </${Table.litTagName}>`}
            ${LitHtml.html`<${Table.litTagName}
              .data=${{
                headers: [i18nString(UIStrings.topSelectors), i18nString(UIStrings.elapsed)],
                rows: this.#slowCSSSelector.topElapsedMs.map(selector => {
                  return [selector.selector, time(Trace.Types.Timing.MicroSeconds(selector['elapsed (us)']))];
                }),
              } as TableData}>
            </${Table.litTagName}>`}
            ${LitHtml.html`<${Table.litTagName}
              .data=${{
                headers: [i18nString(UIStrings.topSelectors), i18nString(UIStrings.matchAttempts)],
                rows: this.#slowCSSSelector.topMatchAttempts.map(selector => {
                  return [selector.selector, selector['match_attempts']];
                }),
              } as TableData}>
            </${Table.litTagName}>`}
          </div>
        </${SidebarInsight}>
      </div>` : LitHtml.nothing;
    // clang-format on
  }

  #hasDataToRender(): boolean {
    const selectorStatsFeatureEnabled =
        Common.Settings.Settings.instance().createSetting('timeline-capture-selector-stats', false);
    this.#slowCSSSelector = selectorStatsFeatureEnabled.get() ?
        Trace.Insights.Common.getInsight('SlowCSSSelector', this.data.insights, this.data.insightSetKey) :
        null;
    return this.#slowCSSSelector !== null;
  }

  override render(): void {
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const shouldRender = matchesCategory && this.#hasDataToRender();
    const output = shouldRender ? this.renderSlowCSSSelector() : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-slow-css-selector': SlowCSSSelector;
  }
}

customElements.define('devtools-performance-slow-css-selector', SlowCSSSelector);
