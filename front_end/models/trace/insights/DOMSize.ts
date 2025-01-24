// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {InsightCategory, type InsightModel, type InsightSetContext, type RequiredData} from './types.js';

const UIStrings = {
  /**
   * @description Title of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated.
   */
  title: 'Optimize DOM size',
  /**
   * @description Description of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated. "layout reflows" are when the browser will recompute the layout of content on the page.
   */
  description:
      'A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/lighthouse/performance/dom-size/).',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/DOMSize.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const DOM_SIZE_DURATION_THRESHOLD = Helpers.Timing.milliToMicro(Types.Timing.Milli(40));

// These thresholds were selected to maximize the number of long (>40ms) events above
// the threshold while maximizing the number of short (<40ms) events below the threshold.
// See go/rpp-dom-size-thresholds for the analysis that produced these thresholds.
const LAYOUT_OBJECTS_THRESHOLD = 100;
const STYLE_RECALC_ELEMENTS_THRESHOLD = 300;

export type DOMSizeInsightModel = InsightModel<{
  largeLayoutUpdates: Types.Events.Layout[],
  largeStyleRecalcs: Types.Events.UpdateLayoutTree[],
  maxDOMStats?: Types.Events.DOMStats,
}>;

export function deps(): ['Renderer', 'AuctionWorklets', 'DOMStats'] {
  return ['Renderer', 'AuctionWorklets', 'DOMStats'];
}

function finalize(partialModel: Omit<DOMSizeInsightModel, 'title'|'description'|'category'|'shouldShow'>):
    DOMSizeInsightModel {
  const relatedEvents = [...partialModel.largeLayoutUpdates, ...partialModel.largeStyleRecalcs];
  return {
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.INP,
    shouldShow: relatedEvents.length > 0,
    ...partialModel,
    relatedEvents,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): DOMSizeInsightModel {
  const isWithinContext = (event: Types.Events.Event): boolean => Helpers.Timing.eventIsInBounds(event, context.bounds);

  const mainTid = context.navigation?.tid;

  const largeLayoutUpdates: Types.Events.Layout[] = [];
  const largeStyleRecalcs: Types.Events.UpdateLayoutTree[] = [];

  const threads = Handlers.Threads.threadsInRenderer(parsedTrace.Renderer, parsedTrace.AuctionWorklets);
  for (const thread of threads) {
    if (thread.type !== Handlers.Threads.ThreadType.MAIN_THREAD) {
      continue;
    }

    if (mainTid === undefined) {
      // We won't have a specific thread ID to reference if the context does not have a navigation.
      // In this case, we'll just filter out any OOPIFs threads.
      if (!thread.processIsOnMainFrame) {
        continue;
      }
    } else if (thread.tid !== mainTid) {
      continue;
    }

    const rendererThread = parsedTrace.Renderer.processes.get(thread.pid)?.threads.get(thread.tid);
    if (!rendererThread) {
      continue;
    }

    const {entries, layoutEvents, updateLayoutTreeEvents} = rendererThread;
    if (!entries.length) {
      continue;
    }

    const first = entries[0];
    const last = entries[entries.length - 1];
    const timeRange =
        Helpers.Timing.traceWindowFromMicroSeconds(first.ts, Types.Timing.Micro(last.ts + (last.dur ?? 0)));
    if (!Helpers.Timing.boundsIncludeTimeRange({timeRange, bounds: context.bounds})) {
      continue;
    }

    for (const event of layoutEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }

      const {dirtyObjects} = event.args.beginData;
      if (dirtyObjects > LAYOUT_OBJECTS_THRESHOLD) {
        largeLayoutUpdates.push(event);
      }
    }

    for (const event of updateLayoutTreeEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }

      const {elementCount} = event.args;
      if (elementCount > STYLE_RECALC_ELEMENTS_THRESHOLD) {
        largeStyleRecalcs.push(event);
      }
    }
  }

  const domStatsEvents = parsedTrace.DOMStats.domStatsByFrameId.get(context.frameId)?.filter(isWithinContext) ?? [];
  let maxDOMStats: Types.Events.DOMStats|undefined;
  for (const domStats of domStatsEvents) {
    if (!maxDOMStats || domStats.args.data.totalElements > maxDOMStats.args.data.totalElements) {
      maxDOMStats = domStats;
    }
  }

  return finalize({
    largeLayoutUpdates,
    largeStyleRecalcs,
    maxDOMStats,
  });
}
