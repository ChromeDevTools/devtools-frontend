// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {CacheInsightModel} from '../../../../models/trace/insights/Cache.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import {createLimitedRows, renderOthersLabel, type TableData, type TableDataRow} from './Table.js';

const {UIStrings, i18nString, createOverlayForRequest} = Trace.Insights.Models.Cache;

const {html} = Lit;

export class Cache extends BaseInsightComponent<CacheInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-cache`;
  override internalName = 'cache';

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  mapToRow(req: Trace.Insights.Models.Cache.CacheableRequest): TableDataRow {
    return {
      values: [eventRef(req.request), i18n.TimeUtilities.secondsToString(req.ttl)],
      overlays: [createOverlayForRequest(req.request)],
    };
  }

  createAggregatedTableRow(remaining: Trace.Insights.Models.Cache.CacheableRequest[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length), ''],
      overlays: remaining.flatMap(r => createOverlayForRequest(r.request)),
    };
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const cacheableRequests = [...this.model.requests];
    const topRequests =
        cacheableRequests.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);

    const rows = createLimitedRows(topRequests, this);

    if (!rows.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noRequestsToCache)}</div>`;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.requestColumn), i18nString(UIStrings.cacheTTL)],
            rows,
          } as TableData}>
        </devtools-performance-table>
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-cache': Cache;
  }
}

customElements.define('devtools-performance-cache', Cache);
