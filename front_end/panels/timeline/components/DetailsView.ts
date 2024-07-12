// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as TraceEngine from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';

// *********************************************************************
// At the moment this file consists of helpers to aid in the rendering
// of events details in the bottom drawer. In the future, we should use
// LitHtml for this section, and update this helpers accordingly.
// *********************************************************************

const UIStrings = {
  /**
   *@description Text in the Performance panel for a forced style and layout calculation of elements
   * in a page. See https://developer.mozilla.org/en-US/docs/Glossary/Reflow
   */
  forcedReflow: 'Forced reflow',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   *@example {Forced reflow} PH1
   */
  sIsALikelyPerformanceBottleneck: '{PH1} is a likely performance bottleneck.',
  /**
   *@description Text in the Performance panel for a function called during a time the browser was
   * idle (inactive), which to longer to execute than a predefined deadline.
   *@example {10ms} PH1
   */
  idleCallbackExecutionExtended: 'Idle callback execution extended beyond deadline by {PH1}',
  /**
   *@description Text in the Performance panel which describes how long a task took.
   *@example {task} PH1
   *@example {10ms} PH2
   */
  sTookS: '{PH1} took {PH2}.',
  /**
   *@description Text in the Performance panel for a task that took long. See
   * https://developer.mozilla.org/en-US/docs/Glossary/Long_task
   */
  longTask: 'Long task',
  /**
   *@description Text used to highlight a long interaction and link to web.dev/inp
   */
  longInteractionINP: 'Long interaction',
  /**
   *@description Text in Timeline UIUtils of the Performance panel when the
   *             user clicks on a long interaction.
   *@example {Long interaction} PH1
   */
  sIsLikelyPoorPageResponsiveness: '{PH1} is indicating poor page responsiveness.',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  websocketProtocol: 'WebSocket Protocol',
  /**
   * @description Details text indicating how many bytes were received in a WebSocket message
   * @example {1024} PH1
   */
  webSocketBytes: '{PH1} byte(s)',
  /**
   * @description Details text indicating how many bytes were sent in a WebSocket message
   */
  webSocketDataLength: 'Data Length',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/DetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function buildWarningElementsForEvent(
    event: TraceEngine.Types.TraceEvents.TraceEventData,
    traceParsedData: TraceEngine.Handlers.Types.TraceParseData): HTMLSpanElement[] {
  const warnings = traceParsedData.Warnings.perEvent.get(event);
  const warningElements: HTMLSpanElement[] = [];
  if (!warnings) {
    return warningElements;
  }
  for (const warning of warnings) {
    const duration =
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(TraceEngine.Types.Timing.MicroSeconds(event.dur || 0));
    const span = document.createElement('span');
    switch (warning) {
      case 'FORCED_REFLOW': {
        const forcedReflowLink = UI.XLink.XLink.create(
            'https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts',
            i18nString(UIStrings.forcedReflow), undefined, undefined, 'forced-reflow');
        span.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sIsALikelyPerformanceBottleneck, {PH1: forcedReflowLink}));
        break;
      }
      case 'IDLE_CALLBACK_OVER_TIME': {
        if (!TraceEngine.Types.TraceEvents.isTraceEventFireIdleCallback(event)) {
          break;
        }
        const exceededMs =
            i18n.TimeUtilities.millisToString((duration || 0) - event.args.data['allottedMilliseconds'], true);
        span.textContent = i18nString(UIStrings.idleCallbackExecutionExtended, {PH1: exceededMs});
        break;
      }

      case 'LONG_TASK': {
        const longTaskLink = UI.XLink.XLink.create(
            'https://web.dev/optimize-long-tasks/', i18nString(UIStrings.longTask), undefined, undefined, 'long-tasks');
        span.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sTookS,
            {PH1: longTaskLink, PH2: i18n.TimeUtilities.millisToString((duration || 0), true)}));
        break;
      }
      case 'LONG_INTERACTION': {
        const longInteractionINPLink = UI.XLink.XLink.create(
            'https://web.dev/inp', i18nString(UIStrings.longInteractionINP), undefined, undefined, 'long-interaction');
        span.appendChild(i18n.i18n.getFormatLocalizedString(
            str_, UIStrings.sIsLikelyPoorPageResponsiveness, {PH1: longInteractionINPLink}));
        break;
      }
      default: {
        Platform.assertNever(warning, `Unhandled warning type ${warning}`);
      }
    }
    warningElements.push(span);
  }
  return warningElements;
}

export interface DetailRow {
  key: string;
  value: string;
}
export function buildRowsForWebSocketEvent(
    event: TraceEngine.Types.TraceEvents.TraceEventWebSocketCreate|
    TraceEngine.Types.TraceEvents.TraceEventWebSocketInfo|TraceEngine.Types.TraceEvents.TraceEventWebSocketTransfer,
    traceParsedData: TraceEngine.Handlers.Types.TraceParseData): readonly DetailRow[] {
  const rows: DetailRow[] = [];

  const initiator = traceParsedData.Initiators.eventToInitiator.get(event);
  if (initiator && TraceEngine.Types.TraceEvents.isTraceEventWebSocketCreate(initiator)) {
    // The initiator will be a WebSocketCreate, but this check helps TypeScript to understand.
    rows.push({key: i18n.i18n.lockedString('URL'), value: initiator.args.data.url});
    if (initiator.args.data.websocketProtocol) {
      rows.push({key: i18nString(UIStrings.websocketProtocol), value: initiator.args.data.websocketProtocol});
    }
  } else if (TraceEngine.Types.TraceEvents.isTraceEventWebSocketCreate(event)) {
    rows.push({key: i18n.i18n.lockedString('URL'), value: event.args.data.url});
    if (event.args.data.websocketProtocol) {
      rows.push({key: i18nString(UIStrings.websocketProtocol), value: event.args.data.websocketProtocol});
    }
  }
  if (TraceEngine.Types.TraceEvents.isTraceEventWebSocketTransfer(event)) {
    if (event.args.data.dataLength) {
      rows.push({
        key: i18nString(UIStrings.webSocketDataLength),
        value: `${i18nString(UIStrings.webSocketBytes, {PH1: event.args.data.dataLength})}`,
      });
    }
  }

  return rows;
}

/**
 * This method does not output any content but instead takes a list of
 * invalidations and groups them, doing some processing of the data to collect
 * invalidations grouped by the reason/cause.
 * It also returns all BackendNodeIds that are related to these invalidations
 * so that they can be fetched via CDP.
 * It is exported only for testing purposes.
 **/
export function generateInvalidationsList(
    invalidations: TraceEngine.Types.TraceEvents.InvalidationTrackingEvent[],
    ): {
  groupedByReason: Record<string, TraceEngine.Types.TraceEvents.InvalidationTrackingEvent[]>,
  backendNodeIds: Set<Protocol.DOM.BackendNodeId>,
} {
  const groupedByReason: Record<string, TraceEngine.Types.TraceEvents.InvalidationTrackingEvent[]> = {};

  const backendNodeIds: Set<Protocol.DOM.BackendNodeId> = new Set();
  for (const invalidation of invalidations) {
    backendNodeIds.add(invalidation.args.data.nodeId);

    let reason = invalidation.args.data.reason || 'unknown';

    // ScheduleStyle events do not always have a reason, but if they tell us
    // via their data what changed, we can update the reason that we show to
    // the user.
    if (reason === 'unknown' &&
        TraceEngine.Types.TraceEvents.isTraceEventScheduleStyleInvalidationTracking(invalidation) &&
        invalidation.args.data.invalidatedSelectorId) {
      switch (invalidation.args.data.invalidatedSelectorId) {
        case 'attribute':
          reason = 'Attribute';
          if (invalidation.args.data.changedAttribute) {
            reason += ` (${invalidation.args.data.changedAttribute})`;
          }
          break;
        case 'class':
          reason = 'Class';
          if (invalidation.args.data.changedClass) {
            reason += ` (${invalidation.args.data.changedClass})`;
          }
          break;
        case 'id':
          reason = 'Id';
          if (invalidation.args.data.changedId) {
            reason += ` (${invalidation.args.data.changedId})`;
          }
          break;
      }
    }

    if (reason === 'PseudoClass' &&
        TraceEngine.Types.TraceEvents.isTraceEventStyleRecalcInvalidationTracking(invalidation) &&
        invalidation.args.data.extraData) {
      // This will append the `:focus` onto the reason.
      reason += invalidation.args.data.extraData;
    }

    if (reason === 'Attribute' &&
        TraceEngine.Types.TraceEvents.isTraceEventStyleRecalcInvalidationTracking(invalidation) &&
        invalidation.args.data.extraData) {
      // Append the attribute that changed.
      reason += ` (${invalidation.args.data.extraData})`;
    }

    if (reason === 'StyleInvalidator') {
      // These events give us some extra metadata but are not in isolation that
      // useful and end up duplicating information from other tracking events,
      // so we do not include these in the UI.
      continue;
    }

    const existing = groupedByReason[reason] || [];
    existing.push(invalidation);
    groupedByReason[reason] = existing;
  }
  return {groupedByReason, backendNodeIds};
}
