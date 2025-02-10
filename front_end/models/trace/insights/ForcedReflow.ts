// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import type {Warning} from '../handlers/WarningsHandler.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {
  type BottomUpCallStack,
  type ForcedReflowAggregatedData,
  InsightCategory,
  type InsightModel,
  type PartialInsightModel,
  type RequiredData,
} from './types.js';

export function deps(): ['Warnings', 'Renderer'] {
  return ['Warnings', 'Renderer'];
}

export const UIStrings = {
  /**
   *@description Title of an insight that provides details about Forced reflow.
   */
  title: 'Forced reflow',
  /**
   * @description Text to describe the forced reflow.
   */
  description:
      'Many APIs, typically reading layout geometry, force the rendering engine to pause script execution in order to calculate the style and layout. Learn more about [forced reflow](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts) and its mitigations.',
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

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/ForcedReflow.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type ForcedReflowInsightModel = InsightModel<typeof UIStrings, {
  topLevelFunctionCallData: ForcedReflowAggregatedData | undefined,
  aggregatedBottomUpData: BottomUpCallStack[],
}>;

function aggregateForcedReflow(
    data: Map<Warning, Types.Events.Event[]>,
    entryToNodeMap: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>):
    [ForcedReflowAggregatedData|undefined, BottomUpCallStack[]] {
  const dataByTopLevelFunction = new Map<string, ForcedReflowAggregatedData>();
  const bottomUpDataMap = new Map<string, BottomUpCallStack>();
  const forcedReflowEvents = data.get('FORCED_REFLOW');
  if (!forcedReflowEvents || forcedReflowEvents.length === 0) {
    return [undefined, []];
  }

  forcedReflowEvents.forEach(e => {
    // Gather the stack traces by searching in the tree
    const traceNode = entryToNodeMap.get(e);

    if (!traceNode) {
      return;
    }
    // Compute call stack fully
    const bottomUpData: (Types.Events.CallFrame|Protocol.Runtime.CallFrame)[] = [];
    let currentNode = traceNode;
    let previousNode;
    const childStack: Protocol.Runtime.CallFrame[] = [];

    // Some profileCalls maybe constructed as its children in hierarchy tree
    while (currentNode.children.length > 0) {
      const childNode = currentNode.children[0];
      if (!previousNode) {
        previousNode = childNode;
      }
      const eventData = childNode.entry;
      if (Types.Events.isProfileCall(eventData)) {
        childStack.push(eventData.callFrame);
      }
      currentNode = childNode;
    }

    // In order to avoid too much information, we only contain 2 levels bottomUp data,
    while (childStack.length > 0 && bottomUpData.length < 2) {
      const traceData = childStack.pop();
      if (traceData) {
        bottomUpData.push(traceData);
      }
    }

    let node = traceNode.parent;
    let topLevelFunctionCall;
    let topLevelFunctionCallEvent: Types.Events.Event|undefined;
    while (node) {
      const eventData = node.entry;
      if (Types.Events.isProfileCall(eventData)) {
        if (bottomUpData.length < 2) {
          bottomUpData.push(eventData.callFrame);
        }
      } else {
        // We have finished searching bottom up data
        if (Types.Events.isFunctionCall(eventData) && eventData.args.data &&
            Types.Events.objectIsCallFrame(eventData.args.data)) {
          topLevelFunctionCall = eventData.args.data;
          topLevelFunctionCallEvent = eventData;
          if (bottomUpData.length === 0) {
            bottomUpData.push(topLevelFunctionCall);
          }
        } else {
          // Sometimes the top level task can be other JSInvocation event
          // then we use the top level profile call as topLevelFunctionCall's data
          const previousData = previousNode?.entry;
          if (previousData && Types.Events.isProfileCall(previousData)) {
            topLevelFunctionCall = previousData.callFrame;
            topLevelFunctionCallEvent = previousNode?.entry;
          }
        }
        break;
      }
      previousNode = node;
      node = node.parent;
    }

    if (!topLevelFunctionCall || !topLevelFunctionCallEvent || bottomUpData.length === 0) {
      return;
    }
    const bottomUpDataId =
        bottomUpData[0].scriptId + ':' + bottomUpData[0].lineNumber + ':' + bottomUpData[0].columnNumber + ':';

    const data = bottomUpDataMap.get(bottomUpDataId) ?? {
      bottomUpData: bottomUpData[0],
      totalTime: 0,
      relatedEvents: [],
    };
    data.totalTime += (e.dur ?? 0);
    data.relatedEvents.push(e);
    bottomUpDataMap.set(bottomUpDataId, data);

    const aggregatedDataId =
        topLevelFunctionCall.scriptId + ':' + topLevelFunctionCall.lineNumber + ':' + topLevelFunctionCall.columnNumber;
    if (!dataByTopLevelFunction.has(aggregatedDataId)) {
      dataByTopLevelFunction.set(aggregatedDataId, {
        topLevelFunctionCall,
        totalReflowTime: 0,
        bottomUpData: new Set<string>(),
        topLevelFunctionCallEvents: [],
      });
    }
    const aggregatedData = dataByTopLevelFunction.get(aggregatedDataId);
    if (aggregatedData) {
      aggregatedData.totalReflowTime += (e.dur ?? 0);
      aggregatedData.bottomUpData.add(bottomUpDataId);
      aggregatedData.topLevelFunctionCallEvents.push(topLevelFunctionCallEvent);
    }
  });

  let topTimeConsumingDataId = '';
  let maxTime = 0;
  dataByTopLevelFunction.forEach((value, key) => {
    if (value.totalReflowTime > maxTime) {
      maxTime = value.totalReflowTime;
      topTimeConsumingDataId = key;
    }
  });

  const aggregatedBottomUpData: BottomUpCallStack[] = [];
  const topLevelFunctionCallData = dataByTopLevelFunction.get(topTimeConsumingDataId);
  const dataSet = dataByTopLevelFunction.get(topTimeConsumingDataId)?.bottomUpData;
  if (dataSet) {
    dataSet.forEach(value => {
      const callStackData = bottomUpDataMap.get(value);
      if (callStackData && callStackData.totalTime > Helpers.Timing.milliToMicro(Types.Timing.Milli(1))) {
        aggregatedBottomUpData.push(callStackData);
      }
    });
  }

  return [topLevelFunctionCallData, aggregatedBottomUpData];
}

function finalize(partialModel: PartialInsightModel<ForcedReflowInsightModel>): ForcedReflowInsightModel {
  return {
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.ALL,
    state: partialModel.topLevelFunctionCallData !== undefined && partialModel.aggregatedBottomUpData.length !== 0 ?
        'fail' :
        'pass',
    ...partialModel,
  };
}

export function generateInsight(traceParsedData: RequiredData<typeof deps>): ForcedReflowInsightModel {
  const warningsData = traceParsedData.Warnings;
  const entryToNodeMap = traceParsedData.Renderer.entryToNode;

  if (!warningsData) {
    throw new Error('no warnings data');
  }

  if (!entryToNodeMap) {
    throw new Error('no renderer data');
  }

  const [topLevelFunctionCallData, aggregatedBottomUpData] =
      aggregateForcedReflow(warningsData.perWarning, entryToNodeMap);

  return finalize({
    relatedEvents: topLevelFunctionCallData?.topLevelFunctionCallEvents,
    topLevelFunctionCallData,
    aggregatedBottomUpData,
  });
}
