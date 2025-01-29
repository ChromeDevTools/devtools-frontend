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
import type {TableData} from './Table.js';

const {html} = Lit;

const UIStrings = {
  /**
   *@description Title of a list to provide related stack trace data
   */
  relatedStackTrace: 'Stack trace',
  /**
   *@description Text to describe the top time-consuming function call
   */
  topTimeConsumingFunctionCall: 'Top function call',
  /**
   * @description Text to describe the total reflow time
   */
  totalReflowTime: 'Total reflow time',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/ForcedReflow.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ForcedReflow extends BaseInsightComponent<ForcedReflowInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-forced-reflow`;
  override internalName: string = 'forced-reflow';

  #linkifyUrl(callFrame: Trace.Types.Events.CallFrame|Protocol.Runtime.CallFrame): Lit.LitTemplate {
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
    if (!this.model || !this.model.topLevelFunctionCallData) {
      return Lit.nothing;
    }

    const topLevelFunctionCallData = this.model.topLevelFunctionCallData.topLevelFunctionCall;
    const totalReflowTime = this.model.topLevelFunctionCallData.totalReflowTime;
    const bottomUpCallStackData = this.model.aggregatedBottomUpData;
    const time = (us: Trace.Types.Timing.Micro): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));
    // clang-format off
    return html`
      <div class="insight-section">
        ${html`<devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.topTimeConsumingFunctionCall), i18nString(UIStrings.totalReflowTime)],
            rows: [{values:[this.#linkifyUrl(topLevelFunctionCallData), time(Trace.Types.Timing.Micro(totalReflowTime))]}],
            } as TableData}>
        </devtools-performance-table>`}
      </div>
      <div class="insight-section">
        ${html`<devtools-performance-table
        .data=${{
          insight: this,
          headers: [i18nString(UIStrings.relatedStackTrace)],
          rows: bottomUpCallStackData.map(data => ({
            values: [this.#linkifyUrl(data.bottomUpData)],
            overlays: this.#createOverlayForEvents(data.relatedEvents),
          })),
        } as TableData}>
        </devtools-performance-table>`}
      </div>`;
    // clang-format on
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model || !this.model.topLevelFunctionCallData) {
      return [];
    }

    return this.#createOverlayForEvents(this.model.topLevelFunctionCallData.topLevelFunctionCallEvents);
  }

  #createOverlayForEvents(events: Trace.Types.Events.Event[]): Overlays.Overlays.TimelineOverlay[] {
    return events.map(e => ({
                        type: 'ENTRY_OUTLINE',
                        entry: e,
                        outlineReason: 'INFO',
                      }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-forced-reflow': ForcedReflow;
  }
}

customElements.define('devtools-performance-forced-reflow', ForcedReflow);
