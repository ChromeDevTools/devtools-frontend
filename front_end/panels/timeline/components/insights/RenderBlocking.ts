// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LegacyComponents from '../../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Category} from './types.js';

const MAX_URL_LENGTH = 80;

const UIStrings = {
  /**
   * @description Title of an insight that provides the user with the list of network requests that blocked and therefore slowed down the page rendering and becoming visible to the user.
   */
  title: 'Render blocking requests',
  /**
   * @description Text to describe that there are requests blocking rendering, which may affect LCP.
   */
  description: 'Requests are blocking the page\'s initial render, which may delay LCP. ' +
      '[Deferring or inlining](https://web.dev/learn/performance/understanding-the-critical-path#render-blocking_resources/) ' +
      'can move these network requests out of the critical path.',
  /**
   * @description Label to describe the blocking requests that took the longest to load.
   */
  longestBlockingRequests: 'Longest render-blocking requests',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/RenderBlocking.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RenderBlockingRequests extends BaseInsight {
  static readonly litTagName = LitHtml.literal`devtools-performance-render-blocking-requests`;
  override insightCategory: Category = Category.LCP;
  override internalName: string = 'render-blocking-requests';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = i18nString(UIStrings.description);

  override connectedCallback(): void {
    super.connectedCallback();
    // Button style for linkified url.
    UI.UIUtils.injectTextButtonStyles(this.shadow);
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const insight = Trace.Insights.Common.getInsight('RenderBlocking', this.data.insights, this.data.insightSetKey);
    if (!insight) {
      return [];
    }

    const entryOutlineOverlays: Array<Overlays.Overlays.EntryOutline> = insight.renderBlockingRequests.map(req => {
      return {
        type: 'ENTRY_OUTLINE',
        entry: req,
        outlineReason: 'ERROR',
      };
    });
    return entryOutlineOverlays;
  }

  // TODO(crbug.com/368170718): handle long urls better than this.
  #linkifyUrl(url: string): HTMLElement {
    const options = {
      tabStop: true,
      showColumnNumber: false,
      inlineFrameIndex: 0,
      maxLength: MAX_URL_LENGTH,
    };

    const linkifiedURL =
        LegacyComponents.Linkifier.Linkifier.linkifyURL(url as Platform.DevToolsPath.UrlString, options);
    return linkifiedURL;
  }

  #renderRenderBlocking(insightResult: Trace.Insights.Types.InsightResults['RenderBlocking']): LitHtml.TemplateResult {
    const estimatedSavings = insightResult.metricSavings?.FCP;
    const MAX_REQUESTS = 3;
    const topRequests = insightResult.renderBlockingRequests.slice(0, MAX_REQUESTS);
    // clang-format off
    return LitHtml.html`
        <div class="insights">
          <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            description: this.description,
            internalName: this.internalName,
            expanded: this.isActive(),
            estimatedSavings,
          } as SidebarInsight.InsightDetails}
          @insighttoggleclick=${this.onSidebarClick}
        >
          <div slot="insight-content" class="insight-section">
            <p>
              <h3>${i18nString(UIStrings.longestBlockingRequests)}</h3>
              <ul class="url-list">
                ${topRequests.map(req => {
                  return LitHtml.html `
                    <li>${this.#linkifyUrl(req.args.data.url)}</li>
                  `;
                })}
              </ul>
            <p>
          </div>
        </${SidebarInsight.SidebarInsight}>
      </div>`;
    // clang-format on
  }

  override render(): void {
    const insight = Trace.Insights.Common.getInsight('RenderBlocking', this.data.insights, this.data.insightSetKey);
    const hasBlockingRequests = insight?.renderBlockingRequests && insight.renderBlockingRequests.length > 0;
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = hasBlockingRequests && matchesCategory ? this.#renderRenderBlocking(insight) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-render-blocking-requests': RenderBlockingRequests;
  }
}

customElements.define('devtools-performance-render-blocking-requests', RenderBlockingRequests);
