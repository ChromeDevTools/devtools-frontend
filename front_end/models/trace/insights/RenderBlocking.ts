// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Lantern from '../lantern/lantern.js';
import type * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type InsightSetContextWithNavigation,
  InsightWarning,
  type LanternContext,
  type PartialInsightModel,
  type RequiredData,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that provides the user with the list of network requests that blocked and therefore slowed down the page rendering and becoming visible to the user.
   */
  title: 'Render blocking requests',
  /**
   * @description Text to describe that there are requests blocking rendering, which may affect LCP.
   */
  description: 'Requests are blocking the page\'s initial render, which may delay LCP. ' +
      '[Deferring or inlining](https://web.dev/learn/performance/understanding-the-critical-path#render-blocking_resources/) ' +
      'can move these network requests out of the critical path.',
  /**
   * @description Label to describe a network request (that happens to be render-blocking).
   */
  renderBlockingRequest: 'Request',
  /**
   *@description Label used for a time duration.
   */
  duration: 'Duration',
  /**
   * @description Text status indicating that no requests blocked the initial render of a navigation
   */
  noRenderBlocking: 'No render blocking requests for this navigation',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/RenderBlocking.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type RenderBlockingInsightModel = InsightModel<typeof UIStrings, {
  renderBlockingRequests: Types.Events.SyntheticNetworkRequest[],
  requestIdToWastedMs?: Map<string, number>,
}>;

// Because of the way we detect blocking stylesheets, asynchronously loaded
// CSS with link[rel=preload] and an onload handler (see https://github.com/filamentgroup/loadCSS)
// can be falsely flagged as blocking. Therefore, ignore stylesheets that loaded fast enough
// to possibly be non-blocking (and they have minimal impact anyway).
const MINIMUM_WASTED_MS = 50;

export function deps(): ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint'] {
  return ['NetworkRequests', 'PageLoadMetrics', 'LargestImagePaint'];
}

/**
 * Given a simulation's nodeTimings, return an object with the nodes/timing keyed by network URL
 */
function getNodesAndTimingByRequestId(nodeTimings: Lantern.Simulation.Result['nodeTimings']):
    Map<string, {node: Lantern.Graph.Node, nodeTiming: Lantern.Types.Simulation.NodeTiming}> {
  const requestIdToNode =
      new Map<string, {node: Lantern.Graph.Node, nodeTiming: Lantern.Types.Simulation.NodeTiming}>();

  for (const [node, nodeTiming] of nodeTimings) {
    if (node.type !== 'network') {
      continue;
    }

    requestIdToNode.set(node.request.requestId, {node, nodeTiming});
  }

  return requestIdToNode;
}

function estimateSavingsWithGraphs(deferredIds: Set<string>, lanternContext: LanternContext): Types.Timing.Milli {
  const simulator = lanternContext.simulator;
  const fcpGraph = lanternContext.metrics.firstContentfulPaint.optimisticGraph;
  const {nodeTimings} = lanternContext.simulator.simulate(fcpGraph);
  const adjustedNodeTimings = new Map(nodeTimings);

  const totalChildNetworkBytes = 0;
  const minimalFCPGraph = fcpGraph.cloneWithRelationships(node => {
    // If a node can be deferred, exclude it from the new FCP graph
    const canDeferRequest = deferredIds.has(node.id);
    return !canDeferRequest;
  });

  if (minimalFCPGraph.type !== 'network') {
    throw new Error('minimalFCPGraph not a NetworkNode');
  }

  // Recalculate the "before" time based on our adjusted node timings.
  const estimateBeforeInline = Math.max(...Array.from(
      Array.from(adjustedNodeTimings).map(timing => timing[1].endTime),
      ));

  // Add the inlined bytes to the HTML response
  const originalTransferSize = minimalFCPGraph.request.transferSize;
  const safeTransferSize = originalTransferSize || 0;
  minimalFCPGraph.request.transferSize = safeTransferSize + totalChildNetworkBytes;
  const estimateAfterInline = simulator.simulate(minimalFCPGraph).timeInMs;
  minimalFCPGraph.request.transferSize = originalTransferSize;
  return Math.round(Math.max(estimateBeforeInline - estimateAfterInline, 0)) as Types.Timing.Milli;
}

function hasImageLCP(parsedTrace: RequiredData<typeof deps>, context: InsightSetContextWithNavigation): boolean {
  return parsedTrace.LargestImagePaint.lcpRequestByNavigation.get(context.navigation) !== undefined;
}

function computeSavings(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContextWithNavigation,
    renderBlockingRequests: Types.Events.SyntheticNetworkRequest[]):
    Pick<RenderBlockingInsightModel, 'metricSavings'|'requestIdToWastedMs'>|undefined {
  if (!context.lantern) {
    return;
  }

  const nodesAndTimingsByRequestId =
      getNodesAndTimingByRequestId(context.lantern.metrics.firstContentfulPaint.optimisticEstimate.nodeTimings);

  const metricSavings = {FCP: 0 as Types.Timing.Milli, LCP: 0 as Types.Timing.Milli};
  const requestIdToWastedMs = new Map<string, number>();
  const deferredNodeIds = new Set<string>();
  for (const request of renderBlockingRequests) {
    const nodeAndTiming = nodesAndTimingsByRequestId.get(request.args.data.requestId);
    if (!nodeAndTiming) {
      continue;
    }

    const {node, nodeTiming} = nodeAndTiming;

    // Mark this node and all its dependents as deferrable
    node.traverse(node => deferredNodeIds.add(node.id));

    // "wastedMs" is the download time of the network request, responseReceived - requestSent
    const wastedMs = Math.round(nodeTiming.duration);
    if (wastedMs < MINIMUM_WASTED_MS) {
      continue;
    }

    requestIdToWastedMs.set(node.id, wastedMs);
  }

  if (requestIdToWastedMs.size) {
    metricSavings.FCP = estimateSavingsWithGraphs(deferredNodeIds, context.lantern);

    // In most cases, render blocking resources only affect LCP if LCP isn't an image.
    if (!hasImageLCP(parsedTrace, context)) {
      metricSavings.LCP = metricSavings.FCP;
    }
  }

  return {metricSavings, requestIdToWastedMs};
}

function finalize(partialModel: PartialInsightModel<RenderBlockingInsightModel>): RenderBlockingInsightModel {
  return {
    insightKey: InsightKeys.RENDER_BLOCKING,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    state: partialModel.renderBlockingRequests.length > 0 ? 'fail' : 'pass',
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): RenderBlockingInsightModel {
  if (!context.navigation) {
    return finalize({
      renderBlockingRequests: [],
    });
  }

  const firstPaintTs = parsedTrace.PageLoadMetrics.metricScoresByFrameId.get(context.frameId)
                           ?.get(context.navigationId)
                           ?.get(Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP)
                           ?.event?.ts;
  if (!firstPaintTs) {
    return finalize({
      renderBlockingRequests: [],
      warnings: [InsightWarning.NO_FP],
    });
  }

  let renderBlockingRequests: Types.Events.SyntheticNetworkRequest[] = [];
  for (const req of parsedTrace.NetworkRequests.byTime) {
    if (req.args.data.frame !== context.frameId) {
      continue;
    }

    if (!Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(req)) {
      continue;
    }

    if (req.args.data.syntheticData.finishTime > firstPaintTs) {
      continue;
    }

    // If a request is marked `in_body_parser_blocking` it should only be considered render blocking if it is a
    // high enough priority. Some requests (e.g. scripts) are not marked as high priority if they are fetched
    // after a non-preloaded image. (See "early" definition in https://web.dev/articles/fetch-priority)
    //
    // There are edge cases and exceptions (e.g. priority hints) but this gives us the best approximation
    // of render blocking resources in the document body.
    if (req.args.data.renderBlocking === 'in_body_parser_blocking') {
      const priority = req.args.data.priority;
      const isScript = req.args.data.resourceType === Protocol.Network.ResourceType.Script;
      const isBlockingScript = isScript && priority === Protocol.Network.ResourcePriority.High;
      if (priority !== Protocol.Network.ResourcePriority.VeryHigh && !isBlockingScript) {
        continue;
      }
    }

    const navigation =
        Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, parsedTrace.Meta.navigationsByFrameId);
    if (navigation === context.navigation) {
      renderBlockingRequests.push(req);
    }
  }

  const savings = computeSavings(parsedTrace, context, renderBlockingRequests);

  // Sort by request duration for insights.
  renderBlockingRequests = renderBlockingRequests.sort((a, b) => {
    return b.dur - a.dur;
  });

  return finalize({
    relatedEvents: renderBlockingRequests,
    renderBlockingRequests,
    ...savings,
  });
}
