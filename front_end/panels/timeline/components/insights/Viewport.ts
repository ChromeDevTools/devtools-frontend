// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import {NodeLink, type NodeLinkData} from './NodeLink.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Category} from './types.js';

const UIStrings = {
  /** Title of an insight that provides details about if the page's viewport is optimized for mobile viewing. */
  title: 'Viewport not optimized for mobile',
  /**
   * @description Text to tell the user how a viewport meta element can improve performance. \xa0 is a non-breaking space
   */
  description:
      'The page\'s viewport is not mobile-optimized, resulting in all touch interactions [delayed by 200\xA0ms](https://developer.chrome.com/blog/300ms-tap-delay-gone-away/).',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/Viewport.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class Viewport extends BaseInsight {
  static override readonly litTagName = LitHtml.literal`devtools-performance-viewport`;
  override insightCategory: Category = Category.INP;
  override internalName: string = 'viewport';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = i18nString(UIStrings.description);

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    // TODO(b/351757418): create overlay for synthetic input delay events
    return [];
  }

  #render(insight: Trace.Insights.Types.InsightResults['Viewport']): LitHtml.TemplateResult {
    const backendNodeId = insight.viewportEvent?.args.data.node_id;

    // clang-format off
    return LitHtml.html`
        <div class="insights">
            <${SidebarInsight.SidebarInsight.litTagName} .data=${{
              title: this.userVisibleTitle,
              description: this.description,
              expanded: this.isActive(),
              internalName: this.internalName,
              estimatedSavingsTime: insight.metricSavings?.INP,
            } as SidebarInsight.InsightDetails}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-content" class="insight-section">
                  ${backendNodeId !== undefined ? LitHtml.html`<${NodeLink.litTagName}
                    .data=${{
                      backendNodeId,
                      options: {tooltip: insight.viewportEvent?.args.data.content},
                    } as NodeLinkData}>
                  </${NodeLink.litTagName}>` : LitHtml.nothing}
                </div>
            </${SidebarInsight.SidebarInsight}>
        </div>`;
    // clang-format on
  }

  override render(): void {
    const viewportInsight = Trace.Insights.Common.getInsight('Viewport', this.data.insights, this.data.insightSetKey);
    const shouldShow = viewportInsight && viewportInsight.mobileOptimized === false;

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = shouldShow && matchesCategory ? this.#render(viewportInsight) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-viewport': Viewport;
  }
}

customElements.define('devtools-performance-viewport', Viewport);
