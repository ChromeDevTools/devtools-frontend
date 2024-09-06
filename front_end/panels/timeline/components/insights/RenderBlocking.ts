// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, md, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {InsightsCategories} from './types.js';

const UIStrings = {
  /**
   * @description Text to describe that there are requests blocking rendering, which may affect LCP.
   */
  description: 'Requests are blocking the page\'s initial render, which may delay LCP. ' +
      '[Deferring or inlining](https://web.dev/learn/performance/understanding-the-critical-path#render-blocking_resources/) ' +
      'can move these network requests out of the critical path.',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/RenderBlocking.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function getRenderBlockingInsight(
    insights: TraceEngine.Insights.Types.TraceInsightData|null,
    navigationId: string|null): TraceEngine.Insights.Types.InsightResults['RenderBlocking']|null {
  if (!insights || !navigationId) {
    return null;
  }

  const insightsByNavigation = insights.get(navigationId);
  if (!insightsByNavigation) {
    return null;
  }

  const insight = insightsByNavigation.RenderBlocking;
  if (insight instanceof Error) {
    return null;
  }
  return insight;
}

export class RenderBlockingRequests extends BaseInsight {
  static readonly litTagName = LitHtml.literal`devtools-performance-render-blocking-requests`;
  override insightCategory: InsightsCategories = InsightsCategories.LCP;
  override internalName: string = 'render-blocking-requests';
  override userVisibleTitle: string = 'Render-blocking requests';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const renderBlockingResults = getRenderBlockingInsight(this.data.insights, this.data.navigationId);
    if (!renderBlockingResults) {
      return [];
    }

    const entryOutlineOverlays: Array<Overlays.Overlays.EntryOutline> =
        renderBlockingResults.renderBlockingRequests.map(req => {
          return {
            type: 'ENTRY_OUTLINE',
            entry: req,
            outlineReason: 'ERROR',
          };
        });
    return entryOutlineOverlays;
  }

  #renderRenderBlocking(insightResult: TraceEngine.Insights.Types.InsightResults['RenderBlocking']):
      LitHtml.TemplateResult {
    const estimatedSavings = insightResult.metricSavings?.FCP;
    // clang-format off
    return LitHtml.html`
        <div class="insights">
          <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            expanded: this.isActive(),
            estimatedSavings,
          } as SidebarInsight.InsightDetails}
          @insighttoggleclick=${this.onSidebarClick}
        >
          <div slot="insight-description" class="insight-description">
            ${md(i18nString(UIStrings.description))}
          </div>
        </${SidebarInsight.SidebarInsight}>
      </div>`;
    // clang-format on
  }

  override render(): void {
    const renderBlockingResults = getRenderBlockingInsight(this.data.insights, this.data.navigationId);
    const hasBlockingRequests =
        renderBlockingResults?.renderBlockingRequests && renderBlockingResults.renderBlockingRequests.length > 0;
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output =
        hasBlockingRequests && matchesCategory ? this.#renderRenderBlocking(renderBlockingResults) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-render-blocking-requests': RenderBlockingRequests;
  }
}

customElements.define('devtools-performance-render-blocking-requests', RenderBlockingRequests);
