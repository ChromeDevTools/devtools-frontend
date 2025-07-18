// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Checklist.js';

import type {DocumentLatencyInsightModel} from '../../../../models/trace/insights/DocumentLatency.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const {html} = Lit;

export class DocumentLatency extends BaseInsightComponent<DocumentLatencyInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-document-latency`;
  override internalName = 'document-latency';

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model?.data) {
      return Lit.nothing;
    }

    // clang-format off
    return html`<devtools-performance-checklist .checklist=${this.model.data.checklist}></devtools-performance-checklist>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-document-latency': DocumentLatency;
  }
}

customElements.define('devtools-performance-document-latency', DocumentLatency);
