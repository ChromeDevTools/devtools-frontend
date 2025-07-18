// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type {INPBreakdownInsightModel} from '../../../../models/trace/insights/INPBreakdown.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const {UIStrings, i18nString, createOverlaysForSubpart} = Trace.Insights.Models.INPBreakdown;

const {html} = Lit;

export class INPBreakdown extends BaseInsightComponent<INPBreakdownInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-inp-breakdown`;
  override internalName = 'inp';

  protected override hasAskAiSupport(): boolean {
    return this.model?.longestInteractionEvent !== undefined;
  }

  override renderContent(): Lit.LitTemplate {
    const event = this.model?.longestInteractionEvent;
    if (!event) {
      return html`<div class="insight-section">${i18nString(UIStrings.noInteractions)}</div>`;
    }

    const time = (us: Trace.Types.Timing.Micro): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    // clang-format off
    return html`
      <div class="insight-section">
        ${html`<devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.subpart), i18nString(UIStrings.duration)],
            rows: [
              {
                values: [i18nString(UIStrings.inputDelay), time(event.inputDelay)],
                overlays: createOverlaysForSubpart(event, 0),
              },
              {
                values: [i18nString(UIStrings.processingDuration), time(event.mainThreadHandling)],
                overlays: createOverlaysForSubpart(event, 1),
              },
              {
                values: [i18nString(UIStrings.presentationDelay), time(event.presentationDelay)],
                overlays: createOverlaysForSubpart(event, 2),
              },
            ],
          }}>
        </devtools-performance-table>`}
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-inp-breakdown': INPBreakdown;
  }
}

customElements.define('devtools-performance-inp-breakdown', INPBreakdown);
