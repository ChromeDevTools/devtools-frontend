// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';
import {
  html,
  i18nTemplate as unboundI18nTemplate,
  nothing,
  render,
} from '../../../ui/lit/lit.js';

// *********************************************************************
// At the moment this file consists of helpers to aid in the rendering
// of events details in the bottom drawer. In the future, we should use
// Lit for this section, and update this helpers accordingly.
// *********************************************************************

const UIStrings = {
  /**
   * @description Text in the Performance panel for a forced style and layout
   * calculation of elements in a page.
   */
  forcedReflow: 'Forced reflow',
  /**
   * @description Warning message indicating that an event is likely a
   * performance bottleneck in the Performance panel.
   * @example {Forced reflow} PH1
   */
  sIsALikelyPerformanceBottleneck: '{PH1} is a likely performance bottleneck',
  /**
   * @description Warning message in the Performance panel for an idle callback
   * function that took longer to execute than its predefined deadline.
   * @example {10ms} PH1
   */
  idleCallbackExecutionExtended: 'Idle callback execution extended beyond deadline by {PH1}',
  /**
   * @description Warning message in the Performance panel describing how long a
   * task took.
   * @example {Task} PH1
   * @example {10ms} PH2
   */
  sTookS: '{PH1} took {PH2}',
  /**
   * @description Label in the Performance panel for a task that took a long
   * time.
   */
  longTask: 'Long task',
  /**
   * @description Label in the Performance panel for an interaction that took a
   * long time.
   */
  longInteractionINP: 'Long interaction',
  /**
   * @description Warning message in the Performance panel indicating that an
   * interaction caused poor responsiveness.
   * @example {Long interaction} PH1
   */
  sIsLikelyPoorPageResponsiveness: '{PH1} indicates poor page responsiveness',
  /**
   * @description Label for the WebSocket sub-protocol in the event details view
   * of the Performance panel.
   */
  websocketProtocol: 'WebSocket protocol',
  /**
   * @description Details text indicating how many bytes were transferred in a
   * WebSocket message in the Performance panel.
   * @example {1024} PH1
   */
  webSocketBytes: '{PH1} byte(s)',
  /**
   * @description Details label indicating the data length of a WebSocket
   * message in the Performance panel.
   */
  webSocketDataLength: 'Data length',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/DetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = unboundI18nTemplate.bind(undefined, str_);

interface WarningViewInput {
  event: Trace.Types.Events.Event;
  warnings: Trace.Handlers.ModelHandlers.Warnings.Warning[];
}

function renderWarningElements(input: WarningViewInput, _output: undefined, target: DocumentFragment): void {
  const duration = Trace.Helpers.Timing.microToMilli(Trace.Types.Timing.Micro(input.event.dur || 0));
  render(html`${input.warnings.map(warning => {
           switch (warning) {
             case 'FORCED_REFLOW': {
               const forcedReflowLink = html`<devtools-link
                href="https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts"
                jslogcontext="forced-reflow">${i18nString(UIStrings.forcedReflow)}</devtools-link>`;
               return html`<span>${
                   i18nTemplate(UIStrings.sIsALikelyPerformanceBottleneck, {PH1: forcedReflowLink})}</span>`;
             }
             case 'IDLE_CALLBACK_OVER_TIME': {
               if (!Trace.Types.Events.isFireIdleCallback(input.event)) {
                 return nothing;
               }
               const exceededMs = i18n.TimeUtilities.millisToString(
                   (duration || 0) - input.event.args.data['allottedMilliseconds'], true);
               return html`<span>${i18nString(UIStrings.idleCallbackExecutionExtended, {PH1: exceededMs})}</span>`;
             }
             case 'LONG_TASK': {
               const longTaskLink = html`<devtools-link
                href="https://web.dev/optimize-long-tasks/"
                jslogcontext="long-tasks">${i18nString(UIStrings.longTask)}</devtools-link>`;
               return html`<span>${i18nTemplate(UIStrings.sTookS, {
                 PH1: longTaskLink,
                 PH2: i18n.TimeUtilities.millisToString((duration || 0), true),
               })}</span>`;
             }
             case 'LONG_INTERACTION': {
               const longInteractionINPLink = html`<devtools-link
                href="https://web.dev/inp"
                jslogcontext="long-interaction">${i18nString(UIStrings.longInteractionINP)}</devtools-link>`;
               return html`<span>${i18nTemplate(UIStrings.sIsLikelyPoorPageResponsiveness, {
                 PH1: longInteractionINPLink,
               })}</span>`;
             }
             default: {
               Platform.assertNever(warning, `Unhandled warning type ${warning}`);
             }
           }
         })}`,
         target);
}

export function buildWarningElementsForEvent(event: Trace.Types.Events.Event,
                                             parsedTrace: Trace.TraceModel.ParsedTrace): HTMLSpanElement[] {
  const warnings = parsedTrace.data.Warnings.perEvent.get(event);
  if (!warnings) {
    return [];
  }
  const fragment = document.createDocumentFragment();
  renderWarningElements({event, warnings}, undefined, fragment);
  return Array.from(fragment.children).filter((child): child is HTMLSpanElement => child instanceof HTMLSpanElement);
}

export interface DetailRow {
  key: string;
  value: string;
}
export function buildRowsForWebSocketEvent(
    event: Trace.Types.Events.WebSocketCreate|Trace.Types.Events.WebSocketInfo|Trace.Types.Events.WebSocketTransfer,
    parsedTrace: Trace.TraceModel.ParsedTrace): readonly DetailRow[] {
  const rows: DetailRow[] = [];

  const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event);
  if (initiator && Trace.Types.Events.isWebSocketCreate(initiator)) {
    // The initiator will be a WebSocketCreate, but this check helps TypeScript
    // to understand.
    rows.push({key: i18n.i18n.lockedString('URL'), value: initiator.args.data.url});
    if (initiator.args.data.webSocketProtocol) {
      rows.push({
        key: i18nString(UIStrings.websocketProtocol),
        value: initiator.args.data.webSocketProtocol,
      });
    }
  } else if (Trace.Types.Events.isWebSocketCreate(event)) {
    rows.push({key: i18n.i18n.lockedString('URL'), value: event.args.data.url});
    if (event.args.data.webSocketProtocol) {
      rows.push({
        key: i18nString(UIStrings.websocketProtocol),
        value: event.args.data.webSocketProtocol,
      });
    }
  }
  if (Trace.Types.Events.isWebSocketTransfer(event)) {
    if (event.args.data.dataLength) {
      rows.push({
        key: i18nString(UIStrings.webSocketDataLength),
        value: `${i18nString(UIStrings.webSocketBytes, {
          PH1: event.args.data.dataLength,
        })}`,
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
    invalidations: Trace.Types.Events.InvalidationTrackingEvent[],
    ): {
  groupedByReason: Record<string, Trace.Types.Events.InvalidationTrackingEvent[]>,
  backendNodeIds: Set<Protocol.DOM.BackendNodeId>,
} {
  const groupedByReason: Record<string, Trace.Types.Events.InvalidationTrackingEvent[]> = {};

  const backendNodeIds = new Set<Protocol.DOM.BackendNodeId>();
  for (const invalidation of invalidations) {
    backendNodeIds.add(invalidation.args.data.nodeId);

    let reason = invalidation.args.data.reason || 'unknown';

    // ScheduleStyle events do not always have a reason, but if they tell us
    // via their data what changed, we can update the reason that we show to
    // the user.
    if (reason === 'unknown' && Trace.Types.Events.isScheduleStyleInvalidationTracking(invalidation) &&
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

    if (reason === 'PseudoClass' && Trace.Types.Events.isStyleRecalcInvalidationTracking(invalidation) &&
        invalidation.args.data.extraData) {
      // This will append the `:focus` onto the reason.
      reason += invalidation.args.data.extraData;
    }

    if (reason === 'Attribute' && Trace.Types.Events.isStyleRecalcInvalidationTracking(invalidation) &&
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
