// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Extras from '../extras/extras.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that provides details about Forced reflow.
   */
  title: 'Forced reflow',
  /**
   * @description Text to describe the forced reflow.
   */
  description:
      'A forced reflow occurs when JavaScript queries geometric properties (such as `offsetWidth`) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about [forced reflows](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts) and possible mitigations.',
  /**
   * @description Title of a list to provide related stack trace data
   */
  relatedStackTrace: 'Stack trace',
  /**
   * @description Text to describe the top time-consuming function call
   */
  topTimeConsumingFunctionCall: 'Top function call',
  /**
   * @description Text to describe the total reflow time
   */
  totalReflowTime: 'Total reflow time',
  /**
   * @description Text to describe CPU processor tasks that could not be attributed to any specific source code.
   */
  unattributed: '[unattributed]',
  /**
   * @description Text for the name of anonymous functions
   */
  anonymous: '(anonymous)',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/ForcedReflow.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type ForcedReflowInsightModel = InsightModel<typeof UIStrings, {
  topLevelFunctionCallData: ForcedReflowAggregatedData | undefined,
  aggregatedBottomUpData: BottomUpCallStack[],
}>;

export interface BottomUpCallStack {
  /**
   * `null` indicates that this data is for unattributed force reflows.
   */
  bottomUpData: Types.Events.CallFrame|Protocol.Runtime.CallFrame|null;
  totalTime: number;
  relatedEvents: Types.Events.Event[];
}

export interface ForcedReflowAggregatedData {
  topLevelFunctionCall: Types.Events.CallFrame|Protocol.Runtime.CallFrame;
  totalReflowTime: number;
  topLevelFunctionCallEvents: Types.Events.Event[];
}

function getCallFrameId(callFrame: Types.Events.CallFrame|Protocol.Runtime.CallFrame): string {
  return callFrame.scriptId + ':' + callFrame.lineNumber + ':' + callFrame.columnNumber;
}

function getLargestTopLevelFunctionData(
    forcedReflowEvents: Types.Events.Event[], traceParsedData: Handlers.Types.ParsedTrace): ForcedReflowAggregatedData|
    undefined {
  const entryToNodeMap = traceParsedData.Renderer.entryToNode;
  const dataByTopLevelFunction = new Map<string, ForcedReflowAggregatedData>();
  if (forcedReflowEvents.length === 0) {
    return;
  }

  for (const event of forcedReflowEvents) {
    // Gather the stack traces by searching in the tree
    const traceNode = entryToNodeMap.get(event);
    if (!traceNode) {
      continue;
    }

    let node = traceNode.parent;
    let topLevelFunctionCall;
    let topLevelFunctionCallEvent: Types.Events.Event|undefined;
    while (node) {
      const eventData = node.entry;
      if (Types.Events.isProfileCall(eventData)) {
        topLevelFunctionCall = eventData.callFrame;
        topLevelFunctionCallEvent = eventData;
      } else {
        // We have finished searching bottom up data
        if (Types.Events.isFunctionCall(eventData) && eventData.args.data &&
            Types.Events.objectIsCallFrame(eventData.args.data)) {
          topLevelFunctionCall = eventData.args.data;
          topLevelFunctionCallEvent = eventData;
        }
        break;
      }
      node = node.parent;
    }

    if (!topLevelFunctionCall || !topLevelFunctionCallEvent) {
      continue;
    }

    const aggregatedDataId = getCallFrameId(topLevelFunctionCall);
    const aggregatedData =
        Platform.MapUtilities.getWithDefault(dataByTopLevelFunction, aggregatedDataId, () => ({
                                                                                         topLevelFunctionCall,
                                                                                         totalReflowTime: 0,
                                                                                         topLevelFunctionCallEvents: [],
                                                                                       }));
    aggregatedData.totalReflowTime += (event.dur ?? 0);
    aggregatedData.topLevelFunctionCallEvents.push(topLevelFunctionCallEvent);
  }

  let topTimeConsumingData: ForcedReflowAggregatedData|undefined = undefined;
  dataByTopLevelFunction.forEach(data => {
    if (!topTimeConsumingData || data.totalReflowTime > topTimeConsumingData.totalReflowTime) {
      topTimeConsumingData = data;
    }
  });

  return topTimeConsumingData;
}

function finalize(partialModel: PartialInsightModel<ForcedReflowInsightModel>): ForcedReflowInsightModel {
  return {
    insightKey: InsightKeys.FORCED_REFLOW,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.ALL,
    state: partialModel.aggregatedBottomUpData.length !== 0 ? 'fail' : 'pass',
    ...partialModel,
  };
}

function getBottomCallFrameForEvent(event: Types.Events.Event, traceParsedData: Handlers.Types.ParsedTrace):
    Types.Events.CallFrame|Protocol.Runtime.CallFrame|null {
  const profileStackTrace = Extras.StackTraceForEvent.get(event, traceParsedData);
  const eventStackTrace = Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event);

  return profileStackTrace?.callFrames[0] ?? eventStackTrace?.[0] ?? null;
}

export function generateInsight(
    traceParsedData: Handlers.Types.ParsedTrace, context: InsightSetContext): ForcedReflowInsightModel {
  const isWithinContext = (event: Types.Events.Event): boolean => {
    const frameId = Helpers.Trace.frameIDForEvent(event);
    if (frameId !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  };

  const bottomUpDataMap = new Map<string, BottomUpCallStack>();
  const events = traceParsedData.Warnings.perWarning.get('FORCED_REFLOW')?.filter(isWithinContext) ?? [];
  for (const event of events) {
    const bottomCallFrame = getBottomCallFrameForEvent(event, traceParsedData);
    const bottomCallId = bottomCallFrame ? getCallFrameId(bottomCallFrame) : 'UNATTRIBUTED';
    const bottomUpData =
        Platform.MapUtilities.getWithDefault(bottomUpDataMap, bottomCallId, () => ({
                                                                              bottomUpData: bottomCallFrame,
                                                                              totalTime: 0,
                                                                              relatedEvents: [],
                                                                            }));
    bottomUpData.totalTime += event.dur ?? 0;
    bottomUpData.relatedEvents.push(event);
  }

  const topLevelFunctionCallData = getLargestTopLevelFunctionData(events, traceParsedData);

  return finalize({
    relatedEvents: events,
    topLevelFunctionCallData,
    aggregatedBottomUpData: [...bottomUpDataMap.values()],
  });
}

export function createOverlays(model: ForcedReflowInsightModel): Types.Overlays.Overlay[] {
  if (!model.topLevelFunctionCallData) {
    return [];
  }

  const allBottomUpEvents = [...model.aggregatedBottomUpData.values().flatMap(data => data.relatedEvents)];
  return [
    ...createOverlayForEvents(model.topLevelFunctionCallData.topLevelFunctionCallEvents, 'INFO'),
    ...createOverlayForEvents(allBottomUpEvents),
  ];
}

export function createOverlayForEvents(
    events: Types.Events.Event[], outlineReason: 'ERROR'|'INFO' = 'ERROR'): Types.Overlays.Overlay[] {
  return events.map(e => ({
                      type: 'ENTRY_OUTLINE',
                      entry: e,
                      outlineReason,
                    }));
}
