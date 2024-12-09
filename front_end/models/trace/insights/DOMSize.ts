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
      'A large DOM will increase memory usage, cause longer style calculations, and produce costly layout reflows which impact page responsiveness. [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/lighthouse/performance/dom-size/).',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/DOMSize.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const DOM_UPDATE_LIMIT = 800;

export type DOMSizeInsightModel = InsightModel<{
  largeLayoutUpdates: Types.Events.Layout[],
  largeStyleRecalcs: Types.Events.UpdateLayoutTree[],
}>;

export function deps(): ['Renderer', 'AuctionWorklets'] {
  return ['Renderer', 'AuctionWorklets'];
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
        Helpers.Timing.traceWindowFromMicroSeconds(first.ts, Types.Timing.MicroSeconds(last.ts + (last.dur ?? 0)));
    if (!Helpers.Timing.boundsIncludeTimeRange({timeRange, bounds: context.bounds})) {
      continue;
    }

    for (const event of layoutEvents) {
      if (!isWithinContext(event)) {
        continue;
      }

      const {dirtyObjects} = event.args.beginData;
      if (dirtyObjects > DOM_UPDATE_LIMIT) {
        largeLayoutUpdates.push(event);
      }
    }

    for (const event of updateLayoutTreeEvents) {
      if (!isWithinContext(event)) {
        continue;
      }

      const {elementCount} = event.args;
      if (elementCount > DOM_UPDATE_LIMIT) {
        largeStyleRecalcs.push(event);
      }
    }
  }

  return finalize({
    largeLayoutUpdates,
    largeStyleRecalcs,
  });
}
