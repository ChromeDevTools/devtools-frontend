// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {InsightsCategories} from './types.js';

export function getCLSInsight(insights: TraceEngine.Insights.Types.TraceInsightData|null, navigationId: string|null):
    TraceEngine.Insights.Types.InsightResult<{
      animationFailures?: readonly TraceEngine.Insights.InsightRunners.CumulativeLayoutShift
                           .NoncompositedAnimationFailure[],
      shifts?:
                Map<TraceEngine.Types.TraceEvents.TraceEventLayoutShift,
                    TraceEngine.Insights.InsightRunners.CumulativeLayoutShift.LayoutShiftRootCausesData>,
    }>|null {
  if (!insights || !navigationId) {
    return null;
  }

  const insightsByNavigation = insights.get(navigationId);
  if (!insightsByNavigation) {
    return null;
  }

  const clsInsight = insightsByNavigation.CumulativeLayoutShift;
  if (clsInsight instanceof Error) {
    return null;
  }
  return clsInsight;
}

export class CLSCulprits extends BaseInsight {
  static readonly litTagName = LitHtml.literal`devtools-performance-cls-culprits`;
  override insightCategory: InsightsCategories = InsightsCategories.CLS;
  override internalName: string = 'cls-culprits';
  override userVisibleTitle: string = 'Layout Shift Culprits';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    // TODO: create overlays
    return [];
  }

  #render(): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
        <div class="insights">
            <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            expanded: this.isActive(),
            } as SidebarInsight.InsightDetails}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-description" class="insight-description">
                    <p>Layout shifts happen when existing elements unexpectedly move.
                         Shifts are caused by nodes changing size or newly added. Investigate
                         and fix these culprits.</p>
                </div>
            </${SidebarInsight.SidebarInsight}>
        </div>`;
    // clang-format on
  }

  override render(): void {
    const clsInsight = getCLSInsight(this.data.insights, this.data.navigationId);
    const hasShifts = clsInsight?.shifts && clsInsight.shifts.size > 0;

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = hasShifts && matchesCategory ? this.#render() : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-cls-culprits': CLSCulprits;
  }
}

customElements.define('devtools-performance-cls-culprits', CLSCulprits);
