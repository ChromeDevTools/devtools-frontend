// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../../../models/trace/helpers/helpers.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import layoutShiftDetailsStyles from './layoutShiftDetails.css.js';

const UIStrings = {
  /**
   * @description Text for a Layout shift cluster event indictating that it is an insight.
   */
  insight: 'Insight',
  /**
   * @description Title for a Layout shift cluster event.
   */
  layoutShiftCulprits: 'Layout shift culprits',
  /**
   * @description Text indicating a Layout shift cluster.
   */
  layoutShiftCluster: 'Layout shift cluster',
  /**
   * @description Text referring to the start time of a Layout shift cluster event.
   */
  startTime: 'Start time',
  /**
   * @description Text referring to the duration of the Layout shift cluster event.
   */
  duration: 'Duration',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LayoutShiftClusterDetails.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class LayoutShiftClusterDetails extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-layout-shift-cluster-details`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #cluster?: Trace.Types.Events.SyntheticLayoutShiftCluster|null;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [layoutShiftDetailsStyles];
    this.#render();
  }

  setData(cluster: Trace.Types.Events.SyntheticLayoutShiftCluster, parsedTrace: Trace.Handlers.Types.ParsedTrace|null):
      void {
    if (this.#cluster === cluster) {
      return;
    }
    this.#cluster = cluster;
    this.#parsedTrace = parsedTrace;
    this.#render();
  }

  #renderInsightChip(): LitHtml.TemplateResult|null {
    if (!this.#cluster) {
      return null;
    }

    // clang-format off
    return LitHtml.html`
      <div class="insight-chip">
        <div class="insight-keyword">${i18nString(UIStrings.insight)}</div>
        ${i18nString(UIStrings.layoutShiftCulprits)}
      </div>
    `;
    // clang-format on
  }

  #renderTitle(): LitHtml.TemplateResult {
    return LitHtml.html`
      <div class="cluster-details-title">
        <div class="cluster-event-title"></div>${i18nString(UIStrings.layoutShiftCluster)}</div>
    `;
  }

  #renderDetails(
      cluster: Trace.Types.Events.SyntheticLayoutShiftCluster,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): LitHtml.TemplateResult|null {
    const ts = Trace.Types.Timing.MicroSeconds(cluster.ts - parsedTrace.Meta.traceBounds.min);
    const dur = cluster.dur ?? Trace.Types.Timing.MicroSeconds(0);

    // clang-format off
    return LitHtml.html`
        <div class="cluster-details">
            <div class="details-row"><div class="title">${i18nString(UIStrings.startTime)}</div><div class="value">${i18n.TimeUtilities.preciseMillisToString(Helpers.Timing.microSecondsToMilliseconds(ts))}</div></div>
            <div class="details-row"><div class="title">${i18nString(UIStrings.duration)}</div><div class="value">${i18n.TimeUtilities.preciseMillisToString(Helpers.Timing.microSecondsToMilliseconds(dur))}</div></div>
        </div>
    `;
    // clang-format on
  }

  #render(): void {
    if (!this.#cluster || !this.#parsedTrace) {
      return;
    }
    // clang-format off
    const output = LitHtml.html`
      <div class="layout-shift-cluster-summary-details">
      <div class="event-details">
          ${this.#renderTitle()}
          ${this.#renderDetails(this.#cluster, this.#parsedTrace)}
        </div>
        <div class="insight-categories">
          ${this.#renderInsightChip()}
        </div>
      </div>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-layout-shift-cluster-details': LayoutShiftClusterDetails;
  }
}

customElements.define('devtools-performance-layout-shift-cluster-details', LayoutShiftClusterDetails);
