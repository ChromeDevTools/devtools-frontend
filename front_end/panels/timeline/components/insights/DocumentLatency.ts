// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Category} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides a breakdown for how long it took to download the main document.
   */
  title: 'Document request latency',
  /**
   * @description Text to tell the user that the document request does not have redirects.
   */
  passingRedirects: 'Avoids redirects',
  /**
   * @description Text to tell the user that the document request had redirects.
   */
  failedRedirects: 'Had redirects',
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is acceptable.
   */
  passingServerResponseTime: 'Server responds quickly',
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is not acceptable.
   */
  failedServerResponseTime: 'Server responded slowly',
  /**
   * @description Text to tell the user that text compression (like gzip) was applied.
   */
  passingTextCompression: 'Applies text compression',
  /**
   * @description Text to tell the user that text compression (like gzip) was not applied.
   */
  failedTextCompression: 'No compression applied',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/DocumentLatency.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class DocumentLatency extends BaseInsight {
  static readonly litTagName = LitHtml.literal`devtools-performance-document-latency`;
  override insightCategory: Category = Category.ALL;
  override internalName: string = 'document-latency';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = '';

  #check(didPass: boolean, good: string, bad: string): LitHtml.TemplateResult {
    const icon = didPass ? 'check-circle' : 'clear';

    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName}
        name=${icon}
        class=${didPass ? 'metric-value-good' : 'metric-value-bad'}
      ></${IconButton.Icon.Icon.litTagName}>
      <span>${didPass ? good : bad}</span>
    `;
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const insight = Trace.Insights.Common.getInsight('DocumentLatency', this.data.insights, this.data.insightSetKey);
    if (!insight?.data?.documentRequest) {
      return [];
    }

    // TODO(crbug.com/352244434) add breakdown for server response time, queing, redirects, etc...
    return [{
      type: 'ENTRY_SELECTED',
      entry: insight.data.documentRequest,
    }];
  }

  #renderInsight(insight: Trace.Insights.Types.InsightResults['DocumentLatency']): LitHtml.LitTemplate {
    if (!insight.data) {
      return LitHtml.nothing;
    }

    // clang-format off
    return LitHtml.html`
    <div class="insights">
      <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            description: this.description,
            expanded: this.isActive(),
            internalName: this.internalName,
            estimatedSavings: insight.metricSavings?.FCP,
        } as SidebarInsight.InsightDetails}
        @insighttoggleclick=${this.onSidebarClick}
      >
        <div slot="insight-content" class="insight-section">
          <ul class="insight-results insight-icon-results">
            <li class="insight-entry">
              ${this.#check(insight.data.redirectDuration === 0,
                i18nString(UIStrings.passingRedirects), i18nString(UIStrings.failedRedirects))}
            </li>
            <li class="insight-entry">
              ${this.#check(!insight.data.serverResponseTooSlow,
                i18nString(UIStrings.passingServerResponseTime), i18nString(UIStrings.failedServerResponseTime))}
            </li>
            <li class="insight-entry">
              ${this.#check(insight.data.uncompressedResponseBytes === 0,
                i18nString(UIStrings.passingTextCompression), i18nString(UIStrings.failedTextCompression))}
            </li>
          </ul>
        </div>
      </${SidebarInsight.SidebarInsight}>
    </div>`;
    // clang-format on
  }

  override render(): void {
    const insight = Trace.Insights.Common.getInsight('DocumentLatency', this.data.insights, this.data.insightSetKey);
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = matchesCategory && insight?.data ? this.#renderInsight(insight) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-document-latency': DocumentLatency;
  }
}

customElements.define('devtools-performance-document-latency', DocumentLatency);
