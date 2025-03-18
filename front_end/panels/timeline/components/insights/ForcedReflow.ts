// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import type {ForcedReflowInsightModel} from '../../../../models/trace/insights/ForcedReflow.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LegacyComponents from '../../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {createLimitedRows, renderOthersLabel, type TableData, type TableDataRow} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.ForcedReflow;

const {html, nothing} = Lit;

export class ForcedReflow extends BaseInsightComponent<ForcedReflowInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-forced-reflow`;

  mapToRow(data: Trace.Insights.Models.ForcedReflow.BottomUpCallStack): TableDataRow {
    return {
      values: [this.#linkifyUrl(data.bottomUpData)],
      overlays: this.#createOverlayForEvents(data.relatedEvents),
    };
  }

  createAggregatedTableRow(remaining: Trace.Insights.Models.ForcedReflow.BottomUpCallStack[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length)],
      overlays: remaining.flatMap(r => this.#createOverlayForEvents(r.relatedEvents)),
    };
  }

  override internalName = 'forced-reflow';

  #linkifyUrl(callFrame: Trace.Types.Events.CallFrame|Protocol.Runtime.CallFrame|null): Lit.LitTemplate {
    if (!callFrame) {
      // TODO: Remove this style hack.
      return html`<div style="margin: 4px 10px; font-style: italic">${i18nString(UIStrings.unattributed)}</div>`;
    }

    const linkifier = new LegacyComponents.Linkifier.Linkifier();
    const stackTrace: Protocol.Runtime.StackTrace = {
      callFrames: [
        {
          functionName: callFrame.functionName,
          scriptId: callFrame.scriptId as Protocol.Runtime.ScriptId,
          url: callFrame.url,
          lineNumber: callFrame.lineNumber,
          columnNumber: callFrame.columnNumber,
        },
      ],
    };
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const callFrameContents = LegacyComponents.JSPresentationUtils.buildStackTracePreviewContents(
        target, linkifier, {stackTrace, tabStops: true, showColumnNumber: true});
    return html`${callFrameContents.element}`;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const topLevelFunctionCallData = this.model.topLevelFunctionCallData;
    const bottomUpCallStackData = this.model.aggregatedBottomUpData;
    const time = (us: Trace.Types.Timing.Micro): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    const rows = createLimitedRows(bottomUpCallStackData, this);

    // clang-format off
    return html`
      ${topLevelFunctionCallData ? html`
        <div class="insight-section">
          <devtools-performance-table
            .data=${{
              insight: this,
              headers: [i18nString(UIStrings.topTimeConsumingFunctionCall), i18nString(UIStrings.totalReflowTime)],
              rows: [{
                values: [
                  this.#linkifyUrl(topLevelFunctionCallData.topLevelFunctionCall),
                  time(Trace.Types.Timing.Micro(topLevelFunctionCallData.totalReflowTime)),
                ],
                overlays: this.#createOverlayForEvents(topLevelFunctionCallData.topLevelFunctionCallEvents, 'INFO'),
              }],
            } as TableData}>
          </devtools-performance-table>
        </div>
      ` : nothing}
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.relatedStackTrace)],
            rows,
        } as TableData}>
        </devtools-performance-table>
      </div>`;
    // clang-format on
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model || !this.model.topLevelFunctionCallData) {
      return [];
    }

    const allBottomUpEvents = [...this.model.aggregatedBottomUpData.values().flatMap(data => data.relatedEvents)];
    return [
      ...this.#createOverlayForEvents(this.model.topLevelFunctionCallData.topLevelFunctionCallEvents, 'INFO'),
      ...this.#createOverlayForEvents(allBottomUpEvents),
    ];
  }

  #createOverlayForEvents(events: Trace.Types.Events.Event[], outlineReason: 'ERROR'|'INFO' = 'ERROR'):
      Overlays.Overlays.TimelineOverlay[] {
    return events.map(e => ({
                        type: 'ENTRY_OUTLINE',
                        entry: e,
                        outlineReason,
                      }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-forced-reflow': ForcedReflow;
  }
}

customElements.define('devtools-performance-forced-reflow', ForcedReflow);
