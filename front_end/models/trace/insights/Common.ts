// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import type * as CrUXManager from '../../crux-manager/crux-manager.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Lantern from '../lantern/lantern.js';
import * as Types from '../types/types.js';

import {getLogNormalScore} from './Statistics.js';
import {
  InsightKeys,
  type InsightModels,
  type InsightSet,
  type InsightSetContext,
  type MetricSavings,
  type TraceInsightSets
} from './types.js';

const GRAPH_SAVINGS_PRECISION = 50;

export function getInsight<InsightName extends keyof InsightModels>(
    insightName: InsightName, insights: TraceInsightSets|null, key: string|null): InsightModels[InsightName]|null {
  if (!insights || !key) {
    return null;
  }

  const insightSets = insights.get(key);
  if (!insightSets) {
    return null;
  }

  const insight = insightSets.model[insightName];
  if (insight instanceof Error) {
    return null;
  }

  // For some reason typescript won't narrow the type by removing Error, so do it manually.
  return insight;
}

export function getLCP(insights: TraceInsightSets|null, key: string|null):
    {value: Types.Timing.Micro, event: Types.Events.LargestContentfulPaintCandidate}|null {
  const insight = getInsight(InsightKeys.LCP_BREAKDOWN, insights, key);
  if (!insight || !insight.lcpMs || !insight.lcpEvent) {
    return null;
  }

  const value = Helpers.Timing.milliToMicro(insight.lcpMs);
  return {value, event: insight.lcpEvent};
}

export function getINP(insights: TraceInsightSets|null, key: string|null):
    {value: Types.Timing.Micro, event: Types.Events.SyntheticInteractionPair}|null {
  const insight = getInsight(InsightKeys.INP_BREAKDOWN, insights, key);
  if (!insight?.longestInteractionEvent?.dur) {
    return null;
  }

  const value = insight.longestInteractionEvent.dur;
  return {value, event: insight.longestInteractionEvent};
}

export function getCLS(
    insights: TraceInsightSets|null, key: string|null): {value: number, worstClusterEvent: Types.Events.Event|null} {
  const insight = getInsight(InsightKeys.CLS_CULPRITS, insights, key);
  if (!insight) {
    // Unlike the other metrics, there is always a value for CLS even with no data.
    return {value: 0, worstClusterEvent: null};
  }

  // TODO(cjamcl): the CLS insight should be doing this for us.
  let maxScore = 0;
  let worstCluster;
  for (const cluster of insight.clusters) {
    if (cluster.clusterCumulativeScore > maxScore) {
      maxScore = cluster.clusterCumulativeScore;
      worstCluster = cluster;
    }
  }

  return {value: maxScore, worstClusterEvent: worstCluster ?? null};
}

export function evaluateLCPMetricScore(value: Types.Timing.Milli): number {
  return getLogNormalScore({p10: 2500, median: 4000}, value);
}

export function evaluateINPMetricScore(value: Types.Timing.Milli): number {
  return getLogNormalScore({p10: 200, median: 500}, value);
}

export function evaluateCLSMetricScore(value: number): number {
  return getLogNormalScore({p10: 0.1, median: 0.25}, value);
}

export interface CrUXFieldMetricTimingResult {
  value: Types.Timing.Micro;
  pageScope: CrUXManager.PageScope;
}
export interface CrUXFieldMetricNumberResult {
  value: number;
  pageScope: CrUXManager.PageScope;
}
export interface CrUXFieldMetricResults {
  fcp: CrUXFieldMetricTimingResult|null;
  lcp: CrUXFieldMetricTimingResult|null;
  inp: CrUXFieldMetricTimingResult|null;
  cls: CrUXFieldMetricNumberResult|null;
  lcpBreakdown: {
    ttfb: CrUXFieldMetricTimingResult|null,
    loadDelay: CrUXFieldMetricTimingResult|null,
    loadDuration: CrUXFieldMetricTimingResult|null,
    renderDelay: CrUXFieldMetricTimingResult|null,
  };
}

function getPageResult(
    cruxFieldData: CrUXManager.PageResult[], url: string, origin: string,
    scope: CrUXManager.Scope|null = null): CrUXManager.PageResult|undefined {
  return cruxFieldData.find(result => {
    const key = scope ? result[`${scope.pageScope}-${scope.deviceScope}`]?.record.key :
                        (result['url-ALL'] || result['origin-ALL'])?.record.key;
    return (key?.url && key.url === url) || (key?.origin && key.origin === origin);
  });
}

function getMetricResult(
    pageResult: CrUXManager.PageResult, name: CrUXManager.StandardMetricNames,
    scope: CrUXManager.Scope|null = null): CrUXFieldMetricNumberResult|null {
  const scopes: Array<{pageScope: CrUXManager.PageScope, deviceScope: CrUXManager.DeviceScope}> = [];
  if (scope) {
    scopes.push(scope);
  } else {
    scopes.push({pageScope: 'url', deviceScope: 'ALL'});
    scopes.push({pageScope: 'origin', deviceScope: 'ALL'});
  }

  for (const scope of scopes) {
    const key = `${scope.pageScope}-${scope.deviceScope}` as const;
    let value = pageResult[key]?.record.metrics[name]?.percentiles?.p75;
    if (typeof value === 'string') {
      value = Number(value);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return {value, pageScope: scope.pageScope};
    }
  }

  return null;
}

function getMetricTimingResult(
    pageResult: CrUXManager.PageResult, name: CrUXManager.StandardMetricNames,
    scope: CrUXManager.Scope|null = null): CrUXFieldMetricTimingResult|null {
  const result = getMetricResult(pageResult, name, scope);
  if (result) {
    const valueMs = result.value as Types.Timing.Milli;
    return {value: Helpers.Timing.milliToMicro(valueMs), pageScope: result.pageScope};
  }

  return null;
}

export function getFieldMetricsForInsightSet(
    insightSet: InsightSet, metadata: Types.File.MetaData|null,
    scope: CrUXManager.Scope|null = null): CrUXFieldMetricResults|null {
  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return null;
  }

  const pageResult = getPageResult(cruxFieldData, insightSet.url.href, insightSet.url.origin, scope);
  if (!pageResult) {
    return null;
  }

  return {
    fcp: getMetricTimingResult(pageResult, 'first_contentful_paint', scope),
    lcp: getMetricTimingResult(pageResult, 'largest_contentful_paint', scope),
    inp: getMetricTimingResult(pageResult, 'interaction_to_next_paint', scope),
    cls: getMetricResult(pageResult, 'cumulative_layout_shift', scope),
    lcpBreakdown: {
      ttfb: getMetricTimingResult(pageResult, 'largest_contentful_paint_image_time_to_first_byte', scope),
      loadDelay: getMetricTimingResult(pageResult, 'largest_contentful_paint_image_resource_load_delay', scope),
      loadDuration: getMetricTimingResult(pageResult, 'largest_contentful_paint_image_resource_load_duration', scope),
      renderDelay: getMetricTimingResult(pageResult, 'largest_contentful_paint_image_element_render_delay', scope),
    }
  };
}

export function calculateMetricWeightsForSorting(
    insightSet: InsightSet, metadata: Types.File.MetaData|null): {lcp: number, inp: number, cls: number} {
  const weights = {
    lcp: 1 / 3,
    inp: 1 / 3,
    cls: 1 / 3,
  };

  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return weights;
  }

  const fieldMetrics = getFieldMetricsForInsightSet(insightSet, metadata);
  if (!fieldMetrics) {
    return weights;
  }

  const fieldLcp = fieldMetrics.lcp?.value ?? null;
  const fieldInp = fieldMetrics.inp?.value ?? null;
  const fieldCls = fieldMetrics.cls?.value ?? null;
  const fieldLcpScore = fieldLcp !== null ? evaluateLCPMetricScore(Helpers.Timing.microToMilli(fieldLcp)) : 0;
  const fieldInpScore = fieldInp !== null ? evaluateINPMetricScore(Helpers.Timing.microToMilli(fieldInp)) : 0;
  const fieldClsScore = fieldCls !== null ? evaluateCLSMetricScore(fieldCls) : 0;
  const fieldLcpScoreInverted = 1 - fieldLcpScore;
  const fieldInpScoreInverted = 1 - fieldInpScore;
  const fieldClsScoreInverted = 1 - fieldClsScore;
  const invertedSum = fieldLcpScoreInverted + fieldInpScoreInverted + fieldClsScoreInverted;
  if (!invertedSum) {
    return weights;
  }

  weights.lcp = fieldLcpScoreInverted / invertedSum;
  weights.inp = fieldInpScoreInverted / invertedSum;
  weights.cls = fieldClsScoreInverted / invertedSum;

  return weights;
}

/**
 * Simulates the provided graph before and after the byte savings from `wastedBytesByRequestId` are applied.
 */
function estimateSavingsWithGraphs(
    wastedBytesByRequestId: Map<string, number>, simulator: Lantern.Simulation.Simulator,
    graph: Lantern.Graph.Node): Types.Timing.Milli {
  const simulationBeforeChanges = simulator.simulate(graph);

  const originalTransferSizes = new Map<string, number>();
  graph.traverse(node => {
    if (node.type !== 'network') {
      return;
    }
    const wastedBytes = wastedBytesByRequestId.get(node.request.requestId);
    if (!wastedBytes) {
      return;
    }

    const original = node.request.transferSize;
    originalTransferSizes.set(node.request.requestId, original);

    node.request.transferSize = Math.max(original - wastedBytes, 0);
  });

  const simulationAfterChanges = simulator.simulate(graph);

  // Restore the original transfer size after we've done our simulation
  graph.traverse(node => {
    if (node.type !== 'network') {
      return;
    }
    const originalTransferSize = originalTransferSizes.get(node.request.requestId);
    if (originalTransferSize === undefined) {
      return;
    }
    node.request.transferSize = originalTransferSize;
  });

  let savings = simulationBeforeChanges.timeInMs - simulationAfterChanges.timeInMs;
  savings = Math.round(savings / GRAPH_SAVINGS_PRECISION) * GRAPH_SAVINGS_PRECISION;
  return Types.Timing.Milli(savings);
}

/**
 * Estimates the FCP & LCP savings for wasted bytes in `wastedBytesByRequestId`.
 */
export function metricSavingsForWastedBytes(
    wastedBytesByRequestId: Map<string, number>, context: InsightSetContext): MetricSavings|undefined {
  if (!context.navigation || !context.lantern) {
    return;
  }

  if (!wastedBytesByRequestId.size) {
    return {FCP: Types.Timing.Milli(0), LCP: Types.Timing.Milli(0)};
  }

  const simulator = context.lantern.simulator;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.optimisticGraph;
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.optimisticGraph;

  return {
    FCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, fcpGraph),
    LCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, lcpGraph),
  };
}

/**
 * Returns whether the network request was sent encoded.
 */
export function isRequestCompressed(request: Types.Events.SyntheticNetworkRequest): boolean {
  if (!request.args.data.responseHeaders) {
    return false;
  }

  // FYI: In Lighthouse, older devtools logs (like our test fixtures) seems to be
  // lower case, while modern logs are Cased-Like-This.
  const patterns = [
    /^content-encoding$/i, /^x-content-encoding-over-network$/i,
    /^x-original-content-encoding$/i,  // Lightrider.
  ];
  const compressionTypes = ['gzip', 'br', 'deflate', 'zstd'];
  return request.args.data.responseHeaders.some(
      header => patterns.some(p => header.name.match(p)) && compressionTypes.includes(header.value));
}

function getRequestSizes(request: Types.Events.SyntheticNetworkRequest): {resourceSize: number, transferSize: number} {
  const resourceSize = request.args.data.decodedBodyLength;
  const transferSize = request.args.data.encodedDataLength;
  return {resourceSize, transferSize};
}

/**
 * Estimates the number of bytes the content of this network record would have consumed on the network based on the
 * uncompressed size (totalBytes). Uses the actual transfer size from the network record if applicable,
 * minus the size of the response headers.
 *
 * @param totalBytes Uncompressed size of the resource
 */
export function estimateCompressedContentSize(
    request: Types.Events.SyntheticNetworkRequest|undefined, totalBytes: number,
    resourceType: Protocol.Network.ResourceType): number {
  if (!request) {
    // We don't know how many bytes this asset used on the network, but we can guess it was
    // roughly the size of the content gzipped.
    // See https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer for specific CSS/Script examples
    // See https://discuss.httparchive.org/t/file-size-and-compression-savings/145 for fallback multipliers
    switch (resourceType) {
      case 'Stylesheet':
        // Stylesheets tend to compress extremely well.
        return Math.round(totalBytes * 0.2);
      case 'Script':
      case 'Document':
        // Scripts and HTML compress fairly well too.
        return Math.round(totalBytes * 0.33);
      default:
        // Otherwise we'll just fallback to the average savings in HTTPArchive
        return Math.round(totalBytes * 0.5);
    }
  }

  // Get the size of the response body on the network.
  const {transferSize, resourceSize} = getRequestSizes(request);
  let contentTransferSize = transferSize;
  if (!isRequestCompressed(request)) {
    // This is not compressed, so we can use resourceSize directly.
    // This would be equivalent to transfer size minus headers transfer size, but transfer size
    // may also include bytes for SSL connection etc.
    contentTransferSize = resourceSize;
  }
  // TODO(cjamcl): Get "responseHeadersTransferSize" in Network handler.
  // else if (request.responseHeadersTransferSize) {
  //   // Subtract the size of the encoded headers.
  //   contentTransferSize =
  //     Math.max(0, contentTransferSize - request.responseHeadersTransferSize);
  // }

  if (request.args.data.resourceType === resourceType) {
    // This was a regular standalone asset, just use the transfer size.
    return contentTransferSize;
  }

  // This was an asset that was inlined in a different resource type (e.g. HTML document).
  // Use the compression ratio of the resource to estimate the total transferred bytes.
  // Get the compression ratio, if it's an invalid number, assume no compression.
  const compressionRatio = Number.isFinite(resourceSize) && resourceSize > 0 ? (contentTransferSize / resourceSize) : 1;
  return Math.round(totalBytes * compressionRatio);
}

/**
 * Utility function to estimate the ratio of the compression of a script.
 * This excludes the size of the response headers.
 */
export function estimateCompressionRatioForScript(script: Handlers.ModelHandlers.Scripts.Script): number {
  if (!script.request) {
    // Can't find request, so just use 1.
    return 1;
  }

  const request = script.request;
  const contentLength = request.args.data.decodedBodyLength ?? script.content?.length ?? 0;
  const compressedSize = estimateCompressedContentSize(request, contentLength, Protocol.Network.ResourceType.Script);
  if (contentLength === 0 || compressedSize === 0) {
    return 1;
  }

  const compressionRatio = compressedSize / contentLength;
  return compressionRatio;
}
