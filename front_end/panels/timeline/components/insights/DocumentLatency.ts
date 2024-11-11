// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {DocumentLatencyInsightModel} from '../../../../models/trace/insights/DocumentLatency.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import {Category} from './types.js';

const {html} = LitHtml;

const UIStrings = {
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
  /**
   * @description Text for a label describing a network request event as having redirects.
   */
  redirectsLabel: 'Redirects',
  /**
   * @description Text for a label describing a network request event as taking too long to start delivery by the server.
   */
  serverResponseTimeLabel: 'Server response time',
  /**
   * @description Text for a label describing a network request event as taking longer to download because it wasn't compressed.
   */
  uncompressedDownload: 'Uncompressed download',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents a successful insight check
   *@example {Server response time} PH1
   */
  successAriaLabel: 'Insight check passed: {PH1}',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
   *@example {Server response time} PH1
   */
  failedAriaLabel: 'Insight check failed: {PH1}',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/DocumentLatency.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class DocumentLatency extends BaseInsightComponent<DocumentLatencyInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-document-latency`;
  override insightCategory: Category = Category.ALL;
  override internalName: string = 'document-latency';

  #check(didPass: boolean, good: string, bad: string): LitHtml.TemplateResult {
    const icon = didPass ? 'check-circle' : 'clear';

    const ariaLabel = didPass ? i18nString(UIStrings.successAriaLabel, {PH1: good}) :
                                i18nString(UIStrings.failedAriaLabel, {PH1: bad});
    return html`
      <devtools-icon
        aria-label=${ariaLabel}
        name=${icon}
        class=${didPass ? 'metric-value-good' : 'metric-value-bad'}
      ></devtools-icon>
      <span>${didPass ? good : bad}</span>
    `;
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model?.data?.documentRequest) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    const event = this.model.data.documentRequest;
    const redirectDurationMicro = Trace.Helpers.Timing.millisecondsToMicroseconds(this.model.data.redirectDuration);

    const sections = [];
    if (this.model.data.redirectDuration) {
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          event.ts,
          (event.ts + redirectDurationMicro) as Trace.Types.Timing.MicroSeconds,
      );
      sections.push({bounds, label: i18nString(UIStrings.redirectsLabel), showDuration: true});
      overlays.push({type: 'CANDY_STRIPED_TIME_RANGE', bounds, entry: event});
    }
    if (this.model.data.serverResponseTooSlow) {
      const serverResponseTimeMicro =
          Trace.Helpers.Timing.millisecondsToMicroseconds(this.model.data.serverResponseTime);
      // NOTE: NetworkRequestHandlers never makes a synthetic network request event if `timing` is missing.
      const sendEnd = event.args.data.timing?.sendEnd ?? Trace.Types.Timing.MilliSeconds(0);
      const sendEndMicro = Trace.Helpers.Timing.millisecondsToMicroseconds(sendEnd);
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          sendEndMicro,
          (sendEndMicro + serverResponseTimeMicro) as Trace.Types.Timing.MicroSeconds,
      );
      sections.push({bounds, label: i18nString(UIStrings.serverResponseTimeLabel), showDuration: true});
    }
    if (this.model.data.uncompressedResponseBytes) {
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          event.args.data.syntheticData.downloadStart,
          (event.args.data.syntheticData.downloadStart + event.args.data.syntheticData.download) as
              Trace.Types.Timing.MicroSeconds,
      );
      sections.push({bounds, label: i18nString(UIStrings.uncompressedDownload), showDuration: true});
      overlays.push({type: 'CANDY_STRIPED_TIME_RANGE', bounds, entry: event});
    }

    if (sections.length) {
      overlays.push({
        type: 'TIMESPAN_BREAKDOWN',
        sections,
        entry: this.model.data.documentRequest,
        // Always render below because the document request is guaranteed to be
        // the first request in the network track.
        renderLocation: 'BELOW_EVENT',
      });
    }
    overlays.push({
      type: 'ENTRY_SELECTED',
      entry: this.model.data.documentRequest,
    });

    return overlays;
  }

  #renderInsight(): LitHtml.LitTemplate {
    if (!this.model?.data) {
      return LitHtml.nothing;
    }

    // clang-format off
    return html`
    <div class="insights">
      <devtools-performance-sidebar-insight .data=${{
            title: this.model.title,
            description: this.model.description,
            expanded: this.isActive(),
            internalName: this.internalName,
            estimatedSavingsTime: this.model.metricSavings?.FCP,
            estimatedSavingsBytes: this.model.data.uncompressedResponseBytes,
        }}
        @insighttoggleclick=${this.onSidebarClick}
      >
        <div slot="insight-content" class="insight-section">
          <ul class="insight-results insight-icon-results">
            <li class="insight-entry">
              ${this.#check(this.model.data.redirectDuration === 0,
                i18nString(UIStrings.passingRedirects), i18nString(UIStrings.failedRedirects))}
            </li>
            <li class="insight-entry">
              ${this.#check(!this.model.data.serverResponseTooSlow,
                i18nString(UIStrings.passingServerResponseTime), i18nString(UIStrings.failedServerResponseTime))}
            </li>
            <li class="insight-entry">
              ${this.#check(this.model.data.uncompressedResponseBytes === 0,
                i18nString(UIStrings.passingTextCompression), i18nString(UIStrings.failedTextCompression))}
            </li>
          </ul>
        </div>
      </devtools-performance-sidebar-insight>
    </div>`;
        // clang-format on
  }

  override render(): void {
    if (this.model?.data === undefined) {
      return;
    }

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const hasFailure = this.model?.data?.redirectDuration > 0 || this.model?.data?.serverResponseTooSlow ||
        this.model.data.uncompressedResponseBytes > 0;
    const output = (matchesCategory && hasFailure) ? this.#renderInsight() : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-document-latency': DocumentLatency;
  }
}

customElements.define('devtools-performance-document-latency', DocumentLatency);
