var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/trace/insights/Cache.js
var Cache_exports = {};
__export(Cache_exports, {
  UIStrings: () => UIStrings,
  cachingDisabled: () => cachingDisabled,
  computeCacheLifetimeInSeconds: () => computeCacheLifetimeInSeconds,
  createOverlayForRequest: () => createOverlayForRequest,
  createOverlays: () => createOverlays,
  generateInsight: () => generateInsight,
  getCombinedHeaders: () => getCombinedHeaders,
  i18nString: () => i18nString,
  isCacheInsight: () => isCacheInsight,
  isCacheable: () => isCacheable
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Helpers2 from "./../helpers/helpers.js";

// gen/front_end/models/trace/insights/Common.js
var Common_exports = {};
__export(Common_exports, {
  calculateDocFirstByteTs: () => calculateDocFirstByteTs,
  calculateMetricWeightsForSorting: () => calculateMetricWeightsForSorting,
  estimateCompressedContentSize: () => estimateCompressedContentSize,
  estimateCompressionRatioForScript: () => estimateCompressionRatioForScript,
  evaluateCLSMetricScore: () => evaluateCLSMetricScore,
  evaluateINPMetricScore: () => evaluateINPMetricScore,
  evaluateLCPMetricScore: () => evaluateLCPMetricScore,
  getCLS: () => getCLS,
  getFieldMetricsForInsightSet: () => getFieldMetricsForInsightSet,
  getINP: () => getINP,
  getInsight: () => getInsight,
  getLCP: () => getLCP,
  insightBounds: () => insightBounds,
  isRequestCompressed: () => isRequestCompressed,
  isRequestServedFromBrowserCache: () => isRequestServedFromBrowserCache,
  metricSavingsForWastedBytes: () => metricSavingsForWastedBytes
});
import * as Helpers from "./../helpers/helpers.js";
import * as Types from "./../types/types.js";

// gen/front_end/models/trace/insights/Statistics.js
var Statistics_exports = {};
__export(Statistics_exports, {
  getLogNormalScore: () => getLogNormalScore,
  linearInterpolation: () => linearInterpolation
});
var MIN_PASSING_SCORE = 0.9;
var MAX_AVERAGE_SCORE = 0.8999999999999999;
var MIN_AVERAGE_SCORE = 0.5;
var MAX_FAILING_SCORE = 0.49999999999999994;
function erf(x) {
  const sign = Math.sign(x);
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return sign * (1 - y * Math.exp(-x * x));
}
function getLogNormalScore({ median, p10 }, value) {
  if (median <= 0) {
    throw new Error("median must be greater than zero");
  }
  if (p10 <= 0) {
    throw new Error("p10 must be greater than zero");
  }
  if (p10 >= median) {
    throw new Error("p10 must be less than the median");
  }
  if (value <= 0) {
    return 1;
  }
  const INVERSE_ERFC_ONE_FIFTH = 0.9061938024368232;
  const xRatio = Math.max(Number.MIN_VALUE, value / median);
  const xLogRatio = Math.log(xRatio);
  const p10Ratio = Math.max(Number.MIN_VALUE, p10 / median);
  const p10LogRatio = -Math.log(p10Ratio);
  const standardizedX = xLogRatio * INVERSE_ERFC_ONE_FIFTH / p10LogRatio;
  const complementaryPercentile = (1 - erf(standardizedX)) / 2;
  let score;
  if (value <= p10) {
    score = Math.max(MIN_PASSING_SCORE, Math.min(1, complementaryPercentile));
  } else if (value <= median) {
    score = Math.max(MIN_AVERAGE_SCORE, Math.min(MAX_AVERAGE_SCORE, complementaryPercentile));
  } else {
    score = Math.max(0, Math.min(MAX_FAILING_SCORE, complementaryPercentile));
  }
  return score;
}
function linearInterpolation(x0, y0, x1, y1, x) {
  const slope = (y1 - y0) / (x1 - x0);
  return y0 + (x - x0) * slope;
}

// gen/front_end/models/trace/insights/Common.js
var GRAPH_SAVINGS_PRECISION = 50;
function getInsight(insightName, insightSet) {
  return insightSet.model[insightName];
}
function getLCP(insightSet) {
  const insight = getInsight("LCPBreakdown", insightSet);
  if (!insight || !insight.lcpMs || !insight.lcpEvent) {
    return null;
  }
  const value = Helpers.Timing.milliToMicro(insight.lcpMs);
  return { value, event: insight.lcpEvent };
}
function getINP(insightSet) {
  const insight = getInsight("INPBreakdown", insightSet);
  if (!insight?.longestInteractionEvent?.dur) {
    return null;
  }
  const value = insight.longestInteractionEvent.dur;
  return { value, event: insight.longestInteractionEvent };
}
function getCLS(insightSet) {
  const insight = getInsight("CLSCulprits", insightSet);
  if (!insight) {
    return { value: 0, worstClusterEvent: null };
  }
  let maxScore = 0;
  let worstCluster;
  for (const cluster of insight.clusters) {
    if (cluster.clusterCumulativeScore > maxScore) {
      maxScore = cluster.clusterCumulativeScore;
      worstCluster = cluster;
    }
  }
  return { value: maxScore, worstClusterEvent: worstCluster ?? null };
}
function evaluateLCPMetricScore(value) {
  return getLogNormalScore({ p10: 2500, median: 4e3 }, value);
}
function evaluateINPMetricScore(value) {
  return getLogNormalScore({ p10: 200, median: 500 }, value);
}
function evaluateCLSMetricScore(value) {
  return getLogNormalScore({ p10: 0.1, median: 0.25 }, value);
}
function getPageResult(cruxFieldData, url, origin, scope = null) {
  return cruxFieldData.find((result) => {
    const key = scope ? result[`${scope.pageScope}-${scope.deviceScope}`]?.record.key : (result["url-ALL"] || result["origin-ALL"])?.record.key;
    return key?.url && key.url === url || key?.origin && key.origin === origin;
  });
}
function getMetricResult(pageResult, name, scope = null) {
  const scopes = [];
  if (scope) {
    scopes.push(scope);
  } else {
    scopes.push({ pageScope: "url", deviceScope: "ALL" });
    scopes.push({ pageScope: "origin", deviceScope: "ALL" });
  }
  for (const scope2 of scopes) {
    const key = `${scope2.pageScope}-${scope2.deviceScope}`;
    let value = pageResult[key]?.record.metrics[name]?.percentiles?.p75;
    if (typeof value === "string") {
      value = Number(value);
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return { value, pageScope: scope2.pageScope };
    }
  }
  return null;
}
function getMetricTimingResult(pageResult, name, scope = null) {
  const result = getMetricResult(pageResult, name, scope);
  if (result) {
    const valueMs = result.value;
    return { value: Helpers.Timing.milliToMicro(valueMs), pageScope: result.pageScope };
  }
  return null;
}
function getFieldMetricsForInsightSet(insightSet, metadata, scope = null) {
  const cruxFieldData = metadata?.cruxFieldData;
  if (!cruxFieldData) {
    return null;
  }
  const pageResult = getPageResult(cruxFieldData, insightSet.url.href, insightSet.url.origin, scope);
  if (!pageResult) {
    return null;
  }
  return {
    fcp: getMetricTimingResult(pageResult, "first_contentful_paint", scope),
    lcp: getMetricTimingResult(pageResult, "largest_contentful_paint", scope),
    inp: getMetricTimingResult(pageResult, "interaction_to_next_paint", scope),
    cls: getMetricResult(pageResult, "cumulative_layout_shift", scope),
    lcpBreakdown: {
      ttfb: getMetricTimingResult(pageResult, "largest_contentful_paint_image_time_to_first_byte", scope),
      loadDelay: getMetricTimingResult(pageResult, "largest_contentful_paint_image_resource_load_delay", scope),
      loadDuration: getMetricTimingResult(pageResult, "largest_contentful_paint_image_resource_load_duration", scope),
      renderDelay: getMetricTimingResult(pageResult, "largest_contentful_paint_image_element_render_delay", scope)
    }
  };
}
function calculateMetricWeightsForSorting(insightSet, metadata) {
  const weights = {
    lcp: 1 / 3,
    inp: 1 / 3,
    cls: 1 / 3
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
function estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, graph) {
  const simulationBeforeChanges = simulator.simulate(graph);
  const originalTransferSizes = /* @__PURE__ */ new Map();
  graph.traverse((node) => {
    if (node.type !== "network") {
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
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    const originalTransferSize = originalTransferSizes.get(node.request.requestId);
    if (originalTransferSize === void 0) {
      return;
    }
    node.request.transferSize = originalTransferSize;
  });
  let savings = simulationBeforeChanges.timeInMs - simulationAfterChanges.timeInMs;
  savings = Math.round(savings / GRAPH_SAVINGS_PRECISION) * GRAPH_SAVINGS_PRECISION;
  return Types.Timing.Milli(savings);
}
function metricSavingsForWastedBytes(wastedBytesByRequestId, context) {
  if (!context.navigation || !context.lantern) {
    return;
  }
  if (!wastedBytesByRequestId.size) {
    return { FCP: Types.Timing.Milli(0), LCP: Types.Timing.Milli(0) };
  }
  const simulator = context.lantern.simulator;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.optimisticGraph;
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.optimisticGraph;
  return {
    FCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, fcpGraph),
    LCP: estimateSavingsWithGraphs(wastedBytesByRequestId, simulator, lcpGraph)
  };
}
function isRequestCompressed(request) {
  if (!request.args.data.responseHeaders) {
    return false;
  }
  const patterns = [
    /^content-encoding$/i,
    /^x-content-encoding-over-network$/i,
    /^x-original-content-encoding$/i
    // Lightrider.
  ];
  const compressionTypes = ["gzip", "br", "deflate", "zstd"];
  return request.args.data.responseHeaders.some((header) => patterns.some((p) => header.name.match(p)) && compressionTypes.includes(header.value));
}
function isRequestServedFromBrowserCache(request) {
  if (!request.args.data.responseHeaders || request.args.data.failed) {
    return false;
  }
  if (request.args.data.statusCode === 304) {
    return true;
  }
  const { transferSize, resourceSize } = getRequestSizes(request);
  const ratio = resourceSize ? transferSize / resourceSize : 0;
  if (ratio < 0.01) {
    return true;
  }
  return false;
}
function getRequestSizes(request) {
  const resourceSize = request.args.data.decodedBodyLength;
  const transferSize = request.args.data.encodedDataLength;
  return { resourceSize, transferSize };
}
function estimateCompressedContentSize(request, totalBytes, resourceType) {
  if (!request || isRequestServedFromBrowserCache(request)) {
    switch (resourceType) {
      case "Stylesheet":
        return Math.round(totalBytes * 0.2);
      case "Script":
      case "Document":
        return Math.round(totalBytes * 0.33);
      default:
        return Math.round(totalBytes * 0.5);
    }
  }
  const { transferSize, resourceSize } = getRequestSizes(request);
  let contentTransferSize = transferSize;
  if (!isRequestCompressed(request)) {
    contentTransferSize = resourceSize;
  }
  if (request.args.data.resourceType === resourceType) {
    return contentTransferSize;
  }
  const compressionRatio = Number.isFinite(resourceSize) && resourceSize > 0 ? contentTransferSize / resourceSize : 1;
  return Math.round(totalBytes * compressionRatio);
}
function estimateCompressionRatioForScript(script) {
  if (!script.request) {
    return 1;
  }
  const request = script.request;
  const contentLength = request.args.data.decodedBodyLength ?? script.content?.length ?? 0;
  const compressedSize = estimateCompressedContentSize(
    request,
    contentLength,
    "Script"
    /* Protocol.Network.ResourceType.Script */
  );
  if (contentLength === 0 || compressedSize === 0) {
    return 1;
  }
  const compressionRatio = compressedSize / contentLength;
  return compressionRatio;
}
function calculateDocFirstByteTs(docRequest) {
  if (docRequest.args.data.protocol === "file") {
    return docRequest.ts;
  }
  const timing = docRequest.args.data.timing;
  if (!timing) {
    return null;
  }
  return Types.Timing.Micro(Helpers.Timing.secondsToMicro(timing.requestTime) + Helpers.Timing.milliToMicro(timing.receiveHeadersStart ?? timing.receiveHeadersEnd));
}
function insightBounds(insight, insightSetBounds) {
  const overlays = insight.createOverlays?.() ?? [];
  const windows = overlays.map(Helpers.Timing.traceWindowFromOverlay).filter((bounds) => !!bounds);
  const overlaysBounds = Helpers.Timing.combineTraceWindowsMicro(windows);
  if (overlaysBounds) {
    return overlaysBounds;
  }
  return insightSetBounds;
}

// gen/front_end/models/trace/insights/types.js
var types_exports = {};
__export(types_exports, {
  InsightCategory: () => InsightCategory,
  InsightWarning: () => InsightWarning
});
var InsightWarning;
(function(InsightWarning2) {
  InsightWarning2["NO_FP"] = "NO_FP";
  InsightWarning2["NO_LCP"] = "NO_LCP";
  InsightWarning2["NO_DOCUMENT_REQUEST"] = "NO_DOCUMENT_REQUEST";
  InsightWarning2["NO_LAYOUT"] = "NO_LAYOUT";
})(InsightWarning || (InsightWarning = {}));
var InsightCategory;
(function(InsightCategory2) {
  InsightCategory2["ALL"] = "All";
  InsightCategory2["INP"] = "INP";
  InsightCategory2["LCP"] = "LCP";
  InsightCategory2["CLS"] = "CLS";
})(InsightCategory || (InsightCategory = {}));

// gen/front_end/models/trace/insights/Cache.js
var UIStrings = {
  /**
   * @description Title of an insight that provides information and suggestions of resources that could improve their caching.
   */
  title: "Use efficient cache lifetimes",
  /**
   * @description Text to tell the user about how caching can help improve performance.
   */
  description: "A long cache lifetime can speed up repeat visits to your page. [Learn more about caching](https://developer.chrome.com/docs/performance/insights/cache).",
  /**
   * @description Column for a font loaded by the page to render text.
   */
  requestColumn: "Request",
  /**
   * @description Column for a resource cache's Time To Live.
   */
  cacheTTL: "Cache TTL",
  /**
   * @description Text describing that there were no requests found that need caching.
   */
  noRequestsToCache: "No requests with inefficient cache policies",
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: "{PH1} others"
};
var str_ = i18n.i18n.registerUIStrings("models/trace/insights/Cache.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var IGNORE_THRESHOLD_IN_PERCENT = 0.925;
function finalize(partialModel) {
  return {
    insightKey: "Cache",
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    docs: "https://developer.chrome.com/docs/performance/insights/cache",
    category: InsightCategory.ALL,
    state: partialModel.requests.length > 0 ? "fail" : "pass",
    ...partialModel
  };
}
function isCacheable(request) {
  if (Helpers2.Network.NON_NETWORK_SCHEMES.includes(request.args.data.protocol)) {
    return false;
  }
  return Boolean(Helpers2.Network.CACHEABLE_STATUS_CODES.has(request.args.data.statusCode) && Helpers2.Network.STATIC_RESOURCE_TYPES.has(
    request.args.data.resourceType || "Other"
    /* Protocol.Network.ResourceType.Other */
  ));
}
function computeCacheLifetimeInSeconds(headers, cacheControl) {
  if (cacheControl?.["max-age"] !== void 0) {
    return cacheControl["max-age"];
  }
  const expiresHeaders = headers.find((h) => h.name === "expires")?.value ?? null;
  if (expiresHeaders) {
    const expires = new Date(expiresHeaders).getTime();
    if (!expires) {
      return 0;
    }
    return Math.ceil((expires - Date.now()) / 1e3);
  }
  return null;
}
function getCacheHitProbability(maxAgeInSeconds) {
  const RESOURCE_AGE_IN_HOURS_DECILES = [0, 0.2, 1, 3, 8, 12, 24, 48, 72, 168, 8760, Infinity];
  const maxAgeInHours = maxAgeInSeconds / 3600;
  const upperDecileIndex = RESOURCE_AGE_IN_HOURS_DECILES.findIndex((decile) => decile >= maxAgeInHours);
  if (upperDecileIndex === RESOURCE_AGE_IN_HOURS_DECILES.length - 1) {
    return 1;
  }
  if (upperDecileIndex === 0) {
    return 0;
  }
  const upperDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex];
  const lowerDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex - 1];
  const upperDecile = upperDecileIndex / 10;
  const lowerDecile = (upperDecileIndex - 1) / 10;
  return linearInterpolation(lowerDecileValue, lowerDecile, upperDecileValue, upperDecile, maxAgeInHours);
}
function getCombinedHeaders(responseHeaders) {
  const headers = /* @__PURE__ */ new Map();
  for (const header of responseHeaders) {
    const name = header.name.toLowerCase();
    if (headers.get(name)) {
      headers.set(name, `${headers.get(name)}, ${header.value}`);
    } else {
      headers.set(name, header.value);
    }
  }
  return headers;
}
function cachingDisabled(headers, parsedCacheControl) {
  const cacheControl = headers?.get("cache-control") ?? null;
  const pragma = headers?.get("pragma") ?? null;
  if (!cacheControl && pragma?.includes("no-cache")) {
    return true;
  }
  if (parsedCacheControl && (parsedCacheControl["must-revalidate"] || parsedCacheControl["no-cache"] || parsedCacheControl["no-store"] || parsedCacheControl["private"])) {
    return true;
  }
  return false;
}
function isCacheInsight(model) {
  return model.insightKey === "Cache";
}
function generateInsight(data, context) {
  const isWithinContext = (event) => Helpers2.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const results = [];
  let totalWastedBytes = 0;
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const req of contextRequests) {
    if (!req.args.data.responseHeaders || !isCacheable(req)) {
      continue;
    }
    const headers = getCombinedHeaders(req.args.data.responseHeaders);
    const cacheControl = headers.get("cache-control") ?? null;
    const parsedDirectives = Helpers2.Network.parseCacheControl(cacheControl);
    if (cachingDisabled(headers, parsedDirectives)) {
      continue;
    }
    let ttl = computeCacheLifetimeInSeconds(req.args.data.responseHeaders, parsedDirectives);
    if (ttl !== null && (!Number.isFinite(ttl) || ttl <= 0)) {
      continue;
    }
    ttl = ttl || 0;
    const ttlDays = ttl / 86400;
    if (ttlDays >= 30) {
      continue;
    }
    const cacheHitProbability = getCacheHitProbability(ttl);
    if (cacheHitProbability > IGNORE_THRESHOLD_IN_PERCENT) {
      continue;
    }
    const transferSize = req.args.data.encodedDataLength || 0;
    const wastedBytes = (1 - cacheHitProbability) * transferSize;
    wastedBytesByRequestId.set(req.args.data.requestId, wastedBytes);
    totalWastedBytes += wastedBytes;
    results.push({ request: req, ttl, wastedBytes });
  }
  results.sort((a, b) => {
    return b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength || a.ttl - b.ttl;
  });
  return finalize({
    relatedEvents: results.map((r) => r.request),
    requests: results,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: totalWastedBytes
  });
}
function createOverlayForRequest(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays(model) {
  return model.requests.map((req) => createOverlayForRequest(req.request));
}

// gen/front_end/models/trace/insights/Models.js
var Models_exports = {};
__export(Models_exports, {
  CLSCulprits: () => CLSCulprits_exports,
  Cache: () => Cache_exports,
  DOMSize: () => DOMSize_exports,
  DocumentLatency: () => DocumentLatency_exports,
  DuplicatedJavaScript: () => DuplicatedJavaScript_exports,
  FontDisplay: () => FontDisplay_exports,
  ForcedReflow: () => ForcedReflow_exports,
  INPBreakdown: () => INPBreakdown_exports,
  ImageDelivery: () => ImageDelivery_exports,
  LCPBreakdown: () => LCPBreakdown_exports,
  LCPDiscovery: () => LCPDiscovery_exports,
  LegacyJavaScript: () => LegacyJavaScript_exports,
  ModernHTTP: () => ModernHTTP_exports,
  NetworkDependencyTree: () => NetworkDependencyTree_exports,
  RenderBlocking: () => RenderBlocking_exports,
  SlowCSSSelector: () => SlowCSSSelector_exports,
  ThirdParties: () => ThirdParties_exports,
  Viewport: () => Viewport_exports
});

// gen/front_end/models/trace/insights/CLSCulprits.js
var CLSCulprits_exports = {};
__export(CLSCulprits_exports, {
  UIStrings: () => UIStrings2,
  createOverlays: () => createOverlays2,
  generateInsight: () => generateInsight2,
  getNonCompositedFailure: () => getNonCompositedFailure,
  i18nString: () => i18nString2,
  isCLSCulpritsInsight: () => isCLSCulpritsInsight
});
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as Handlers from "./../handlers/handlers.js";
import * as Helpers3 from "./../helpers/helpers.js";
import * as Types2 from "./../types/types.js";
var UIStrings2 = {
  /** Title of an insight that provides details about why elements shift/move on the page. The causes for these shifts are referred to as culprits ("reasons"). */
  title: "Layout shift culprits",
  /**
   * @description Description of a DevTools insight that identifies the reasons that elements shift on the page.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: "Layout shifts occur when elements move absent any user interaction. [Investigate the causes of layout shifts](https://developer.chrome.com/docs/performance/insights/cls-culprit), such as elements being added, removed, or their fonts changing as the page loads.",
  /**
   * @description Text indicating the worst layout shift cluster.
   */
  worstLayoutShiftCluster: "Worst layout shift cluster",
  /**
   * @description Text indicating the worst layout shift cluster.
   */
  worstCluster: "Worst cluster",
  /**
   * @description Text indicating a layout shift cluster and its start time.
   * @example {32 ms} PH1
   */
  layoutShiftCluster: "Layout shift cluster @ {PH1}",
  /**
   * @description Text indicating the biggest reasons for the layout shifts.
   */
  topCulprits: "Top layout shift culprits",
  /**
   * @description Text for a culprit type of Injected iframe.
   */
  injectedIframe: "Injected iframe",
  /**
   * @description Text for a culprit type of web font request.
   */
  webFont: "Web font",
  /**
   * @description Text for a culprit type of Animation.
   */
  animation: "Animation",
  /**
   * @description Text for a culprit type of Unsized image.
   */
  unsizedImage: "Unsized image element",
  /**
   * @description Text status when there were no layout shifts detected.
   */
  noLayoutShifts: "No layout shifts",
  /**
   * @description Text status when there no layout shifts culprits/root causes were found.
   */
  noCulprits: "Could not detect any layout shift culprits"
};
var str_2 = i18n3.i18n.registerUIStrings("models/trace/insights/CLSCulprits.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var ACTIONABLE_FAILURE_REASONS = [
  {
    flag: 1 << 0,
    failure: "ACCELERATED_ANIMATIONS_DISABLED"
  },
  {
    flag: 1 << 1,
    failure: "EFFECT_SUPPRESSED_BY_DEVTOOLS"
  },
  {
    flag: 1 << 2,
    failure: "INVALID_ANIMATION_OR_EFFECT"
  },
  {
    flag: 1 << 3,
    failure: "EFFECT_HAS_UNSUPPORTED_TIMING_PARAMS"
  },
  {
    flag: 1 << 4,
    failure: "EFFECT_HAS_NON_REPLACE_COMPOSITE_MODE"
  },
  {
    flag: 1 << 5,
    failure: "TARGET_HAS_INVALID_COMPOSITING_STATE"
  },
  {
    flag: 1 << 6,
    failure: "TARGET_HAS_INCOMPATIBLE_ANIMATIONS"
  },
  {
    flag: 1 << 7,
    failure: "TARGET_HAS_CSS_OFFSET"
  },
  // The failure 1 << 8 is marked as obsolete in Blink
  {
    flag: 1 << 9,
    failure: "ANIMATION_AFFECTS_NON_CSS_PROPERTIES"
  },
  {
    flag: 1 << 10,
    failure: "TRANSFORM_RELATED_PROPERTY_CANNOT_BE_ACCELERATED_ON_TARGET"
  },
  {
    flag: 1 << 11,
    failure: "TRANSFROM_BOX_SIZE_DEPENDENT"
  },
  {
    flag: 1 << 12,
    failure: "FILTER_RELATED_PROPERTY_MAY_MOVE_PIXELS"
  },
  {
    flag: 1 << 13,
    failure: "UNSUPPORTED_CSS_PROPERTY"
  },
  // The failure 1 << 14 is marked as obsolete in Blink
  {
    flag: 1 << 15,
    failure: "MIXED_KEYFRAME_VALUE_TYPES"
  },
  {
    flag: 1 << 16,
    failure: "TIMELINE_SOURCE_HAS_INVALID_COMPOSITING_STATE"
  },
  {
    flag: 1 << 17,
    failure: "ANIMATION_HAS_NO_VISIBLE_CHANGE"
  },
  {
    flag: 1 << 18,
    failure: "AFFECTS_IMPORTANT_PROPERTY"
  },
  {
    flag: 1 << 19,
    failure: "SVG_TARGET_HAS_INDEPENDENT_TRANSFORM_PROPERTY"
  }
];
var ROOT_CAUSE_WINDOW = Helpers3.Timing.secondsToMicro(Types2.Timing.Seconds(0.5));
function isInRootCauseWindow(event, targetEvent) {
  const eventEnd = event.dur ? event.ts + event.dur : event.ts;
  return eventEnd < targetEvent.ts && eventEnd >= targetEvent.ts - ROOT_CAUSE_WINDOW;
}
function getNonCompositedFailure(animationEvent) {
  const failures = [];
  const beginEvent = animationEvent.args.data.beginEvent;
  const instantEvents = animationEvent.args.data.instantEvents || [];
  for (const event of instantEvents) {
    const failureMask = event.args.data.compositeFailed;
    const unsupportedProperties = event.args.data.unsupportedProperties;
    if (!failureMask) {
      continue;
    }
    const failureReasons = ACTIONABLE_FAILURE_REASONS.filter((reason) => failureMask & reason.flag).map((reason) => reason.failure);
    const failure = {
      name: beginEvent.args.data.displayName,
      failureReasons,
      unsupportedProperties,
      animation: animationEvent
    };
    failures.push(failure);
  }
  return failures;
}
function getNonCompositedFailureRootCauses(animationEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift) {
  const allAnimationFailures = [];
  for (const animation of animationEvents) {
    const failures = getNonCompositedFailure(animation);
    if (!failures) {
      continue;
    }
    allAnimationFailures.push(...failures);
    const nextPrePaint = getNextEvent(prePaintEvents, animation);
    if (!nextPrePaint) {
      continue;
    }
    if (!isInRootCauseWindow(animation, nextPrePaint)) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.nonCompositedAnimations.push(...failures);
    }
  }
  return allAnimationFailures;
}
function getShiftsByPrePaintEvents(layoutShifts, prePaintEvents) {
  const shiftsByPrePaint = /* @__PURE__ */ new Map();
  for (const prePaintEvent of prePaintEvents) {
    const firstShiftIndex = Platform.ArrayUtilities.nearestIndexFromBeginning(layoutShifts, (shift) => shift.ts >= prePaintEvent.ts);
    if (firstShiftIndex === null) {
      continue;
    }
    for (let i = firstShiftIndex; i < layoutShifts.length; i++) {
      const shift = layoutShifts[i];
      if (shift.ts >= prePaintEvent.ts && shift.ts <= prePaintEvent.ts + prePaintEvent.dur) {
        const shiftsInPrePaint = Platform.MapUtilities.getWithDefault(shiftsByPrePaint, prePaintEvent, () => []);
        shiftsInPrePaint.push(shift);
      }
      if (shift.ts > prePaintEvent.ts + prePaintEvent.dur) {
        break;
      }
    }
  }
  return shiftsByPrePaint;
}
function getNextEvent(sourceEvents, targetEvent) {
  const index = Platform.ArrayUtilities.nearestIndexFromBeginning(sourceEvents, (source) => source.ts > targetEvent.ts + (targetEvent.dur || 0));
  if (index === null) {
    return void 0;
  }
  return sourceEvents[index];
}
function getIframeRootCauses(data, iframeCreatedEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift, domLoadingEvents) {
  for (const iframeEvent of iframeCreatedEvents) {
    const nextPrePaint = getNextEvent(prePaintEvents, iframeEvent);
    if (!nextPrePaint) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      const domEvent = domLoadingEvents.find((e) => {
        const maxIframe = Types2.Timing.Micro(iframeEvent.ts + (iframeEvent.dur ?? 0));
        return e.ts >= iframeEvent.ts && e.ts <= maxIframe;
      });
      if (domEvent?.args.frame) {
        const frame = domEvent.args.frame;
        let url;
        const processes = data.Meta.rendererProcessesByFrame.get(frame);
        if (processes && processes.size > 0) {
          url = [...processes.values()][0]?.[0].frame.url;
        }
        rootCausesForShift.iframes.push({ frame, url });
      }
    }
  }
  return rootCausesByShift;
}
function getUnsizedImageRootCauses(unsizedImageEvents, paintImageEvents, shiftsByPrePaint, rootCausesByShift) {
  shiftsByPrePaint.forEach((shifts, prePaint) => {
    const paintImage = getNextEvent(paintImageEvents, prePaint);
    if (!paintImage) {
      return;
    }
    const matchingNode = unsizedImageEvents.find((unsizedImage) => unsizedImage.args.data.nodeId === paintImage.args.data.nodeId);
    if (!matchingNode) {
      return;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.unsizedImages.push({
        backendNodeId: matchingNode.args.data.nodeId,
        paintImageEvent: paintImage
      });
    }
  });
  return rootCausesByShift;
}
function isCLSCulpritsInsight(insight) {
  return insight.insightKey === "CLSCulprits";
}
function getFontRootCauses(networkRequests, prePaintEvents, shiftsByPrePaint, rootCausesByShift) {
  const fontRequests = networkRequests.filter((req) => req.args.data.resourceType === "Font" && req.args.data.mimeType.startsWith("font"));
  for (const req of fontRequests) {
    const nextPrePaint = getNextEvent(prePaintEvents, req);
    if (!nextPrePaint) {
      continue;
    }
    if (!isInRootCauseWindow(req, nextPrePaint)) {
      continue;
    }
    const shifts = shiftsByPrePaint.get(nextPrePaint);
    if (!shifts) {
      continue;
    }
    for (const shift of shifts) {
      const rootCausesForShift = rootCausesByShift.get(shift);
      if (!rootCausesForShift) {
        throw new Error("Unaccounted shift");
      }
      rootCausesForShift.webFonts.push(req);
    }
  }
  return rootCausesByShift;
}
function getTopCulprits(cluster, culpritsByShift) {
  const MAX_TOP_CULPRITS = 3;
  const causes = [];
  const shifts = cluster.events;
  for (const shift of shifts) {
    const culprits = culpritsByShift.get(shift);
    if (!culprits) {
      continue;
    }
    const fontReq = culprits.webFonts;
    const iframes = culprits.iframes;
    const animations = culprits.nonCompositedAnimations;
    const unsizedImages = culprits.unsizedImages;
    for (let i = 0; i < fontReq.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 0, description: i18nString2(UIStrings2.webFont) });
    }
    for (let i = 0; i < iframes.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 1, description: i18nString2(UIStrings2.injectedIframe) });
    }
    for (let i = 0; i < animations.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({ type: 2, description: i18nString2(UIStrings2.animation) });
    }
    for (let i = 0; i < unsizedImages.length && causes.length < MAX_TOP_CULPRITS; i++) {
      causes.push({
        type: 3,
        description: i18nString2(UIStrings2.unsizedImage),
        url: unsizedImages[i].paintImageEvent.args.data.url || "",
        backendNodeId: unsizedImages[i].backendNodeId,
        frame: unsizedImages[i].paintImageEvent.args.data.frame || ""
      });
    }
    if (causes.length >= MAX_TOP_CULPRITS) {
      break;
    }
  }
  return causes.slice(0, MAX_TOP_CULPRITS);
}
function finalize2(partialModel) {
  let state = "pass";
  if (partialModel.worstCluster) {
    const classification = Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(partialModel.worstCluster.clusterCumulativeScore);
    if (classification === "good") {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "CLSCulprits",
    strings: UIStrings2,
    title: i18nString2(UIStrings2.title),
    description: i18nString2(UIStrings2.description),
    docs: "https://developer.chrome.com/docs/performance/insights/cls-culprit",
    category: InsightCategory.CLS,
    state,
    ...partialModel
  };
}
function generateInsight2(data, context) {
  const isWithinContext = (event) => Helpers3.Timing.eventIsInBounds(event, context.bounds);
  const compositeAnimationEvents = data.Animations.animations.filter(isWithinContext);
  const iframeEvents = data.LayoutShifts.renderFrameImplCreateChildFrameEvents.filter(isWithinContext);
  const networkRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const domLoadingEvents = data.LayoutShifts.domLoadingEvents.filter(isWithinContext);
  const unsizedImageEvents = data.LayoutShifts.layoutImageUnsizedEvents.filter(isWithinContext);
  const clusterKey = context.navigation ? context.navigationId : Types2.Events.NO_NAVIGATION;
  const clusters = data.LayoutShifts.clustersByNavigationId.get(clusterKey) ?? [];
  const clustersByScore = clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore);
  const worstCluster = clustersByScore.at(0);
  const layoutShifts = clusters.flatMap((cluster) => cluster.events);
  const prePaintEvents = data.LayoutShifts.prePaintEvents.filter(isWithinContext);
  const paintImageEvents = data.LayoutShifts.paintImageEvents.filter(isWithinContext);
  const rootCausesByShift = /* @__PURE__ */ new Map();
  const shiftsByPrePaint = getShiftsByPrePaintEvents(layoutShifts, prePaintEvents);
  for (const shift of layoutShifts) {
    rootCausesByShift.set(shift, { iframes: [], webFonts: [], nonCompositedAnimations: [], unsizedImages: [] });
  }
  getIframeRootCauses(data, iframeEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift, domLoadingEvents);
  getFontRootCauses(networkRequests, prePaintEvents, shiftsByPrePaint, rootCausesByShift);
  getUnsizedImageRootCauses(unsizedImageEvents, paintImageEvents, shiftsByPrePaint, rootCausesByShift);
  const animationFailures = getNonCompositedFailureRootCauses(compositeAnimationEvents, prePaintEvents, shiftsByPrePaint, rootCausesByShift);
  const relatedEvents = [...layoutShifts];
  if (worstCluster) {
    relatedEvents.push(worstCluster);
  }
  const topCulpritsByCluster = /* @__PURE__ */ new Map();
  for (const cluster of clusters) {
    topCulpritsByCluster.set(cluster, getTopCulprits(cluster, rootCausesByShift));
  }
  return finalize2({
    relatedEvents,
    animationFailures,
    shifts: rootCausesByShift,
    clusters,
    worstCluster,
    topCulpritsByCluster
  });
}
function createOverlays2(model) {
  const clustersByScore = model.clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore) ?? [];
  const worstCluster = clustersByScore[0];
  if (!worstCluster) {
    return [];
  }
  const range = Types2.Timing.Micro(worstCluster.dur ?? 0);
  const max = Types2.Timing.Micro(worstCluster.ts + range);
  return [{
    type: "TIMESPAN_BREAKDOWN",
    sections: [
      {
        bounds: { min: worstCluster.ts, range, max },
        label: i18nString2(UIStrings2.worstLayoutShiftCluster),
        showDuration: false
      }
    ],
    // This allows for the overlay to sit over the layout shift.
    entry: worstCluster.events[0],
    renderLocation: "ABOVE_EVENT"
  }];
}

// gen/front_end/models/trace/insights/DocumentLatency.js
var DocumentLatency_exports = {};
__export(DocumentLatency_exports, {
  UIStrings: () => UIStrings3,
  createOverlays: () => createOverlays3,
  generateInsight: () => generateInsight3,
  i18nString: () => i18nString3,
  isDocumentLatencyInsight: () => isDocumentLatencyInsight
});
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as Helpers4 from "./../helpers/helpers.js";
import * as Types3 from "./../types/types.js";
var UIStrings3 = {
  /**
   * @description Title of an insight that provides a breakdown for how long it took to download the main document.
   */
  title: "Document request latency",
  /**
   * @description Description of an insight that provides a breakdown for how long it took to download the main document.
   */
  description: "Your first network request is the most important. [Reduce its latency](https://developer.chrome.com/docs/performance/insights/document-latency) by avoiding redirects, ensuring a fast server response, and enabling text compression.",
  /**
   * @description Text to tell the user that the document request does not have redirects.
   */
  passingRedirects: "Avoids redirects",
  /**
   * @description Text to tell the user that the document request had redirects.
   * @example {3} PH1
   * @example {1000 ms} PH2
   */
  failedRedirects: "Had redirects ({PH1} redirects, +{PH2})",
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is acceptable.
   * @example {600 ms} PH1
   */
  passingServerResponseTime: "Server responds quickly (observed {PH1})",
  /**
   * @description Text to tell the user that the time starting the document request to when the server started responding is not acceptable.
   * @example {601 ms} PH1
   */
  failedServerResponseTime: "Server responded slowly (observed {PH1})",
  /**
   * @description Text to tell the user that text compression (like gzip) was applied.
   */
  passingTextCompression: "Applies text compression",
  /**
   * @description Text to tell the user that text compression (like gzip) was not applied.
   */
  failedTextCompression: "No compression applied",
  /**
   * @description Text for a label describing a network request event as having redirects.
   */
  redirectsLabel: "Redirects",
  /**
   * @description Text for a label describing a network request event as taking too long to start delivery by the server.
   */
  serverResponseTimeLabel: "Server response time",
  /**
   * @description Text for a label describing a network request event as taking longer to download because it wasn't compressed.
   */
  uncompressedDownload: "Uncompressed download"
};
var str_3 = i18n5.i18n.registerUIStrings("models/trace/insights/DocumentLatency.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var TOO_SLOW_THRESHOLD_MS = 600;
var TARGET_MS = 100;
var IGNORE_THRESHOLD_IN_BYTES = 1400;
function isDocumentLatencyInsight(x) {
  return x.insightKey === "DocumentLatency";
}
function getServerResponseTime(request) {
  const isLightrider = globalThis.isLightrider;
  if (isLightrider) {
    return request.args.data.lrServerResponseTime ?? null;
  }
  const timing = request.args.data.timing;
  if (!timing) {
    return null;
  }
  const ms = Helpers4.Timing.microToMilli(request.args.data.syntheticData.serverResponseTime);
  return Math.round(ms);
}
function getCompressionSavings(request) {
  const isCompressed = isRequestCompressed(request);
  if (isCompressed) {
    return 0;
  }
  const originalSize = request.args.data.decodedBodyLength;
  let estimatedSavings = 0;
  switch (request.args.data.mimeType) {
    case "text/css":
      estimatedSavings = Math.round(originalSize * 0.8);
      break;
    case "text/html":
    case "text/javascript":
      estimatedSavings = Math.round(originalSize * 0.67);
      break;
    case "text/plain":
    case "text/xml":
    case "text/x-component":
    case "application/javascript":
    case "application/json":
    case "application/manifest+json":
    case "application/vnd.api+json":
    case "application/xml":
    case "application/xhtml+xml":
    case "application/rss+xml":
    case "application/atom+xml":
    case "application/vnd.ms-fontobject":
    case "application/x-font-ttf":
    case "application/x-font-opentype":
    case "application/x-font-truetype":
    case "image/svg+xml":
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
    case "font/ttf":
    case "font/eot":
    case "font/otf":
    case "font/opentype":
      estimatedSavings = Math.round(originalSize * 0.5);
      break;
    default:
  }
  return estimatedSavings < IGNORE_THRESHOLD_IN_BYTES ? 0 : estimatedSavings;
}
function finalize3(partialModel) {
  let hasFailure = false;
  if (partialModel.data) {
    hasFailure = !partialModel.data.checklist.usesCompression.value || !partialModel.data.checklist.serverResponseIsFast.value || !partialModel.data.checklist.noRedirects.value;
  }
  return {
    insightKey: "DocumentLatency",
    strings: UIStrings3,
    title: i18nString3(UIStrings3.title),
    description: i18nString3(UIStrings3.description),
    docs: "https://developer.chrome.com/docs/performance/insights/document-latency",
    category: InsightCategory.ALL,
    state: hasFailure ? "fail" : "pass",
    ...partialModel
  };
}
function generateInsight3(data, context) {
  if (!context.navigation) {
    return finalize3({});
  }
  const millisToString = context.options.insightTimeFormatters?.milli ?? i18n5.TimeUtilities.millisToString;
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  if (!documentRequest) {
    return finalize3({ warnings: [InsightWarning.NO_DOCUMENT_REQUEST] });
  }
  const serverResponseTime = getServerResponseTime(documentRequest);
  if (serverResponseTime === null) {
    throw new Error("missing document request timing");
  }
  const serverResponseTooSlow = serverResponseTime > TOO_SLOW_THRESHOLD_MS;
  let overallSavingsMs = 0;
  if (serverResponseTime > TOO_SLOW_THRESHOLD_MS) {
    overallSavingsMs = Math.max(serverResponseTime - TARGET_MS, 0);
  }
  const redirectDuration = Math.round(documentRequest.args.data.syntheticData.redirectionDuration / 1e3);
  overallSavingsMs += redirectDuration;
  const metricSavings = {
    FCP: overallSavingsMs,
    LCP: overallSavingsMs
  };
  const uncompressedResponseBytes = getCompressionSavings(documentRequest);
  const noRedirects = redirectDuration === 0;
  const serverResponseIsFast = !serverResponseTooSlow;
  const usesCompression = uncompressedResponseBytes === 0;
  return finalize3({
    relatedEvents: [documentRequest],
    data: {
      serverResponseTime,
      redirectDuration: Types3.Timing.Milli(redirectDuration),
      uncompressedResponseBytes,
      documentRequest,
      checklist: {
        noRedirects: {
          label: noRedirects ? i18nString3(UIStrings3.passingRedirects) : i18nString3(UIStrings3.failedRedirects, {
            PH1: documentRequest.args.data.redirects.length,
            PH2: millisToString(redirectDuration)
          }),
          value: noRedirects
        },
        serverResponseIsFast: {
          label: serverResponseIsFast ? i18nString3(UIStrings3.passingServerResponseTime, { PH1: millisToString(serverResponseTime) }) : i18nString3(UIStrings3.failedServerResponseTime, { PH1: millisToString(serverResponseTime) }),
          value: serverResponseIsFast
        },
        usesCompression: {
          label: usesCompression ? i18nString3(UIStrings3.passingTextCompression) : i18nString3(UIStrings3.failedTextCompression),
          value: usesCompression
        }
      }
    },
    metricSavings,
    wastedBytes: uncompressedResponseBytes
  });
}
function createOverlays3(model) {
  if (!model.data?.documentRequest) {
    return [];
  }
  const overlays = [];
  const event = model.data.documentRequest;
  const redirectDurationMicro = Helpers4.Timing.milliToMicro(model.data.redirectDuration);
  const sections = [];
  if (model.data.redirectDuration) {
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(event.ts, event.ts + redirectDurationMicro);
    sections.push({ bounds, label: i18nString3(UIStrings3.redirectsLabel), showDuration: true });
    overlays.push({ type: "CANDY_STRIPED_TIME_RANGE", bounds, entry: event });
  }
  if (!model.data.checklist.serverResponseIsFast.value) {
    const serverResponseTimeMicro = Helpers4.Timing.milliToMicro(model.data.serverResponseTime);
    const sendEnd = event.args.data.timing?.sendEnd ?? Types3.Timing.Milli(0);
    const sendEndMicro = Helpers4.Timing.milliToMicro(sendEnd);
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(sendEndMicro, sendEndMicro + serverResponseTimeMicro);
    sections.push({ bounds, label: i18nString3(UIStrings3.serverResponseTimeLabel), showDuration: true });
  }
  if (model.data.uncompressedResponseBytes) {
    const bounds = Helpers4.Timing.traceWindowFromMicroSeconds(event.args.data.syntheticData.downloadStart, event.args.data.syntheticData.downloadStart + event.args.data.syntheticData.download);
    sections.push({ bounds, label: i18nString3(UIStrings3.uncompressedDownload), showDuration: true });
    overlays.push({ type: "CANDY_STRIPED_TIME_RANGE", bounds, entry: event });
  }
  if (sections.length) {
    overlays.push({
      type: "TIMESPAN_BREAKDOWN",
      sections,
      entry: model.data.documentRequest,
      // Always render below because the document request is guaranteed to be
      // the first request in the network track.
      renderLocation: "BELOW_EVENT"
    });
  }
  overlays.push({
    type: "ENTRY_SELECTED",
    entry: model.data.documentRequest
  });
  return overlays;
}

// gen/front_end/models/trace/insights/DOMSize.js
var DOMSize_exports = {};
__export(DOMSize_exports, {
  UIStrings: () => UIStrings4,
  createOverlays: () => createOverlays4,
  generateInsight: () => generateInsight4,
  i18nString: () => i18nString4,
  isDomSizeInsight: () => isDomSizeInsight
});
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as Handlers2 from "./../handlers/handlers.js";
import * as Helpers5 from "./../helpers/helpers.js";
import * as Types4 from "./../types/types.js";
var UIStrings4 = {
  /**
   * @description Title of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated.
   */
  title: "Optimize DOM size",
  /**
   * @description Description of an insight that recommends reducing the size of the DOM tree as a means to improve page responsiveness. "DOM" is an acronym and should not be translated. "layout reflows" are when the browser will recompute the layout of content on the page.
   */
  description: "A large DOM can increase the duration of style calculations and layout reflows, impacting page responsiveness. A large DOM will also increase memory usage. [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/performance/insights/dom-size).",
  /**
   * @description Header for a column containing the names of statistics as opposed to the actual statistic values.
   */
  statistic: "Statistic",
  /**
   * @description Header for a column containing the value of a statistic.
   */
  value: "Value",
  /**
   * @description Header for a column containing the page element related to a statistic.
   */
  element: "Element",
  /**
   * @description Label for a value representing the total number of elements on the page.
   */
  totalElements: "Total elements",
  /**
   * @description Label for a value representing the maximum depth of the Document Object Model (DOM). "DOM" is a acronym and should not be translated.
   */
  maxDOMDepth: "DOM depth",
  /**
   * @description Label for a value representing the maximum number of child elements of any parent element on the page.
   */
  maxChildren: "Most children",
  /**
   * @description Text for a section.
   */
  topUpdatesDescription: "These are the largest layout and style recalculation events. Their performance impact may be reduced by making the DOM simpler.",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  /**
   * @description Message displayed in a table detailing how big a layout (rendering) is.
   * @example {134} PH1
   */
  largeLayout: "Layout ({PH1} objects)",
  /**
   * @description Message displayed in a table detailing how big a style recalculation (rendering) is.
   * @example {134} PH1
   */
  largeStyleRecalc: "Style recalculation ({PH1} elements)"
};
var str_4 = i18n7.i18n.registerUIStrings("models/trace/insights/DOMSize.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var DOM_SIZE_DURATION_THRESHOLD = Helpers5.Timing.milliToMicro(Types4.Timing.Milli(40));
var LAYOUT_OBJECTS_THRESHOLD = 100;
var STYLE_RECALC_ELEMENTS_THRESHOLD = 300;
function finalize4(partialModel) {
  const relatedEvents = [...partialModel.largeLayoutUpdates, ...partialModel.largeStyleRecalcs];
  return {
    insightKey: "DOMSize",
    strings: UIStrings4,
    title: i18nString4(UIStrings4.title),
    description: i18nString4(UIStrings4.description),
    docs: "https://developer.chrome.com/docs/performance/insights/dom-size",
    category: InsightCategory.INP,
    state: relatedEvents.length > 0 ? "informative" : "pass",
    ...partialModel,
    relatedEvents
  };
}
function isDomSizeInsight(model) {
  return model.insightKey === "DOMSize";
}
function generateInsight4(data, context) {
  const isWithinContext = (event) => Helpers5.Timing.eventIsInBounds(event, context.bounds);
  const mainTid = context.navigation?.tid;
  const largeLayoutUpdates = [];
  const largeStyleRecalcs = [];
  const threads = Handlers2.Threads.threadsInRenderer(data.Renderer, data.AuctionWorklets);
  for (const thread of threads) {
    if (thread.type !== "MAIN_THREAD") {
      continue;
    }
    if (mainTid === void 0) {
      if (!thread.processIsOnMainFrame) {
        continue;
      }
    } else if (thread.tid !== mainTid) {
      continue;
    }
    const rendererThread = data.Renderer.processes.get(thread.pid)?.threads.get(thread.tid);
    if (!rendererThread) {
      continue;
    }
    const { entries, layoutEvents, recalcStyleEvents } = rendererThread;
    if (!entries.length) {
      continue;
    }
    const first = entries[0];
    const last = entries[entries.length - 1];
    const timeRange = Helpers5.Timing.traceWindowFromMicroSeconds(first.ts, Types4.Timing.Micro(last.ts + (last.dur ?? 0)));
    if (!Helpers5.Timing.boundsIncludeTimeRange({ timeRange, bounds: context.bounds })) {
      continue;
    }
    for (const event of layoutEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }
      const { dirtyObjects } = event.args.beginData;
      if (dirtyObjects > LAYOUT_OBJECTS_THRESHOLD) {
        largeLayoutUpdates.push(event);
      }
    }
    for (const event of recalcStyleEvents) {
      if (event.dur < DOM_SIZE_DURATION_THRESHOLD || !isWithinContext(event)) {
        continue;
      }
      const { elementCount } = event.args;
      if (elementCount > STYLE_RECALC_ELEMENTS_THRESHOLD) {
        largeStyleRecalcs.push(event);
      }
    }
  }
  const largeUpdates = [
    ...largeLayoutUpdates.map((event) => {
      const duration = event.dur / 1e3;
      const size = event.args.beginData.dirtyObjects;
      const label = i18nString4(UIStrings4.largeLayout, { PH1: size });
      return { label, duration, size, event };
    }),
    ...largeStyleRecalcs.map((event) => {
      const duration = event.dur / 1e3;
      const size = event.args.elementCount;
      const label = i18nString4(UIStrings4.largeStyleRecalc, { PH1: size });
      return { label, duration, size, event };
    })
  ].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const domStatsEvents = data.DOMStats.domStatsByFrameId.get(context.frameId)?.filter(isWithinContext) ?? [];
  let maxDOMStats;
  for (const domStats of domStatsEvents) {
    const navigationPid = context.navigation?.pid;
    if (navigationPid && domStats.pid !== navigationPid) {
      continue;
    }
    if (!maxDOMStats || domStats.args.data.totalElements > maxDOMStats.args.data.totalElements) {
      maxDOMStats = domStats;
    }
  }
  return finalize4({
    largeLayoutUpdates,
    largeStyleRecalcs,
    largeUpdates,
    maxDOMStats
  });
}
function createOverlays4(model) {
  const entries = [...model.largeStyleRecalcs, ...model.largeLayoutUpdates];
  return entries.map((entry) => ({
    type: "ENTRY_OUTLINE",
    entry,
    outlineReason: "ERROR"
  }));
}

// gen/front_end/models/trace/insights/DuplicatedJavaScript.js
var DuplicatedJavaScript_exports = {};
__export(DuplicatedJavaScript_exports, {
  UIStrings: () => UIStrings5,
  createOverlays: () => createOverlays5,
  generateInsight: () => generateInsight5,
  i18nString: () => i18nString5,
  isDuplicatedJavaScriptInsight: () => isDuplicatedJavaScriptInsight
});
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as Extras from "./../extras/extras.js";
import * as Helpers6 from "./../helpers/helpers.js";
var UIStrings5 = {
  /**
   * @description Title of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  title: "Duplicated JavaScript",
  /**
   * @description Description of an insight that identifies multiple copies of the same JavaScript sources, and recommends removing the duplication.
   */
  description: "Remove large, [duplicate JavaScript modules](https://developer.chrome.com/docs/performance/insights/duplicated-javascript) from bundles to reduce unnecessary bytes consumed by network activity.",
  /** Label for a column in a data table; entries will be the locations of JavaScript or CSS code, e.g. the name of a Javascript package or module. */
  columnSource: "Source",
  /** Label for a column in a data table; entries will be the number of wasted bytes due to duplication of a web resource. */
  columnDuplicatedBytes: "Duplicated bytes"
};
var str_5 = i18n9.i18n.registerUIStrings("models/trace/insights/DuplicatedJavaScript.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
function finalize5(partialModel) {
  const requests = partialModel.scriptsWithDuplication.map((script) => script.request).filter((e) => !!e);
  return {
    insightKey: "DuplicatedJavaScript",
    strings: UIStrings5,
    title: i18nString5(UIStrings5.title),
    description: i18nString5(UIStrings5.description),
    docs: "https://developer.chrome.com/docs/performance/insights/duplicated-javascript",
    category: InsightCategory.LCP,
    state: Boolean(partialModel.duplication.values().next().value) ? "fail" : "pass",
    relatedEvents: [...new Set(requests)],
    ...partialModel
  };
}
function isDuplicatedJavaScriptInsight(model) {
  return model.insightKey === "DuplicatedJavaScript";
}
function generateInsight5(data, context) {
  const scripts = data.Scripts.scripts.filter((script) => {
    if (script.frame !== context.frameId) {
      return false;
    }
    if (script.url?.startsWith("chrome-extension://")) {
      return false;
    }
    return Helpers6.Timing.timestampIsInBounds(context.bounds, script.ts);
  });
  const compressionRatios = /* @__PURE__ */ new Map();
  for (const script of scripts) {
    if (script.request) {
      compressionRatios.set(script.request.args.data.requestId, estimateCompressionRatioForScript(script));
    }
  }
  const { duplication, duplicationGroupedByNodeModules } = Extras.ScriptDuplication.computeScriptDuplication({ scripts }, compressionRatios);
  const scriptsWithDuplication = [...duplication.values().flatMap((data2) => data2.duplicates.map((d) => d.script))];
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const { duplicates } of duplication.values()) {
    for (let i = 1; i < duplicates.length; i++) {
      const sourceData = duplicates[i];
      if (!sourceData.script.request) {
        continue;
      }
      const transferSize = sourceData.attributedSize;
      const requestId = sourceData.script.request.args.data.requestId;
      wastedBytesByRequestId.set(requestId, (wastedBytesByRequestId.get(requestId) || 0) + transferSize);
    }
  }
  return finalize5({
    duplication,
    duplicationGroupedByNodeModules,
    scriptsWithDuplication: [...new Set(scriptsWithDuplication)],
    scripts,
    mainDocumentUrl: context.navigation?.args.data?.url ?? data.Meta.mainFrameURL,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: wastedBytesByRequestId.values().reduce((acc, cur) => acc + cur, 0)
  });
}
function createOverlays5(model) {
  return model.scriptsWithDuplication.map((script) => script.request).filter((e) => !!e).map((request) => {
    return {
      type: "ENTRY_OUTLINE",
      entry: request,
      outlineReason: "ERROR"
    };
  });
}

// gen/front_end/models/trace/insights/FontDisplay.js
var FontDisplay_exports = {};
__export(FontDisplay_exports, {
  UIStrings: () => UIStrings6,
  createOverlays: () => createOverlays6,
  generateInsight: () => generateInsight6,
  i18nString: () => i18nString6,
  isFontDisplayInsight: () => isFontDisplayInsight
});
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Helpers7 from "./../helpers/helpers.js";
import * as Types5 from "./../types/types.js";
var UIStrings6 = {
  /** Title of an insight that provides details about the fonts used on the page, and the value of their `font-display` properties. */
  title: "Font display",
  /**
   * @description Text to tell the user about the font-display CSS feature to help improve a the UX of a page.
   */
  description: "Consider setting [`font-display`](https://developer.chrome.com/docs/performance/insights/font-display) to `swap` or `optional` to ensure text is consistently visible. `swap` can be further optimized to mitigate layout shifts with [font metric overrides](https://developer.chrome.com/blog/font-fallbacks).",
  /** Column for a font loaded by the page to render text. */
  fontColumn: "Font",
  /** Column for the amount of time wasted. */
  wastedTimeColumn: "Wasted time"
};
var str_6 = i18n11.i18n.registerUIStrings("models/trace/insights/FontDisplay.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function finalize6(partialModel) {
  return {
    insightKey: "FontDisplay",
    strings: UIStrings6,
    title: i18nString6(UIStrings6.title),
    description: i18nString6(UIStrings6.description),
    docs: "https://developer.chrome.com/docs/performance/insights/font-display",
    category: InsightCategory.INP,
    state: partialModel.fonts.find((font) => font.wastedTime > 0) ? "fail" : "pass",
    ...partialModel
  };
}
function isFontDisplayInsight(model) {
  return model.insightKey === "FontDisplay";
}
function generateInsight6(data, context) {
  const fonts = [];
  for (const remoteFont of data.LayoutShifts.remoteFonts) {
    const event = remoteFont.beginRemoteFontLoadEvent;
    if (!Helpers7.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }
    const requestId = `${event.pid}.${event.args.id}`;
    const request = data.NetworkRequests.byId.get(requestId);
    if (!request) {
      continue;
    }
    if (!/^(block|fallback|auto)$/.test(remoteFont.display)) {
      continue;
    }
    const wastedTimeMicro = Types5.Timing.Micro(request.args.data.syntheticData.finishTime - request.args.data.syntheticData.sendStartTime);
    let wastedTime = Platform2.NumberUtilities.floor(Helpers7.Timing.microToMilli(wastedTimeMicro), 1 / 5);
    if (wastedTime === 0) {
      continue;
    }
    wastedTime = Math.min(wastedTime, 3e3);
    fonts.push({
      name: remoteFont.name,
      request,
      display: remoteFont.display,
      wastedTime
    });
  }
  fonts.sort((a, b) => b.wastedTime - a.wastedTime);
  const savings = Math.max(...fonts.map((f) => f.wastedTime));
  return finalize6({
    relatedEvents: fonts.map((f) => f.request),
    fonts,
    metricSavings: { FCP: savings }
  });
}
function createOverlays6(model) {
  return model.fonts.map((font) => ({
    type: "ENTRY_OUTLINE",
    entry: font.request,
    outlineReason: font.wastedTime ? "ERROR" : "INFO"
  }));
}

// gen/front_end/models/trace/insights/ForcedReflow.js
var ForcedReflow_exports = {};
__export(ForcedReflow_exports, {
  UIStrings: () => UIStrings7,
  createOverlayForEvents: () => createOverlayForEvents,
  createOverlays: () => createOverlays7,
  generateInsight: () => generateInsight7,
  i18nString: () => i18nString7,
  isForcedReflowInsight: () => isForcedReflowInsight
});
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../core/platform/platform.js";
import * as Extras2 from "./../extras/extras.js";
import * as Helpers8 from "./../helpers/helpers.js";
import * as Types6 from "./../types/types.js";
var UIStrings7 = {
  /**
   * @description Title of an insight that provides details about Forced reflow.
   */
  title: "Forced reflow",
  /**
   * @description Text to describe the forced reflow.
   */
  description: "A forced reflow occurs when JavaScript queries geometric properties (such as `offsetWidth`) after styles have been invalidated by a change to the DOM state. This can result in poor performance. Learn more about [forced reflows](https://developer.chrome.com/docs/performance/insights/forced-reflow) and possible mitigations.",
  /**
   * @description Title of a list to provide related stack trace data
   */
  reflowCallFrames: "Call frames that trigger reflow",
  /**
   * @description Text to describe the top time-consuming function call
   */
  topTimeConsumingFunctionCall: "Top function call",
  /**
   * @description Text to describe the total reflow time
   */
  totalReflowTime: "Total reflow time",
  /**
   * @description Text to describe CPU processor tasks that could not be attributed to any specific source code.
   */
  unattributed: "[unattributed]",
  /**
   * @description Text for the name of anonymous functions
   */
  anonymous: "(anonymous)"
};
var str_7 = i18n13.i18n.registerUIStrings("models/trace/insights/ForcedReflow.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
function getCallFrameId(callFrame) {
  return callFrame.scriptId + ":" + callFrame.lineNumber + ":" + callFrame.columnNumber;
}
function getLargestTopLevelFunctionData(forcedReflowEvents, traceParsedData) {
  const entryToNodeMap = traceParsedData.Renderer.entryToNode;
  const dataByTopLevelFunction = /* @__PURE__ */ new Map();
  if (forcedReflowEvents.length === 0) {
    return;
  }
  for (const event of forcedReflowEvents) {
    const traceNode = entryToNodeMap.get(event);
    if (!traceNode) {
      continue;
    }
    let node = traceNode.parent;
    let topLevelFunctionCall;
    let topLevelFunctionCallEvent;
    while (node) {
      const eventData = node.entry;
      if (Types6.Events.isProfileCall(eventData)) {
        topLevelFunctionCall = eventData.callFrame;
        topLevelFunctionCallEvent = eventData;
      } else {
        if (Types6.Events.isFunctionCall(eventData) && eventData.args.data && Types6.Events.objectIsCallFrame(eventData.args.data)) {
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
    const aggregatedData = Platform3.MapUtilities.getWithDefault(dataByTopLevelFunction, aggregatedDataId, () => ({
      topLevelFunctionCall,
      totalReflowTime: 0,
      topLevelFunctionCallEvents: []
    }));
    aggregatedData.totalReflowTime += event.dur ?? 0;
    aggregatedData.topLevelFunctionCallEvents.push(topLevelFunctionCallEvent);
  }
  let topTimeConsumingData = void 0;
  dataByTopLevelFunction.forEach((data) => {
    if (!topTimeConsumingData || data.totalReflowTime > topTimeConsumingData.totalReflowTime) {
      topTimeConsumingData = data;
    }
  });
  return topTimeConsumingData;
}
function finalize7(partialModel) {
  return {
    insightKey: "ForcedReflow",
    strings: UIStrings7,
    title: i18nString7(UIStrings7.title),
    description: i18nString7(UIStrings7.description),
    docs: "https://developer.chrome.com/docs/performance/insights/forced-reflow",
    category: InsightCategory.ALL,
    state: partialModel.aggregatedBottomUpData.length !== 0 ? "fail" : "pass",
    ...partialModel
  };
}
function getBottomCallFrameForEvent(event, traceParsedData) {
  const profileStackTrace = Extras2.StackTraceForEvent.get(event, traceParsedData);
  const eventTopCallFrame = Helpers8.Trace.getStackTraceTopCallFrameInEventPayload(event);
  return profileStackTrace?.callFrames[0] ?? eventTopCallFrame ?? null;
}
function isForcedReflowInsight(model) {
  return model.insightKey === "ForcedReflow";
}
function generateInsight7(traceParsedData, context) {
  const isWithinContext = (event) => {
    const frameId = Helpers8.Trace.frameIDForEvent(event);
    if (frameId !== context.frameId) {
      return false;
    }
    return Helpers8.Timing.eventIsInBounds(event, context.bounds);
  };
  const bottomUpDataMap = /* @__PURE__ */ new Map();
  const events = traceParsedData.Warnings.perWarning.get("FORCED_REFLOW")?.filter(isWithinContext) ?? [];
  for (const event of events) {
    const bottomCallFrame = getBottomCallFrameForEvent(event, traceParsedData);
    const bottomCallId = bottomCallFrame ? getCallFrameId(bottomCallFrame) : "UNATTRIBUTED";
    const bottomUpData = Platform3.MapUtilities.getWithDefault(bottomUpDataMap, bottomCallId, () => ({
      bottomUpData: bottomCallFrame,
      totalTime: 0,
      relatedEvents: []
    }));
    bottomUpData.totalTime += event.dur ?? 0;
    bottomUpData.relatedEvents.push(event);
  }
  const topLevelFunctionCallData = getLargestTopLevelFunctionData(events, traceParsedData);
  return finalize7({
    relatedEvents: events,
    topLevelFunctionCallData,
    aggregatedBottomUpData: [...bottomUpDataMap.values()]
  });
}
function createOverlays7(model) {
  if (!model.topLevelFunctionCallData) {
    return [];
  }
  const allBottomUpEvents = [...model.aggregatedBottomUpData.values().flatMap((data) => data.relatedEvents)];
  return [
    ...createOverlayForEvents(model.topLevelFunctionCallData.topLevelFunctionCallEvents, "INFO"),
    ...createOverlayForEvents(allBottomUpEvents)
  ];
}
function createOverlayForEvents(events, outlineReason = "ERROR") {
  return events.map((e) => ({
    type: "ENTRY_OUTLINE",
    entry: e,
    outlineReason
  }));
}

// gen/front_end/models/trace/insights/ImageDelivery.js
var ImageDelivery_exports = {};
__export(ImageDelivery_exports, {
  ImageOptimizationType: () => ImageOptimizationType,
  UIStrings: () => UIStrings8,
  createOverlayForRequest: () => createOverlayForRequest2,
  createOverlays: () => createOverlays8,
  generateInsight: () => generateInsight8,
  getOptimizationMessage: () => getOptimizationMessage,
  getOptimizationMessageWithBytes: () => getOptimizationMessageWithBytes,
  i18nString: () => i18nString8,
  isImageDeliveryInsight: () => isImageDeliveryInsight
});
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as Helpers9 from "./../helpers/helpers.js";
var UIStrings8 = {
  /**
   * @description Title of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  title: "Improve image delivery",
  /**
   * @description Description of an insight that recommends ways to reduce the size of images downloaded and used on the page.
   */
  description: "Reducing the download time of images can improve the perceived load time of the page and LCP. [Learn more about optimizing image size](https://developer.chrome.com/docs/performance/insights/image-delivery)",
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   */
  useCompression: "Increasing the image compression factor could improve this image's download size.",
  /**
   * @description Message displayed in a chip explaining that an image file size is large for the # of pixels it has and recommends possible adjustments to improve the image size.
   */
  useModernFormat: "Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image's download size.",
  /**
   * @description Message displayed in a chip advising the user to use video formats instead of GIFs because videos generally have smaller file sizes.
   */
  useVideoFormat: "Using video formats instead of GIFs can improve the download size of animated content.",
  /**
   * @description Message displayed in a chip explaining that an image was displayed on the page with dimensions much smaller than the image file dimensions.
   * @example {1000x500} PH1
   * @example {100x50} PH2
   */
  useResponsiveSize: "This image file is larger than it needs to be ({PH1}) for its displayed dimensions ({PH2}). Use responsive images to reduce the image download size.",
  /**
   * @description Column header for a table column containing network requests for images which can improve their file size (e.g. use a different format, increase compression, etc).
   */
  optimizeFile: "Optimize file size",
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: "{PH1} others",
  /**
   * @description Text status indicating that no potential optimizations were found for any image file
   */
  noOptimizableImages: "No optimizable images",
  /**
   * @description Text describing the estimated number of bytes that an image file optimization can save. This text is appended to another block of text describing the image optimization in more detail. "Est" means "Estimated".
   * @example {Use the correct image dimensions to reduce the image file size.} PH1
   * @example {50 MB} PH2
   */
  estimatedSavings: "{PH1} (Est {PH2})"
};
var str_8 = i18n15.i18n.registerUIStrings("models/trace/insights/ImageDelivery.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var TARGET_BYTES_PER_PIXEL_AVIF = 2 * 1 / 12;
var GIF_SIZE_THRESHOLD = 100 * 1024;
var BYTE_SAVINGS_THRESHOLD = 4096;
var BYTE_SAVINGS_THRESHOLD_RESPONSIVE_BREAKPOINTS = 12288;
var ImageOptimizationType;
(function(ImageOptimizationType2) {
  ImageOptimizationType2["ADJUST_COMPRESSION"] = "ADJUST_COMPRESSION";
  ImageOptimizationType2["MODERN_FORMAT_OR_COMPRESSION"] = "MODERN_FORMAT_OR_COMPRESSION";
  ImageOptimizationType2["VIDEO_FORMAT"] = "VIDEO_FORMAT";
  ImageOptimizationType2["RESPONSIVE_SIZE"] = "RESPONSIVE_SIZE";
})(ImageOptimizationType || (ImageOptimizationType = {}));
function isImageDeliveryInsight(model) {
  return model.insightKey === "ImageDelivery";
}
function getOptimizationMessage(optimization) {
  switch (optimization.type) {
    case ImageOptimizationType.ADJUST_COMPRESSION:
      return i18nString8(UIStrings8.useCompression);
    case ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION:
      return i18nString8(UIStrings8.useModernFormat);
    case ImageOptimizationType.VIDEO_FORMAT:
      return i18nString8(UIStrings8.useVideoFormat);
    case ImageOptimizationType.RESPONSIVE_SIZE:
      return i18nString8(UIStrings8.useResponsiveSize, {
        PH1: `${optimization.fileDimensions.width}x${optimization.fileDimensions.height}`,
        PH2: `${optimization.displayDimensions.width}x${optimization.displayDimensions.height}`
      });
  }
}
function getOptimizationMessageWithBytes(optimization) {
  const byteSavingsText = i18n15.ByteUtilities.bytesToString(optimization.byteSavings);
  const optimizationMessage = getOptimizationMessage(optimization);
  return i18nString8(UIStrings8.estimatedSavings, { PH1: optimizationMessage, PH2: byteSavingsText });
}
function finalize8(partialModel) {
  return {
    insightKey: "ImageDelivery",
    strings: UIStrings8,
    title: i18nString8(UIStrings8.title),
    description: i18nString8(UIStrings8.description),
    docs: "https://developer.chrome.com/docs/performance/insights/image-delivery",
    category: InsightCategory.LCP,
    state: partialModel.optimizableImages.length > 0 ? "fail" : "pass",
    ...partialModel,
    relatedEvents: new Map(partialModel.optimizableImages.map((image) => [image.request, image.optimizations.map(getOptimizationMessageWithBytes)]))
  };
}
function estimateGIFPercentSavings(request) {
  return Math.round(29.1 * Math.log10(request.args.data.decodedBodyLength) - 100.7) / 100;
}
function getDisplayedSize(data, paintImage) {
  return data.ImagePainting.paintEventToCorrectedDisplaySize.get(paintImage) ?? {
    width: paintImage.args.data.width,
    height: paintImage.args.data.height
  };
}
function getPixelCounts(data, paintImage) {
  const { width, height } = getDisplayedSize(data, paintImage);
  return {
    filePixels: paintImage.args.data.srcWidth * paintImage.args.data.srcHeight,
    displayedPixels: width * height
  };
}
function generateInsight8(data, context) {
  const isWithinContext = (event) => Helpers9.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const optimizableImages = [];
  for (const request of contextRequests) {
    if (request.args.data.resourceType !== "Image") {
      continue;
    }
    if (request.args.data.mimeType === "image/svg+xml") {
      continue;
    }
    const url = request.args.data.redirects[0]?.url ?? request.args.data.url;
    const imagePaints = data.ImagePainting.paintImageEventForUrl.get(url)?.filter(isWithinContext);
    if (!imagePaints?.length) {
      continue;
    }
    const largestImagePaint = imagePaints.reduce((prev, curr) => {
      const prevPixels = getPixelCounts(data, prev).displayedPixels;
      const currPixels = getPixelCounts(data, curr).displayedPixels;
      return prevPixels > currPixels ? prev : curr;
    });
    const { filePixels: imageFilePixels, displayedPixels: largestImageDisplayPixels } = getPixelCounts(data, largestImagePaint);
    const imageBytes = Math.min(request.args.data.decodedBodyLength, request.args.data.encodedDataLength);
    const bytesPerPixel = imageBytes / imageFilePixels;
    let optimizations = [];
    if (request.args.data.mimeType === "image/gif") {
      if (imageBytes > GIF_SIZE_THRESHOLD) {
        const percentSavings = estimateGIFPercentSavings(request);
        const byteSavings = Math.round(imageBytes * percentSavings);
        optimizations.push({ type: ImageOptimizationType.VIDEO_FORMAT, byteSavings });
      }
    } else if (bytesPerPixel > TARGET_BYTES_PER_PIXEL_AVIF) {
      const idealAvifImageSize = Math.round(TARGET_BYTES_PER_PIXEL_AVIF * imageFilePixels);
      const byteSavings = imageBytes - idealAvifImageSize;
      if (request.args.data.mimeType !== "image/webp" && request.args.data.mimeType !== "image/avif") {
        optimizations.push({ type: ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION, byteSavings });
      } else {
        optimizations.push({ type: ImageOptimizationType.ADJUST_COMPRESSION, byteSavings });
      }
    }
    const imageByteSavingsFromFormat = Math.max(0, ...optimizations.map((o) => o.byteSavings));
    let imageByteSavings = imageByteSavingsFromFormat;
    const wastedPixelRatio = 1 - largestImageDisplayPixels / imageFilePixels;
    if (wastedPixelRatio > 0 && !largestImagePaint.args.data.isCSS) {
      const byteSavings = Math.round(wastedPixelRatio * imageBytes);
      const hadBreakpoints = largestImagePaint.args.data.isPicture || largestImagePaint.args.data.srcsetAttribute;
      if (!hadBreakpoints || byteSavings > BYTE_SAVINGS_THRESHOLD_RESPONSIVE_BREAKPOINTS) {
        imageByteSavings += Math.round(wastedPixelRatio * (imageBytes - imageByteSavingsFromFormat));
        const { width, height } = getDisplayedSize(data, largestImagePaint);
        optimizations.push({
          type: ImageOptimizationType.RESPONSIVE_SIZE,
          byteSavings,
          fileDimensions: {
            width: Math.round(largestImagePaint.args.data.srcWidth),
            height: Math.round(largestImagePaint.args.data.srcHeight)
          },
          displayDimensions: {
            width: Math.round(width),
            height: Math.round(height)
          }
        });
      }
    }
    optimizations = optimizations.filter((optimization) => optimization.byteSavings > BYTE_SAVINGS_THRESHOLD);
    if (optimizations.length > 0) {
      optimizableImages.push({
        request,
        largestImagePaint,
        optimizations,
        byteSavings: imageByteSavings
      });
    }
  }
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const image of optimizableImages) {
    wastedBytesByRequestId.set(image.request.args.data.requestId, image.byteSavings);
  }
  optimizableImages.sort((a, b) => {
    if (b.byteSavings !== a.byteSavings) {
      return b.byteSavings - a.byteSavings;
    }
    return b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength;
  });
  return finalize8({
    optimizableImages,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: optimizableImages.reduce((total, img) => total + img.byteSavings, 0)
  });
}
function createOverlayForRequest2(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays8(model) {
  return model.optimizableImages.map((image) => createOverlayForRequest2(image.request));
}

// gen/front_end/models/trace/insights/INPBreakdown.js
var INPBreakdown_exports = {};
__export(INPBreakdown_exports, {
  UIStrings: () => UIStrings9,
  createOverlays: () => createOverlays9,
  createOverlaysForSubpart: () => createOverlaysForSubpart,
  generateInsight: () => generateInsight9,
  i18nString: () => i18nString9,
  isINPBreakdownInsight: () => isINPBreakdownInsight
});
import * as i18n17 from "./../../../core/i18n/i18n.js";
import * as Handlers3 from "./../handlers/handlers.js";
import * as Helpers10 from "./../helpers/helpers.js";
var UIStrings9 = {
  /**
   * @description Text to tell the user about the longest user interaction.
   */
  description: "Start investigating [how to improve INP](https://developer.chrome.com/docs/performance/insights/inp-breakdown) by looking at the longest subpart.",
  /**
   * @description Title for the performance insight "INP breakdown", which shows a breakdown of INP by subparts / sections.
   */
  title: "INP breakdown",
  /**
   * @description Label used for the subpart/component/stage/section of a larger duration.
   */
  subpart: "Subpart",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  // TODO: these are repeated in InteractionBreakdown. Add a place for common strings?
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: "Input delay",
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: "Processing duration",
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: "Presentation delay",
  /**
   * @description Text status indicating that no user interactions were detected.
   */
  noInteractions: "No interactions detected"
};
var str_9 = i18n17.i18n.registerUIStrings("models/trace/insights/INPBreakdown.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
function isINPBreakdownInsight(insight) {
  return insight.insightKey === "INPBreakdown";
}
function finalize9(partialModel) {
  let state = "pass";
  if (partialModel.longestInteractionEvent) {
    const classification = Handlers3.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(partialModel.longestInteractionEvent.dur);
    if (classification === "good") {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "INPBreakdown",
    strings: UIStrings9,
    title: i18nString9(UIStrings9.title),
    description: i18nString9(UIStrings9.description),
    docs: "https://developer.chrome.com/docs/performance/insights/inp-breakdown",
    category: InsightCategory.INP,
    state,
    ...partialModel
  };
}
function generateInsight9(data, context) {
  const interactionEvents = data.UserInteractions.interactionEventsWithNoNesting.filter((event) => {
    return Helpers10.Timing.eventIsInBounds(event, context.bounds);
  });
  if (!interactionEvents.length) {
    return finalize9({});
  }
  const longestByInteractionId = /* @__PURE__ */ new Map();
  for (const event of interactionEvents) {
    const key = event.interactionId;
    const longest = longestByInteractionId.get(key);
    if (!longest || event.dur > longest.dur) {
      longestByInteractionId.set(key, event);
    }
  }
  const normalizedInteractionEvents = [...longestByInteractionId.values()];
  normalizedInteractionEvents.sort((a, b) => b.dur - a.dur);
  const highPercentileIndex = Math.min(9, Math.floor(normalizedInteractionEvents.length / 50));
  return finalize9({
    relatedEvents: [normalizedInteractionEvents[0]],
    longestInteractionEvent: normalizedInteractionEvents[0],
    highPercentileInteractionEvent: normalizedInteractionEvents[highPercentileIndex]
  });
}
function createOverlaysForSubpart(event, subpartIndex = -1) {
  const p1 = Helpers10.Timing.traceWindowFromMicroSeconds(event.ts, event.ts + event.inputDelay);
  const p2 = Helpers10.Timing.traceWindowFromMicroSeconds(p1.max, p1.max + event.mainThreadHandling);
  const p3 = Helpers10.Timing.traceWindowFromMicroSeconds(p2.max, p2.max + event.presentationDelay);
  let sections = [
    { bounds: p1, label: i18nString9(UIStrings9.inputDelay), showDuration: true },
    { bounds: p2, label: i18nString9(UIStrings9.processingDuration), showDuration: true },
    { bounds: p3, label: i18nString9(UIStrings9.presentationDelay), showDuration: true }
  ];
  if (subpartIndex !== -1) {
    sections = [sections[subpartIndex]];
  }
  return [
    {
      type: "TIMESPAN_BREAKDOWN",
      sections,
      renderLocation: "BELOW_EVENT",
      entry: event
    }
  ];
}
function createOverlays9(model) {
  const event = model.longestInteractionEvent;
  if (!event) {
    return [];
  }
  return createOverlaysForSubpart(event);
}

// gen/front_end/models/trace/insights/LCPBreakdown.js
var LCPBreakdown_exports = {};
__export(LCPBreakdown_exports, {
  UIStrings: () => UIStrings10,
  createOverlays: () => createOverlays10,
  generateInsight: () => generateInsight10,
  i18nString: () => i18nString10,
  isLCPBreakdownInsight: () => isLCPBreakdownInsight
});
import * as i18n19 from "./../../../core/i18n/i18n.js";
import * as Handlers4 from "./../handlers/handlers.js";
import * as Helpers11 from "./../helpers/helpers.js";
import * as Types7 from "./../types/types.js";
var UIStrings10 = {
  /**
   * @description Title of an insight that provides details about the LCP metric, broken down by parts.
   */
  title: "LCP breakdown",
  /**
   * @description Description of a DevTools insight that presents a breakdown for the LCP metric by subparts.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: "Each [subpart has specific improvement strategies](https://developer.chrome.com/docs/performance/insights/lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.",
  /**
   * @description Time to first byte title for the Largest Contentful Paint's subparts timespan breakdown.
   */
  timeToFirstByte: "Time to first byte",
  /**
   * @description Resource load delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDelay: "Resource load delay",
  /**
   * @description Resource load duration title for the Largest Contentful Paint subparts timespan breakdown.
   */
  resourceLoadDuration: "Resource load duration",
  /**
   * @description Element render delay title for the Largest Contentful Paint subparts timespan breakdown.
   */
  elementRenderDelay: "Element render delay",
  /**
   * @description Label used for the subpart (section) of a larger duration.
   */
  subpart: "Subpart",
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration.
   */
  duration: "Duration",
  /**
   * @description Label used for the duration a single subpart (section) takes up of a larger duration. The value will be the 75th percentile of aggregate data. "Field" means that the data was collected from real users in the field as opposed to the developers local environment. "Field" is synonymous with "Real user data".
   */
  fieldDuration: "Field p75",
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: "No LCP detected"
};
var str_10 = i18n19.i18n.registerUIStrings("models/trace/insights/LCPBreakdown.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
function isLCPBreakdownInsight(model) {
  return model.insightKey === "LCPBreakdown";
}
function anyValuesNaN(...values) {
  return values.some((v) => Number.isNaN(v));
}
function determineSubparts(nav, docRequest, lcpEvent, lcpRequest) {
  const firstDocByteTs = calculateDocFirstByteTs(docRequest);
  if (firstDocByteTs === null) {
    return null;
  }
  const ttfb = Helpers11.Timing.traceWindowFromMicroSeconds(nav.ts, firstDocByteTs);
  ttfb.label = i18nString10(UIStrings10.timeToFirstByte);
  let renderDelay = Helpers11.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpEvent.ts);
  renderDelay.label = i18nString10(UIStrings10.elementRenderDelay);
  if (!lcpRequest) {
    if (anyValuesNaN(ttfb.range, renderDelay.range)) {
      return null;
    }
    return { ttfb, renderDelay };
  }
  const lcpStartTs = lcpRequest.ts;
  const lcpReqEndTs = lcpRequest.args.data.syntheticData.finishTime;
  const loadDelay = Helpers11.Timing.traceWindowFromMicroSeconds(ttfb.max, lcpStartTs);
  const loadDuration = Helpers11.Timing.traceWindowFromMicroSeconds(lcpStartTs, lcpReqEndTs);
  renderDelay = Helpers11.Timing.traceWindowFromMicroSeconds(lcpReqEndTs, lcpEvent.ts);
  loadDelay.label = i18nString10(UIStrings10.resourceLoadDelay);
  loadDuration.label = i18nString10(UIStrings10.resourceLoadDuration);
  renderDelay.label = i18nString10(UIStrings10.elementRenderDelay);
  if (anyValuesNaN(ttfb.range, loadDelay.range, loadDuration.range, renderDelay.range)) {
    return null;
  }
  return {
    ttfb,
    loadDelay,
    loadDuration,
    renderDelay
  };
}
function finalize10(partialModel) {
  const relatedEvents = [];
  if (partialModel.lcpEvent) {
    relatedEvents.push(partialModel.lcpEvent);
  }
  if (partialModel.lcpRequest) {
    relatedEvents.push(partialModel.lcpRequest);
  }
  let state = "pass";
  if (partialModel.lcpMs !== void 0) {
    const classification = Handlers4.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(Helpers11.Timing.milliToMicro(partialModel.lcpMs));
    if (classification === "good") {
      state = "informative";
    } else {
      state = "fail";
    }
  }
  return {
    insightKey: "LCPBreakdown",
    strings: UIStrings10,
    title: i18nString10(UIStrings10.title),
    description: i18nString10(UIStrings10.description),
    docs: "https://developer.chrome.com/docs/performance/insights/lcp-breakdown",
    category: InsightCategory.LCP,
    state,
    ...partialModel,
    relatedEvents
  };
}
function generateInsight10(data, context) {
  if (!context.navigation) {
    return finalize10({});
  }
  const networkRequests = data.NetworkRequests;
  const frameMetrics = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error("no frame metrics");
  }
  const navMetrics = frameMetrics.get(context.navigation);
  if (!navMetrics) {
    throw new Error("no navigation metrics");
  }
  const metricScore = navMetrics.get(
    "LCP"
    /* Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP */
  );
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types7.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
    return finalize10({ warnings: [InsightWarning.NO_LCP] });
  }
  const lcpMs = Helpers11.Timing.microToMilli(metricScore.timing);
  const lcpTs = metricScore.event?.ts ? Helpers11.Timing.microToMilli(metricScore.event?.ts) : void 0;
  const lcpRequest = data.LargestImagePaint.lcpRequestByNavigationId.get(context.navigationId);
  const docRequest = networkRequests.byId.get(context.navigationId);
  if (!docRequest) {
    return finalize10({ lcpMs, lcpTs, lcpEvent, lcpRequest, warnings: [InsightWarning.NO_DOCUMENT_REQUEST] });
  }
  return finalize10({
    lcpMs,
    lcpTs,
    lcpEvent,
    lcpRequest,
    subparts: determineSubparts(context.navigation, docRequest, lcpEvent, lcpRequest) ?? void 0
  });
}
function createOverlays10(model) {
  if (!model.subparts || !model.lcpTs) {
    return [];
  }
  const overlays = [
    {
      type: "TIMESPAN_BREAKDOWN",
      sections: Object.values(model.subparts).map((subpart) => ({ bounds: subpart, label: subpart.label, showDuration: true }))
    }
  ];
  if (model.lcpRequest) {
    overlays.push({ type: "ENTRY_OUTLINE", entry: model.lcpRequest, outlineReason: "INFO" });
  }
  return overlays;
}

// gen/front_end/models/trace/insights/LCPDiscovery.js
var LCPDiscovery_exports = {};
__export(LCPDiscovery_exports, {
  UIStrings: () => UIStrings11,
  createOverlays: () => createOverlays11,
  generateInsight: () => generateInsight11,
  getImageData: () => getImageData,
  i18nString: () => i18nString11,
  isLCPDiscoveryInsight: () => isLCPDiscoveryInsight
});
import * as i18n21 from "./../../../core/i18n/i18n.js";
import * as Handlers5 from "./../handlers/handlers.js";
import * as Helpers12 from "./../helpers/helpers.js";
import * as Types8 from "./../types/types.js";
var UIStrings11 = {
  /**
   * @description Title of an insight that provides details about the LCP metric, and the network requests necessary to load it. Details how the LCP request was discoverable - in other words, the path necessary to load it (ex: network requests, JavaScript)
   */
  title: "LCP request discovery",
  /**
   * @description Description of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  description: "[Optimize LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery) by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading",
  /**
   * @description Text to tell the user how long after the earliest discovery time their LCP element loaded.
   * @example {401ms} PH1
   */
  lcpLoadDelay: "LCP image loaded {PH1} after earliest start point.",
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" is applied to the LCP request.
   */
  fetchPriorityApplied: "fetchpriority=high applied",
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" should be applied to the LCP request.
   */
  fetchPriorityShouldBeApplied: "fetchpriority=high should be applied",
  /**
   * @description Text to tell the user that the LCP request is discoverable in the initial document.
   */
  requestDiscoverable: "Request is discoverable in initial document",
  /**
   * @description Text to tell the user that the LCP request does not have the lazy load property applied.
   */
  lazyLoadNotApplied: "lazy load not applied",
  /**
   * @description Text status indicating that the the Largest Contentful Paint (LCP) metric timing was not found. "LCP" is an acronym and should not be translated.
   */
  noLcp: "No LCP detected",
  /**
   * @description Text status indicating that the Largest Contentful Paint (LCP) metric was text rather than an image. "LCP" is an acronym and should not be translated.
   */
  noLcpResource: "No LCP resource detected because the LCP is not an image"
};
var str_11 = i18n21.i18n.registerUIStrings("models/trace/insights/LCPDiscovery.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
function isLCPDiscoveryInsight(model) {
  return model.insightKey === "LCPDiscovery";
}
function finalize11(partialModel) {
  const relatedEvents = partialModel.lcpEvent && partialModel.lcpRequest ? (
    // TODO: add entire request initiator chain?
    [partialModel.lcpEvent, partialModel.lcpRequest]
  ) : [];
  return {
    insightKey: "LCPDiscovery",
    strings: UIStrings11,
    title: i18nString11(UIStrings11.title),
    description: i18nString11(UIStrings11.description),
    docs: "https://developer.chrome.com/docs/performance/insights/lcp-discovery",
    category: InsightCategory.LCP,
    state: partialModel.lcpRequest && partialModel.checklist && (!partialModel.checklist.eagerlyLoaded.value || !partialModel.checklist.requestDiscoverable.value || !partialModel.checklist.priorityHinted.value) ? "fail" : "pass",
    ...partialModel,
    relatedEvents
  };
}
function generateInsight11(data, context) {
  if (!context.navigation) {
    return finalize11({});
  }
  const networkRequests = data.NetworkRequests;
  const frameMetrics = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId);
  if (!frameMetrics) {
    throw new Error("no frame metrics");
  }
  const navMetrics = frameMetrics.get(context.navigation);
  if (!navMetrics) {
    throw new Error("no navigation metrics");
  }
  const metricScore = navMetrics.get(
    "LCP"
    /* Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP */
  );
  const lcpEvent = metricScore?.event;
  if (!lcpEvent || !Types8.Events.isAnyLargestContentfulPaintCandidate(lcpEvent)) {
    return finalize11({ warnings: [InsightWarning.NO_LCP] });
  }
  const docRequest = networkRequests.byId.get(context.navigationId);
  if (!docRequest) {
    return finalize11({ warnings: [InsightWarning.NO_DOCUMENT_REQUEST] });
  }
  const lcpRequest = data.LargestImagePaint.lcpRequestByNavigationId.get(context.navigationId);
  if (!lcpRequest) {
    return finalize11({ lcpEvent });
  }
  const initiatorUrl = lcpRequest.args.data.initiator?.url;
  const initiatedByMainDoc = lcpRequest?.args.data.initiator?.type === "parser" && docRequest.args.data.url === initiatorUrl;
  const imgPreloadedOrFoundInHTML = lcpRequest?.args.data.isLinkPreload || initiatedByMainDoc;
  const imageLoadingAttr = lcpEvent.args.data?.loadingAttr;
  const imageFetchPriorityHint = lcpRequest?.args.data.fetchPriorityHint;
  const earliestDiscoveryTime = calculateDocFirstByteTs(docRequest);
  const priorityHintFound = imageFetchPriorityHint === "high";
  return finalize11({
    lcpEvent,
    lcpRequest,
    earliestDiscoveryTimeTs: earliestDiscoveryTime ? Types8.Timing.Micro(earliestDiscoveryTime) : void 0,
    checklist: {
      priorityHinted: {
        label: priorityHintFound ? i18nString11(UIStrings11.fetchPriorityApplied) : i18nString11(UIStrings11.fetchPriorityShouldBeApplied),
        value: priorityHintFound
      },
      requestDiscoverable: { label: i18nString11(UIStrings11.requestDiscoverable), value: imgPreloadedOrFoundInHTML },
      eagerlyLoaded: { label: i18nString11(UIStrings11.lazyLoadNotApplied), value: imageLoadingAttr !== "lazy" }
    }
  });
}
function getImageData(model) {
  if (!model.lcpRequest || !model.checklist) {
    return null;
  }
  const shouldIncreasePriorityHint = !model.checklist.priorityHinted.value;
  const shouldPreloadImage = !model.checklist.requestDiscoverable.value;
  const shouldRemoveLazyLoading = !model.checklist.eagerlyLoaded.value;
  const imageLCP = shouldIncreasePriorityHint !== void 0 && shouldPreloadImage !== void 0 && shouldRemoveLazyLoading !== void 0;
  if (!imageLCP) {
    return null;
  }
  const data = {
    checklist: model.checklist,
    request: model.lcpRequest,
    discoveryDelay: null,
    estimatedSavings: model.metricSavings?.LCP ?? null
  };
  if (model.earliestDiscoveryTimeTs && model.lcpRequest) {
    const discoveryDelay = model.lcpRequest.ts - model.earliestDiscoveryTimeTs;
    data.discoveryDelay = Types8.Timing.Micro(discoveryDelay);
  }
  return data;
}
function createOverlays11(model) {
  const imageResults = getImageData(model);
  if (!imageResults?.discoveryDelay) {
    return [];
  }
  const delay = Helpers12.Timing.traceWindowFromMicroSeconds(Types8.Timing.Micro(imageResults.request.ts - imageResults.discoveryDelay), imageResults.request.ts);
  return [
    {
      type: "ENTRY_OUTLINE",
      entry: imageResults.request,
      outlineReason: "ERROR"
    },
    {
      type: "CANDY_STRIPED_TIME_RANGE",
      bounds: delay,
      entry: imageResults.request
    },
    {
      type: "TIMESPAN_BREAKDOWN",
      sections: [{
        bounds: delay,
        // This is overridden in the component.
        label: `${imageResults.discoveryDelay} microseconds`,
        showDuration: false
      }],
      entry: imageResults.request,
      renderLocation: "ABOVE_EVENT"
    }
  ];
}

// gen/front_end/models/trace/insights/LegacyJavaScript.js
var LegacyJavaScript_exports = {};
__export(LegacyJavaScript_exports, {
  UIStrings: () => UIStrings12,
  createOverlays: () => createOverlays12,
  generateInsight: () => generateInsight12,
  i18nString: () => i18nString12,
  isLegacyJavaScript: () => isLegacyJavaScript
});
import * as i18n23 from "./../../../core/i18n/i18n.js";
import * as LegacyJavaScriptLib from "./../../../third_party/legacy-javascript/legacy-javascript.js";
import * as Helpers13 from "./../helpers/helpers.js";
var { detectLegacyJavaScript } = LegacyJavaScriptLib.LegacyJavaScript;
var UIStrings12 = {
  /**
   * @description Title of an insight that identifies polyfills for modern JavaScript features, and recommends their removal.
   */
  title: "Legacy JavaScript",
  /**
   * @description Description of an insight that identifies polyfills for modern JavaScript features, and recommends their removal.
   */
  description: "Polyfills and transforms enable older browsers to use new JavaScript features. However, many aren't necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/articles/baseline-and-polyfills) features, unless you know you must support older browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://developer.chrome.com/docs/performance/insights/legacy-javascript)",
  /** Label for a column in a data table; entries will be the individual JavaScript scripts. */
  columnScript: "Script",
  /** Label for a column in a data table; entries will be the number of wasted bytes (aka the estimated savings in terms of bytes). */
  columnWastedBytes: "Wasted bytes"
};
var str_12 = i18n23.i18n.registerUIStrings("models/trace/insights/LegacyJavaScript.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var BYTE_THRESHOLD = 5e3;
function finalize12(partialModel) {
  const requests = [...partialModel.legacyJavaScriptResults.keys()].map((script) => script.request).filter((e) => !!e);
  return {
    insightKey: "LegacyJavaScript",
    strings: UIStrings12,
    title: i18nString12(UIStrings12.title),
    description: i18nString12(UIStrings12.description),
    docs: "https://developer.chrome.com/docs/performance/insights/legacy-javascript",
    category: InsightCategory.ALL,
    state: requests.length ? "fail" : "pass",
    relatedEvents: [...new Set(requests)],
    ...partialModel
  };
}
function isLegacyJavaScript(model) {
  return model.insightKey === "LegacyJavaScript";
}
function generateInsight12(data, context) {
  const scripts = data.Scripts.scripts.filter((script) => {
    if (script.frame !== context.frameId) {
      return false;
    }
    if (script.url?.startsWith("chrome-extension://")) {
      return false;
    }
    return Helpers13.Timing.timestampIsInBounds(context.bounds, script.ts) || script.request && Helpers13.Timing.eventIsInBounds(script.request, context.bounds);
  });
  const legacyJavaScriptResults = /* @__PURE__ */ new Map();
  const wastedBytesByRequestId = /* @__PURE__ */ new Map();
  for (const script of scripts) {
    if (!script.content || script.content.length < BYTE_THRESHOLD) {
      continue;
    }
    const result = detectLegacyJavaScript(script.content, script.sourceMap);
    if (result.estimatedByteSavings < BYTE_THRESHOLD) {
      continue;
    }
    const compressionRatio = estimateCompressionRatioForScript(script);
    const transferSize = Math.round(result.estimatedByteSavings * compressionRatio);
    result.estimatedByteSavings = transferSize;
    legacyJavaScriptResults.set(script, result);
    if (script.request) {
      const requestId = script.request.args.data.requestId;
      wastedBytesByRequestId.set(requestId, transferSize);
    }
  }
  const sorted = new Map([...legacyJavaScriptResults].sort((a, b) => b[1].estimatedByteSavings - a[1].estimatedByteSavings));
  return finalize12({
    legacyJavaScriptResults: sorted,
    metricSavings: metricSavingsForWastedBytes(wastedBytesByRequestId, context),
    wastedBytes: wastedBytesByRequestId.values().reduce((acc, cur) => acc + cur, 0)
  });
}
function createOverlays12(model) {
  return [...model.legacyJavaScriptResults.keys()].map((script) => script.request).filter((e) => !!e).map((request) => {
    return {
      type: "ENTRY_OUTLINE",
      entry: request,
      outlineReason: "ERROR"
    };
  });
}

// gen/front_end/models/trace/insights/ModernHTTP.js
var ModernHTTP_exports = {};
__export(ModernHTTP_exports, {
  UIStrings: () => UIStrings13,
  createOverlayForRequest: () => createOverlayForRequest3,
  createOverlays: () => createOverlays13,
  determineHttp1Requests: () => determineHttp1Requests,
  generateInsight: () => generateInsight13,
  i18nString: () => i18nString13,
  isModernHTTPInsight: () => isModernHTTPInsight
});
import * as i18n25 from "./../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../core/platform/platform.js";
import * as Handlers6 from "./../handlers/handlers.js";
import * as Helpers15 from "./../helpers/helpers.js";
var UIStrings13 = {
  /**
   * @description Title of an insight that recommends using HTTP/2 over HTTP/1.1 because of the performance benefits. "HTTP" should not be translated.
   */
  title: "Modern HTTP",
  /**
   * @description Description of an insight that recommends recommends using HTTP/2 over HTTP/1.1 because of the performance benefits. "HTTP" should not be translated.
   */
  description: "HTTP/2 and HTTP/3 offer many benefits over HTTP/1.1, such as multiplexing. [Learn more about using modern HTTP](https://developer.chrome.com/docs/performance/insights/modern-http).",
  /**
   * @description Column header for a table where each cell represents a network request.
   */
  request: "Request",
  /**
   * @description Column header for a table where each cell represents the protocol of a network request.
   */
  protocol: "Protocol",
  /**
   * @description Text explaining that there were not requests that were slowed down by using HTTP/1.1. "HTTP/1.1" should not be translated.
   */
  noOldProtocolRequests: "No requests used HTTP/1.1, or its current use of HTTP/1.1 does not present a significant optimization opportunity. HTTP/1.1 requests are only flagged if six or more static assets originate from the same origin, and they are not served from a local development environment or a third-party source."
};
var str_13 = i18n25.i18n.registerUIStrings("models/trace/insights/ModernHTTP.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
function isModernHTTPInsight(model) {
  return model.insightKey === "ModernHTTP";
}
function isMultiplexableStaticAsset(request, entityMappings, firstPartyEntity) {
  if (!Helpers15.Network.STATIC_RESOURCE_TYPES.has(request.args.data.resourceType)) {
    return false;
  }
  if (request.args.data.decodedBodyLength < 100) {
    const entity = entityMappings.entityByEvent.get(request);
    if (entity) {
      if (firstPartyEntity?.name === entity.name) {
        return true;
      }
      if (!entity.isUnrecognized) {
        return false;
      }
    }
  }
  return true;
}
function determineHttp1Requests(requests, entityMappings, firstPartyEntity) {
  const http1Requests = [];
  const groupedByOrigin = /* @__PURE__ */ new Map();
  for (const record of requests) {
    const url = new URL(record.args.data.url);
    if (!isMultiplexableStaticAsset(record, entityMappings, firstPartyEntity)) {
      continue;
    }
    if (Helpers15.Network.isSyntheticNetworkRequestLocalhost(record)) {
      continue;
    }
    const originRequests = Platform4.MapUtilities.getWithDefault(groupedByOrigin, url.origin, () => []);
    originRequests.push(record);
  }
  const seenURLs = /* @__PURE__ */ new Set();
  for (const request of requests) {
    if (seenURLs.has(request.args.data.url)) {
      continue;
    }
    if (request.args.data.fromServiceWorker) {
      continue;
    }
    const isOldHttp = /HTTP\/[01][.\d]?/i.test(request.args.data.protocol);
    if (!isOldHttp) {
      continue;
    }
    const url = new URL(request.args.data.url);
    const group = groupedByOrigin.get(url.origin) || [];
    if (group.length < 6) {
      continue;
    }
    seenURLs.add(request.args.data.url);
    http1Requests.push(request);
  }
  return http1Requests;
}
function computeWasteWithGraph(urlsToChange, graph, simulator) {
  const simulationBefore = simulator.simulate(graph);
  const originalProtocols = /* @__PURE__ */ new Map();
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    if (!urlsToChange.has(node.request.url)) {
      return;
    }
    originalProtocols.set(node.request.requestId, node.request.protocol);
    node.request.protocol = "h2";
  });
  const simulationAfter = simulator.simulate(graph);
  graph.traverse((node) => {
    if (node.type !== "network") {
      return;
    }
    const originalProtocol = originalProtocols.get(node.request.requestId);
    if (originalProtocol === void 0) {
      return;
    }
    node.request.protocol = originalProtocol;
  });
  const savings = simulationBefore.timeInMs - simulationAfter.timeInMs;
  return Platform4.NumberUtilities.floor(savings, 1 / 10);
}
function computeMetricSavings(http1Requests, context) {
  if (!context.navigation || !context.lantern) {
    return;
  }
  const urlsToChange = new Set(http1Requests.map((r) => r.args.data.url));
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.optimisticGraph;
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.optimisticGraph;
  return {
    FCP: computeWasteWithGraph(urlsToChange, fcpGraph, context.lantern.simulator),
    LCP: computeWasteWithGraph(urlsToChange, lcpGraph, context.lantern.simulator)
  };
}
function finalize13(partialModel) {
  return {
    insightKey: "ModernHTTP",
    strings: UIStrings13,
    title: i18nString13(UIStrings13.title),
    description: i18nString13(UIStrings13.description),
    docs: "https://developer.chrome.com/docs/performance/insights/modern-http",
    category: InsightCategory.LCP,
    state: partialModel.http1Requests.length > 0 ? "fail" : "pass",
    ...partialModel,
    relatedEvents: partialModel.http1Requests
  };
}
function generateInsight13(data, context) {
  const isWithinContext = (event) => Helpers15.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const entityMappings = data.NetworkRequests.entityMappings;
  const firstPartyUrl = context.navigation?.args.data?.documentLoaderURL ?? data.Meta.mainFrameURL;
  const firstPartyEntity = Handlers6.Helpers.getEntityForUrl(firstPartyUrl, entityMappings);
  const http1Requests = determineHttp1Requests(contextRequests, entityMappings, firstPartyEntity ?? null);
  return finalize13({
    http1Requests,
    metricSavings: computeMetricSavings(http1Requests, context)
  });
}
function createOverlayForRequest3(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays13(model) {
  return model.http1Requests.map((req) => createOverlayForRequest3(req)) ?? [];
}

// gen/front_end/models/trace/insights/NetworkDependencyTree.js
var NetworkDependencyTree_exports = {};
__export(NetworkDependencyTree_exports, {
  TOO_MANY_PRECONNECTS_THRESHOLD: () => TOO_MANY_PRECONNECTS_THRESHOLD,
  UIStrings: () => UIStrings14,
  createOverlays: () => createOverlays14,
  generateInsight: () => generateInsight14,
  generatePreconnectCandidates: () => generatePreconnectCandidates,
  generatePreconnectedOrigins: () => generatePreconnectedOrigins,
  handleLinkResponseHeader: () => handleLinkResponseHeader,
  i18nString: () => i18nString14,
  isNetworkDependencyTreeInsight: () => isNetworkDependencyTreeInsight
});
import * as Common from "./../../../core/common/common.js";
import * as i18n27 from "./../../../core/i18n/i18n.js";
import * as Platform5 from "./../../../core/platform/platform.js";
import * as Helpers16 from "./../helpers/helpers.js";
import * as Types9 from "./../types/types.js";
var UIStrings14 = {
  /**
   * @description Title of an insight that recommends avoiding chaining critical requests.
   */
  title: "Network dependency tree",
  /**
   * @description Description of an insight that recommends avoiding chaining critical requests.
   */
  description: "[Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.",
  /**
   * @description Description of the warning that recommends avoiding chaining critical requests.
   */
  warningDescription: "Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.",
  /**
   * @description Text status indicating that there isn't long chaining critical network requests.
   */
  noNetworkDependencyTree: "No rendering tasks impacted by network dependencies",
  /**
   * @description Text for the maximum critical path latency. This refers to the longest chain of network requests that
   * the browser must download before it can render the page.
   */
  maxCriticalPathLatency: "Max critical path latency:",
  /** Label for a column in a data table; entries will be the network request */
  columnRequest: "Request",
  /** Label for a column in a data table; entries will be the time from main document till current network request. */
  columnTime: "Time",
  /**
   * @description Title of the table of the detected preconnect origins.
   */
  preconnectOriginsTableTitle: "Preconnected origins",
  /**
   * @description Description of the table of the detected preconnect origins.
   */
  preconnectOriginsTableDescription: "[preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints help the browser establish a connection earlier in the page load, saving time when the first request for that origin is made. The following are the origins that the page preconnected to.",
  /**
   * @description Text status indicating that there isn't any preconnected origins.
   */
  noPreconnectOrigins: "no origins were preconnected",
  /**
   * @description A warning message that is shown when found more than 4 preconnected links. "preconnect" should not be translated.
   */
  tooManyPreconnectLinksWarning: "More than 4 `preconnect` connections were found. These should be used sparingly and only to the most important origins.",
  /**
   * @description A warning message that is shown when the user added preconnect for some unnecessary origins. "preconnect" should not be translated.
   */
  unusedWarning: "Unused preconnect. Only use `preconnect` for origins that the page is likely to request.",
  /**
   * @description A warning message that is shown when the user forget to set the `crossorigin` HTML attribute, or setting it to an incorrect value, on the link is a common mistake when adding preconnect links. "preconnect" should not be translated.
   * */
  crossoriginWarning: "Unused preconnect. Check that the `crossorigin` attribute is used properly.",
  /**
   * @description Label for a column in a data table; entries will be the source of the origin.
   */
  columnSource: "Source",
  /**
   * @description Text status indicating that there isn't preconnect candidates.
   */
  noPreconnectCandidates: "No additional origins are good candidates for preconnecting",
  /**
   * @description Title of the table that shows the origins that the page should have preconnected to.
   */
  estSavingTableTitle: "Preconnect candidates",
  /**
   * @description Description of the table that recommends preconnecting to the origins to save time. "preconnect" should not be translated.
   */
  estSavingTableDescription: "Add [preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints to your most important origins, but try to use no more than 4.",
  /**
   * @description Label for a column in a data table; entries will be the origin of a web resource
   */
  columnOrigin: "Origin",
  /**
   * @description Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions.
   */
  columnWastedMs: "Est LCP savings"
};
var str_14 = i18n27.i18n.registerUIStrings("models/trace/insights/NetworkDependencyTree.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var nonCriticalResourceTypes = /* @__PURE__ */ new Set([
  "Image",
  "XHR",
  "Fetch",
  "EventSource"
]);
var PRECONNECT_SOCKET_MAX_IDLE_IN_MS = Types9.Timing.Milli(15e3);
var IGNORE_THRESHOLD_IN_MILLISECONDS = Types9.Timing.Milli(50);
var TOO_MANY_PRECONNECTS_THRESHOLD = 4;
function finalize14(partialModel) {
  return {
    insightKey: "NetworkDependencyTree",
    strings: UIStrings14,
    title: i18nString14(UIStrings14.title),
    description: i18nString14(UIStrings14.description),
    docs: "https://developer.chrome.com/docs/performance/insights/network-dependency-tree",
    category: InsightCategory.LCP,
    state: partialModel.fail ? "fail" : "pass",
    ...partialModel
  };
}
function isCritical(request, context) {
  if (request.args.data.requestId === context.navigationId) {
    return true;
  }
  if (request.args.data.isLinkPreload) {
    return false;
  }
  const isIframe = request.args.data.resourceType === "Document" && request.args.data.frame !== context.frameId;
  if (nonCriticalResourceTypes.has(request.args.data.resourceType) || isIframe || // Treat any missed images, primarily favicons, as non-critical resources
  request.args.data.mimeType.startsWith("image/")) {
    return false;
  }
  const initiatorUrl = request.args.data.initiator?.url || Helpers16.Trace.getStackTraceTopCallFrameInEventPayload(request)?.url;
  if (!initiatorUrl) {
    return false;
  }
  const isBlocking = Helpers16.Network.isSyntheticNetworkRequestEventRenderBlocking(request);
  const isHighPriority = Helpers16.Network.isSyntheticNetworkRequestHighPriority(request);
  return isHighPriority || isBlocking;
}
function findMaxLeafNode(node) {
  if (node.children.length === 0) {
    return node;
  }
  let maxLeaf = node.children[0];
  for (const child of node.children) {
    const leaf = findMaxLeafNode(child);
    if (leaf.timeFromInitialRequest > maxLeaf.timeFromInitialRequest) {
      maxLeaf = leaf;
    }
  }
  return maxLeaf;
}
function sortRecursively(nodes) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      node.children.sort((nodeA, nodeB) => {
        const leafA = findMaxLeafNode(nodeA);
        const leafB = findMaxLeafNode(nodeB);
        return leafB.timeFromInitialRequest - leafA.timeFromInitialRequest;
      });
      sortRecursively(node.children);
    }
  }
}
function generateNetworkDependencyTree(context) {
  const rootNodes = [];
  const relatedEvents = /* @__PURE__ */ new Map();
  let maxTime = Types9.Timing.Micro(0);
  let fail = false;
  let longestChain = [];
  function addChain(path) {
    if (path.length === 0) {
      return;
    }
    if (path.length >= 2) {
      fail = true;
    }
    const initialRequest = path[0];
    const lastRequest = path[path.length - 1];
    const totalChainTime = Types9.Timing.Micro(lastRequest.ts + lastRequest.dur - initialRequest.ts);
    if (totalChainTime > maxTime) {
      maxTime = totalChainTime;
      longestChain = path;
    }
    let currentNodes = rootNodes;
    for (let depth = 0; depth < path.length; ++depth) {
      const request = path[depth];
      let found = currentNodes.find((node) => node.request === request);
      if (!found) {
        const timeFromInitialRequest = Types9.Timing.Micro(request.ts + request.dur - initialRequest.ts);
        found = {
          request,
          timeFromInitialRequest,
          children: [],
          relatedRequests: /* @__PURE__ */ new Set()
        };
        currentNodes.push(found);
      }
      path.forEach((request2) => found?.relatedRequests.add(request2));
      relatedEvents.set(request, depth < 2 ? [] : [i18nString14(UIStrings14.warningDescription)]);
      currentNodes = found.children;
    }
  }
  const seenNodes = /* @__PURE__ */ new Set();
  function getNextNodes(node) {
    return node.getDependents().filter((n) => n.getDependencies().every((d) => seenNodes.has(d)));
  }
  context.lantern?.graph.traverse((node, traversalPath) => {
    seenNodes.add(node);
    if (node.type !== "network") {
      return;
    }
    const networkNode = node;
    if (!isCritical(networkNode.rawRequest, context)) {
      return;
    }
    const networkPath = traversalPath.filter((node2) => node2.type === "network").reverse().map((node2) => node2.rawRequest);
    if (networkPath.some((request) => !isCritical(request, context))) {
      return;
    }
    if (node.isNonNetworkProtocol) {
      return;
    }
    addChain(networkPath);
  }, getNextNodes);
  if (longestChain.length > 0) {
    let currentNodes = rootNodes;
    for (const request of longestChain) {
      const found = currentNodes.find((node) => node.request === request);
      if (found) {
        found.isLongest = true;
        currentNodes = found.children;
      } else {
        console.error("Some request in the longest chain is not found");
      }
    }
  }
  sortRecursively(rootNodes);
  return {
    rootNodes,
    maxTime,
    fail,
    relatedEvents
  };
}
function getSecurityOrigin(url) {
  const parsedURL = new Common.ParsedURL.ParsedURL(url);
  return parsedURL.securityOrigin();
}
function handleLinkResponseHeaderPart(trimmedPart) {
  if (!trimmedPart) {
    return null;
  }
  const urlStart = trimmedPart.indexOf("<");
  const urlEnd = trimmedPart.indexOf(">");
  if (urlStart !== 0 || urlEnd === -1 || urlEnd <= urlStart) {
    return null;
  }
  const url = trimmedPart.substring(urlStart + 1, urlEnd).trim();
  if (!url) {
    return null;
  }
  const paramsString = trimmedPart.substring(urlEnd + 1).trim();
  if (paramsString) {
    const params = paramsString.split(";");
    for (const param of params) {
      const trimmedParam = param.trim();
      if (!trimmedParam) {
        continue;
      }
      const eqIndex = trimmedParam.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }
      const paramName = trimmedParam.substring(0, eqIndex).trim().toLowerCase();
      let paramValue = trimmedParam.substring(eqIndex + 1).trim();
      if (paramValue.startsWith('"') && paramValue.endsWith('"')) {
        paramValue = paramValue.substring(1, paramValue.length - 1);
      }
      if (paramName === "rel" && paramValue === "preconnect") {
        return { url, headerText: trimmedPart };
      }
    }
  }
  return null;
}
function handleLinkResponseHeader(linkHeaderValue) {
  if (!linkHeaderValue) {
    return [];
  }
  const preconnectedOrigins = [];
  for (let i = 0; i < linkHeaderValue.length; ) {
    const firstUrlEnd = linkHeaderValue.indexOf(">", i);
    if (firstUrlEnd === -1) {
      break;
    }
    const commaIndex = linkHeaderValue.indexOf(",", firstUrlEnd);
    const partEnd = commaIndex !== -1 ? commaIndex : linkHeaderValue.length;
    const part = linkHeaderValue.substring(i, partEnd);
    if (partEnd + 1 <= i) {
      console.warn("unexpected infinite loop, bailing");
      break;
    }
    i = partEnd + 1;
    const preconnectedOrigin = handleLinkResponseHeaderPart(part.trim());
    if (preconnectedOrigin) {
      preconnectedOrigins.push(preconnectedOrigin);
    }
  }
  return preconnectedOrigins;
}
function generatePreconnectedOrigins(data, context, contextRequests, preconnectCandidates) {
  const preconnectedOrigins = [];
  for (const event of data.NetworkRequests.linkPreconnectEvents) {
    preconnectedOrigins.push({
      node_id: event.args.data.node_id,
      frame: event.args.data.frame,
      url: event.args.data.url,
      // For each origin the page wanted to preconnect to:
      // - if we found no network requests to that origin at all then we issue a unused warning
      unused: !contextRequests.some((request) => getSecurityOrigin(event.args.data.url) === getSecurityOrigin(request.args.data.url)),
      // - else (we found network requests to the same origin) and if some of those network requests is too slow (if
      //   they are preconnect candidates), then we issue a unused warning with crossorigin hint
      crossorigin: preconnectCandidates.some((candidate) => candidate.origin === getSecurityOrigin(event.args.data.url)),
      source: "DOM"
    });
  }
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  documentRequest?.args.data.responseHeaders?.forEach((header) => {
    if (header.name.toLowerCase() === "link") {
      const preconnectedOriginsFromResponseHeader = handleLinkResponseHeader(header.value);
      preconnectedOriginsFromResponseHeader?.forEach((origin) => preconnectedOrigins.push({
        url: origin.url,
        headerText: origin.headerText,
        request: documentRequest,
        // For each origin the page wanted to preconnect to:
        // - if we found no network requests to that origin at all then we issue a unused warning
        unused: !contextRequests.some((request) => getSecurityOrigin(origin.url) === getSecurityOrigin(request.args.data.url)),
        // - else (we found network requests to the same origin) and if some of those network requests is too slow (if
        //   they are preconnect candidates), then we issue a unused warning with crossorigin hint
        crossorigin: preconnectCandidates.some((candidate) => candidate.origin === getSecurityOrigin(origin.url)),
        source: "ResponseHeader"
      }));
    }
  });
  return preconnectedOrigins;
}
function hasValidTiming(request) {
  return !!request.args.data.timing && request.args.data.timing.connectEnd >= 0 && request.args.data.timing.connectStart >= 0;
}
function hasAlreadyConnectedToOrigin(request) {
  const { timing } = request.args.data;
  if (!timing) {
    return false;
  }
  if (timing.dnsStart === -1 && timing.dnsEnd === -1 && timing.connectStart === -1 && timing.connectEnd === -1) {
    return true;
  }
  if (timing.dnsEnd - timing.dnsStart === 0 && timing.connectEnd - timing.connectStart === 0) {
    return true;
  }
  return false;
}
function socketStartTimeIsBelowThreshold(request, mainResource) {
  const timeSinceMainEnd = Math.max(0, request.args.data.syntheticData.sendStartTime - mainResource.args.data.syntheticData.finishTime);
  return Helpers16.Timing.microToMilli(timeSinceMainEnd) < PRECONNECT_SOCKET_MAX_IDLE_IN_MS;
}
function candidateRequestsByOrigin(data, mainResource, contextRequests, lcpGraphURLs) {
  const origins = /* @__PURE__ */ new Map();
  contextRequests.forEach((request) => {
    if (!hasValidTiming(request)) {
      return;
    }
    if (data.NetworkRequests.incompleteInitiator.get(request) === mainResource) {
      return;
    }
    const url = new URL(request.args.data.url);
    if (url.origin === "null") {
      return;
    }
    const mainOrigin = new URL(mainResource.args.data.url).origin;
    if (url.origin === mainOrigin) {
      return;
    }
    if (!lcpGraphURLs.has(request.args.data.url)) {
      return;
    }
    if (hasAlreadyConnectedToOrigin(request)) {
      return;
    }
    if (!socketStartTimeIsBelowThreshold(request, mainResource)) {
      return;
    }
    const originRequests = Platform5.MapUtilities.getWithDefault(origins, url.origin, () => []);
    originRequests.push(request);
  });
  return origins;
}
function generatePreconnectCandidates(data, context, contextRequests) {
  if (!context.lantern) {
    return [];
  }
  const documentRequest = data.NetworkRequests.byId.get(context.navigationId);
  if (!documentRequest) {
    return [];
  }
  const { rtt, additionalRttByOrigin } = context.lantern.simulator.getOptions();
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.pessimisticGraph;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.pessimisticGraph;
  const lcpGraphURLs = /* @__PURE__ */ new Set();
  lcpGraph.traverse((node) => {
    if (node.type === "network") {
      lcpGraphURLs.add(node.request.url);
    }
  });
  const fcpGraphURLs = /* @__PURE__ */ new Set();
  fcpGraph.traverse((node) => {
    if (node.type === "network") {
      fcpGraphURLs.add(node.request.url);
    }
  });
  const groupedOrigins = candidateRequestsByOrigin(data, documentRequest, contextRequests, lcpGraphURLs);
  let maxWastedLcp = Types9.Timing.Milli(0);
  let maxWastedFcp = Types9.Timing.Milli(0);
  let preconnectCandidates = [];
  groupedOrigins.forEach((requests) => {
    const firstRequestOfOrigin = requests[0];
    if (!firstRequestOfOrigin.args.data.timing) {
      return;
    }
    const firstRequestOfOriginParsedURL = new Common.ParsedURL.ParsedURL(firstRequestOfOrigin.args.data.url);
    const origin = firstRequestOfOriginParsedURL.securityOrigin();
    const additionalRtt = additionalRttByOrigin.get(origin) ?? 0;
    let connectionTime = Types9.Timing.Milli(rtt + additionalRtt);
    if (firstRequestOfOriginParsedURL.scheme === "https") {
      connectionTime = Types9.Timing.Milli(connectionTime * 2);
    }
    const timeBetweenMainResourceAndDnsStart = Types9.Timing.Micro(firstRequestOfOrigin.args.data.syntheticData.sendStartTime - documentRequest.args.data.syntheticData.finishTime + Helpers16.Timing.milliToMicro(firstRequestOfOrigin.args.data.timing.dnsStart));
    const wastedMs = Math.min(connectionTime, Helpers16.Timing.microToMilli(timeBetweenMainResourceAndDnsStart));
    if (wastedMs < IGNORE_THRESHOLD_IN_MILLISECONDS) {
      return;
    }
    maxWastedLcp = Math.max(wastedMs, maxWastedLcp);
    if (fcpGraphURLs.has(firstRequestOfOrigin.args.data.url)) {
      maxWastedFcp = Math.max(wastedMs, maxWastedFcp);
    }
    preconnectCandidates.push({
      origin,
      wastedMs
    });
  });
  preconnectCandidates = preconnectCandidates.sort((a, b) => b.wastedMs - a.wastedMs);
  return preconnectCandidates.slice(0, TOO_MANY_PRECONNECTS_THRESHOLD);
}
function isNetworkDependencyTreeInsight(model) {
  return model.insightKey === "NetworkDependencyTree";
}
function generateInsight14(data, context) {
  if (!context.navigation) {
    return finalize14({
      rootNodes: [],
      maxTime: 0,
      fail: false,
      preconnectedOrigins: [],
      preconnectCandidates: []
    });
  }
  const { rootNodes, maxTime, fail, relatedEvents } = generateNetworkDependencyTree(context);
  const isWithinContext = (event) => Helpers16.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = data.NetworkRequests.byTime.filter(isWithinContext);
  const preconnectCandidates = generatePreconnectCandidates(data, context, contextRequests);
  const preconnectedOrigins = generatePreconnectedOrigins(data, context, contextRequests, preconnectCandidates);
  return finalize14({
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
    preconnectedOrigins,
    preconnectCandidates
  });
}
function createOverlays14(model) {
  function walk(nodes, overlays2) {
    nodes.forEach((node) => {
      overlays2.push({
        type: "ENTRY_OUTLINE",
        entry: node.request,
        outlineReason: "ERROR"
      });
      walk(node.children, overlays2);
    });
  }
  const overlays = [];
  walk(model.rootNodes, overlays);
  return overlays;
}

// gen/front_end/models/trace/insights/RenderBlocking.js
var RenderBlocking_exports = {};
__export(RenderBlocking_exports, {
  UIStrings: () => UIStrings15,
  createOverlayForRequest: () => createOverlayForRequest4,
  createOverlays: () => createOverlays15,
  generateInsight: () => generateInsight15,
  i18nString: () => i18nString15,
  isRenderBlockingInsight: () => isRenderBlockingInsight
});
import * as i18n29 from "./../../../core/i18n/i18n.js";
import * as Handlers7 from "./../handlers/handlers.js";
import * as Helpers17 from "./../helpers/helpers.js";
var UIStrings15 = {
  /**
   * @description Title of an insight that provides the user with the list of network requests that blocked and therefore slowed down the page rendering and becoming visible to the user.
   */
  title: "Render blocking requests",
  /**
   * @description Text to describe that there are requests blocking rendering, which may affect LCP.
   */
  description: "Requests are blocking the page's initial render, which may delay LCP. [Deferring or inlining](https://developer.chrome.com/docs/performance/insights/render-blocking) can move these network requests out of the critical path.",
  /**
   * @description Label to describe a network request (that happens to be render-blocking).
   */
  renderBlockingRequest: "Request",
  /**
   * @description Label used for a time duration.
   */
  duration: "Duration",
  /**
   * @description Text status indicating that no requests blocked the initial render of a navigation
   */
  noRenderBlocking: "No render blocking requests for this navigation"
};
var str_15 = i18n29.i18n.registerUIStrings("models/trace/insights/RenderBlocking.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
function isRenderBlockingInsight(insight) {
  return insight.insightKey === "RenderBlocking";
}
var MINIMUM_WASTED_MS = 50;
function getNodesAndTimingByRequestId(nodeTimings) {
  const requestIdToNode = /* @__PURE__ */ new Map();
  for (const [node, nodeTiming] of nodeTimings) {
    if (node.type !== "network") {
      continue;
    }
    requestIdToNode.set(node.request.requestId, { node, nodeTiming });
  }
  return requestIdToNode;
}
function estimateSavingsWithGraphs2(deferredIds, lanternContext) {
  const simulator = lanternContext.simulator;
  const fcpGraph = lanternContext.metrics.firstContentfulPaint.optimisticGraph;
  const { nodeTimings } = lanternContext.simulator.simulate(fcpGraph);
  const adjustedNodeTimings = new Map(nodeTimings);
  const totalChildNetworkBytes = 0;
  const minimalFCPGraph = fcpGraph.cloneWithRelationships((node) => {
    const canDeferRequest = deferredIds.has(node.id);
    return !canDeferRequest;
  });
  if (minimalFCPGraph.type !== "network") {
    throw new Error("minimalFCPGraph not a NetworkNode");
  }
  const estimateBeforeInline = Math.max(...Array.from(Array.from(adjustedNodeTimings).map((timing) => timing[1].endTime)));
  const originalTransferSize = minimalFCPGraph.request.transferSize;
  const safeTransferSize = originalTransferSize || 0;
  minimalFCPGraph.request.transferSize = safeTransferSize + totalChildNetworkBytes;
  const estimateAfterInline = simulator.simulate(minimalFCPGraph).timeInMs;
  minimalFCPGraph.request.transferSize = originalTransferSize;
  return Math.round(Math.max(estimateBeforeInline - estimateAfterInline, 0));
}
function hasImageLCP(data, context) {
  return data.LargestImagePaint.lcpRequestByNavigationId.has(context.navigationId);
}
function computeSavings(data, context, renderBlockingRequests) {
  if (!context.lantern) {
    return;
  }
  const nodesAndTimingsByRequestId = getNodesAndTimingByRequestId(context.lantern.metrics.firstContentfulPaint.optimisticEstimate.nodeTimings);
  const metricSavings = { FCP: 0, LCP: 0 };
  const requestIdToWastedMs = /* @__PURE__ */ new Map();
  const deferredNodeIds = /* @__PURE__ */ new Set();
  for (const request of renderBlockingRequests) {
    const nodeAndTiming = nodesAndTimingsByRequestId.get(request.args.data.requestId);
    if (!nodeAndTiming) {
      continue;
    }
    const { node, nodeTiming } = nodeAndTiming;
    node.traverse((node2) => deferredNodeIds.add(node2.id));
    const wastedMs = Math.round(nodeTiming.duration);
    if (wastedMs < MINIMUM_WASTED_MS) {
      continue;
    }
    requestIdToWastedMs.set(node.id, wastedMs);
  }
  if (requestIdToWastedMs.size) {
    metricSavings.FCP = estimateSavingsWithGraphs2(deferredNodeIds, context.lantern);
    if (!hasImageLCP(data, context)) {
      metricSavings.LCP = metricSavings.FCP;
    }
  }
  return { metricSavings, requestIdToWastedMs };
}
function finalize15(partialModel) {
  return {
    insightKey: "RenderBlocking",
    strings: UIStrings15,
    title: i18nString15(UIStrings15.title),
    description: i18nString15(UIStrings15.description),
    docs: "https://developer.chrome.com/docs/performance/insights/render-blocking",
    category: InsightCategory.LCP,
    state: partialModel.renderBlockingRequests.length > 0 ? "fail" : "pass",
    ...partialModel
  };
}
function generateInsight15(data, context) {
  if (!context.navigation) {
    return finalize15({
      renderBlockingRequests: []
    });
  }
  const firstPaintTs = data.PageLoadMetrics.metricScoresByFrameId.get(context.frameId)?.get(context.navigation)?.get(
    "FP"
    /* Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP */
  )?.event?.ts;
  if (!firstPaintTs) {
    return finalize15({
      renderBlockingRequests: [],
      warnings: [InsightWarning.NO_FP]
    });
  }
  let renderBlockingRequests = [];
  for (const req of data.NetworkRequests.byTime) {
    if (req.args.data.frame !== context.frameId) {
      continue;
    }
    if (!Helpers17.Network.isSyntheticNetworkRequestEventRenderBlocking(req)) {
      continue;
    }
    if (req.args.data.syntheticData.finishTime > firstPaintTs) {
      continue;
    }
    if (req.args.data.renderBlocking === "in_body_parser_blocking") {
      const priority = req.args.data.priority;
      const isScript = req.args.data.resourceType === "Script";
      const isBlockingScript = isScript && priority === "High";
      if (priority !== "VeryHigh" && !isBlockingScript) {
        continue;
      }
    }
    const navigation = Helpers17.Trace.getNavigationForTraceEvent(req, context.frameId, data.Meta.navigationsByFrameId);
    if (navigation === context.navigation) {
      renderBlockingRequests.push(req);
    }
  }
  const savings = computeSavings(data, context, renderBlockingRequests);
  renderBlockingRequests = renderBlockingRequests.sort((a, b) => {
    return b.dur - a.dur;
  });
  return finalize15({
    relatedEvents: renderBlockingRequests,
    renderBlockingRequests,
    ...savings
  });
}
function createOverlayForRequest4(request) {
  return {
    type: "ENTRY_OUTLINE",
    entry: request,
    outlineReason: "ERROR"
  };
}
function createOverlays15(model) {
  return model.renderBlockingRequests.map((request) => createOverlayForRequest4(request));
}

// gen/front_end/models/trace/insights/SlowCSSSelector.js
var SlowCSSSelector_exports = {};
__export(SlowCSSSelector_exports, {
  UIStrings: () => UIStrings16,
  createOverlays: () => createOverlays16,
  generateInsight: () => generateInsight16,
  i18nString: () => i18nString16,
  isSlowCSSSelectorInsight: () => isSlowCSSSelectorInsight
});
import * as i18n31 from "./../../../core/i18n/i18n.js";
import * as Helpers18 from "./../helpers/helpers.js";

// gen/front_end/models/trace/types/TraceEvents.js
function isSoftNavigationStart(event) {
  return event.name === "SoftNavigationStart";
}
var markerTypeGuards = [
  isMarkDOMContent,
  isMarkLoad,
  isFirstPaint,
  isFirstContentfulPaint,
  isAnyLargestContentfulPaintCandidate,
  isNavigationStart,
  isSoftNavigationStart
];
var pageLoadEventTypeGuards = [
  ...markerTypeGuards,
  isInteractiveTime
];
var SelectorTimingsKey;
(function(SelectorTimingsKey2) {
  SelectorTimingsKey2["Elapsed"] = "elapsed (us)";
  SelectorTimingsKey2["RejectPercentage"] = "reject_percentage";
  SelectorTimingsKey2["FastRejectCount"] = "fast_reject_count";
  SelectorTimingsKey2["MatchAttempts"] = "match_attempts";
  SelectorTimingsKey2["MatchCount"] = "match_count";
  SelectorTimingsKey2["Selector"] = "selector";
  SelectorTimingsKey2["StyleSheetId"] = "style_sheet_id";
  SelectorTimingsKey2["InvalidationCount"] = "invalidation_count";
})(SelectorTimingsKey || (SelectorTimingsKey = {}));
function isFirstContentfulPaint(event) {
  return event.name === "firstContentfulPaint";
}
function isAnyLargestContentfulPaintCandidate(event) {
  return event.name === "largestContentfulPaint::Candidate" || event.name === "largestContentfulPaint::CandidateForSoftNavigation";
}
function isMarkLoad(event) {
  return event.name === "MarkLoad";
}
function isFirstPaint(event) {
  return event.name === "firstPaint";
}
function isMarkDOMContent(event) {
  return event.name === "MarkDOMContent";
}
function isInteractiveTime(event) {
  return event.name === "InteractiveTime";
}
function isNavigationStart(event) {
  return event.name === "navigationStart" && event.args?.data?.documentLoaderURL !== "";
}

// gen/front_end/models/trace/insights/SlowCSSSelector.js
import * as Types10 from "./../types/types.js";
var UIStrings16 = {
  /**
   * @description Title of an insight that provides details about slow CSS selectors.
   */
  title: "CSS Selector costs",
  /**
   * @description Text to describe how to improve the performance of CSS selectors.
   */
  description: "If Recalculate Style costs remain high, selector optimization can reduce them. [Optimize the selectors](https://developer.chrome.com/docs/performance/insights/slow-css-selector) with both high elapsed time and high slow-path %. Simpler selectors, fewer selectors, a smaller DOM, and a shallower DOM will all reduce matching costs.",
  /**
   * @description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: "Match attempts",
  /**
   * @description Column name for count of elements that matched a style rule
   */
  matchCount: "Match count",
  /**
   * @description Column name for elapsed time spent computing a style rule
   */
  elapsed: "Elapsed time",
  /**
   * @description Column name for the selectors that took the longest amount of time/effort.
   */
  topSelectors: "Top selectors",
  /**
   * @description Column name for a total sum.
   */
  total: "Total",
  /**
   * @description Text status indicating that no CSS selector data was found.
   */
  enableSelectorData: "No CSS selector data was found. CSS selector stats need to be enabled in the performance panel settings.",
  /**
   * @description top CSS selector when ranked by elapsed time in ms
   */
  topSelectorElapsedTime: "Top selector elapsed time",
  /**
   * @description top CSS selector when ranked by match attempt
   */
  topSelectorMatchAttempt: "Top selector match attempt"
};
var str_16 = i18n31.i18n.registerUIStrings("models/trace/insights/SlowCSSSelector.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var slowCSSSelectorThreshold = 500;
function aggregateSelectorStats(data, context) {
  const selectorMap = /* @__PURE__ */ new Map();
  for (const [event, value] of data.dataForRecalcStyleEvent) {
    if (event.args.beginData?.frame !== context.frameId) {
      continue;
    }
    if (!Helpers18.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }
    for (const timing of value.timings) {
      const key = timing[SelectorTimingsKey.Selector] + "_" + timing[SelectorTimingsKey.StyleSheetId];
      const findTiming = selectorMap.get(key);
      if (findTiming !== void 0) {
        findTiming[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
        findTiming[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
        findTiming[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
        findTiming[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
      } else {
        selectorMap.set(key, { ...timing });
      }
    }
  }
  return [...selectorMap.values()];
}
function finalize16(partialModel) {
  return {
    insightKey: "SlowCSSSelector",
    strings: UIStrings16,
    title: i18nString16(UIStrings16.title),
    description: i18nString16(UIStrings16.description),
    docs: "https://developer.chrome.com/docs/performance/insights/slow-css-selector",
    category: InsightCategory.ALL,
    state: partialModel.topSelectorElapsedMs && partialModel.topSelectorMatchAttempts ? "informative" : "pass",
    ...partialModel
  };
}
function isSlowCSSSelectorInsight(model) {
  return model.insightKey === "SlowCSSSelector";
}
function generateInsight16(data, context) {
  const selectorStatsData = data.SelectorStats;
  if (!selectorStatsData) {
    throw new Error("no selector stats data");
  }
  const selectorTimings = aggregateSelectorStats(selectorStatsData, context);
  let totalElapsedUs = 0;
  let totalMatchAttempts = 0;
  let totalMatchCount = 0;
  selectorTimings.map((timing) => {
    totalElapsedUs += timing[SelectorTimingsKey.Elapsed];
    totalMatchAttempts += timing[SelectorTimingsKey.MatchAttempts];
    totalMatchCount += timing[SelectorTimingsKey.MatchCount];
  });
  let topSelectorElapsedMs = null;
  let topSelectorMatchAttempts = null;
  if (selectorTimings.length > 0) {
    topSelectorElapsedMs = selectorTimings.reduce((a, b) => {
      return a[SelectorTimingsKey.Elapsed] > b[SelectorTimingsKey.Elapsed] ? a : b;
    });
    if (topSelectorElapsedMs && topSelectorElapsedMs[SelectorTimingsKey.Elapsed] < slowCSSSelectorThreshold) {
      topSelectorElapsedMs = null;
    }
    topSelectorMatchAttempts = selectorTimings.reduce((a, b) => {
      return a[SelectorTimingsKey.MatchAttempts] > b[SelectorTimingsKey.MatchAttempts] ? a : b;
    });
  }
  return finalize16({
    // TODO: should we identify RecalcStyle events as linked to this insight?
    relatedEvents: [],
    totalElapsedMs: Types10.Timing.Milli(totalElapsedUs / 1e3),
    totalMatchAttempts,
    totalMatchCount,
    topSelectorElapsedMs,
    topSelectorMatchAttempts
  });
}
function createOverlays16(_) {
  return [];
}

// gen/front_end/models/trace/insights/ThirdParties.js
var ThirdParties_exports = {};
__export(ThirdParties_exports, {
  UIStrings: () => UIStrings17,
  createOverlays: () => createOverlays17,
  createOverlaysForSummary: () => createOverlaysForSummary,
  generateInsight: () => generateInsight17,
  i18nString: () => i18nString17,
  isThirdPartyInsight: () => isThirdPartyInsight
});
import * as i18n33 from "./../../../core/i18n/i18n.js";
import * as ThirdPartyWeb from "./../../../third_party/third-party-web/third-party-web.js";
import * as Extras3 from "./../extras/extras.js";
import * as Handlers8 from "./../handlers/handlers.js";
var UIStrings17 = {
  /** Title of an insight that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). */
  title: "3rd parties",
  /**
   * @description Description of a DevTools insight that identifies the code on the page that the user doesn't control.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description: "3rd party code can significantly impact load performance. [Reduce and defer loading of 3rd party code](https://developer.chrome.com/docs/performance/insights/third-parties) to prioritize your page's content.",
  /** Label for a table column that displays the name of a third-party provider. */
  columnThirdParty: "3rd party",
  /** Label for a column in a data table; entries will be the download size of a web resource in kilobytes. */
  columnTransferSize: "Transfer size",
  /** Label for a table column that displays how much time each row spent running on the main thread, entries will be the number of milliseconds spent. */
  columnMainThreadTime: "Main thread time",
  /**
   * @description Text block indicating that no third party content was detected on the page
   */
  noThirdParties: "No third parties found"
};
var str_17 = i18n33.i18n.registerUIStrings("models/trace/insights/ThirdParties.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
function getRelatedEvents(summaries, firstPartyEntity) {
  const relatedEvents = [];
  for (const summary of summaries) {
    if (summary.entity !== firstPartyEntity) {
      relatedEvents.push(...summary.relatedEvents);
    }
  }
  return relatedEvents;
}
function finalize17(partialModel) {
  return {
    insightKey: "ThirdParties",
    strings: UIStrings17,
    title: i18nString17(UIStrings17.title),
    description: i18nString17(UIStrings17.description),
    docs: "https://developer.chrome.com/docs/performance/insights/third-parties",
    category: InsightCategory.ALL,
    state: partialModel.entitySummaries.find((summary) => summary.entity !== partialModel.firstPartyEntity) ? "informative" : "pass",
    ...partialModel
  };
}
function isThirdPartyInsight(model) {
  return model.insightKey === "ThirdParties";
}
function generateInsight17(data, context) {
  const entitySummaries = Extras3.ThirdParties.summarizeByThirdParty(data, context.bounds);
  const firstPartyUrl = context.navigation?.args.data?.documentLoaderURL ?? data.Meta.mainFrameURL;
  const firstPartyEntity = ThirdPartyWeb.ThirdPartyWeb.getEntity(firstPartyUrl) || Handlers8.Helpers.makeUpEntity(data.Renderer.entityMappings.createdEntityCache, firstPartyUrl);
  return finalize17({
    relatedEvents: getRelatedEvents(entitySummaries, firstPartyEntity),
    firstPartyEntity,
    entitySummaries
  });
}
function createOverlaysForSummary(summary) {
  const overlays = [];
  for (const event of summary.relatedEvents) {
    if (event.dur === void 0 || event.dur < 1e3) {
      continue;
    }
    const overlay = {
      type: "ENTRY_OUTLINE",
      entry: event,
      outlineReason: "INFO"
    };
    overlays.push(overlay);
  }
  return overlays;
}
function createOverlays17(model) {
  const overlays = [];
  const summaries = model.entitySummaries ?? [];
  for (const summary of summaries) {
    if (summary.entity === model.firstPartyEntity) {
      continue;
    }
    const summaryOverlays = createOverlaysForSummary(summary);
    overlays.push(...summaryOverlays);
  }
  return overlays;
}

// gen/front_end/models/trace/insights/Viewport.js
var Viewport_exports = {};
__export(Viewport_exports, {
  UIStrings: () => UIStrings18,
  createOverlays: () => createOverlays18,
  generateInsight: () => generateInsight18,
  i18nString: () => i18nString18,
  isViewportInsight: () => isViewportInsight
});
import * as i18n35 from "./../../../core/i18n/i18n.js";
import * as Platform6 from "./../../../core/platform/platform.js";
import * as Handlers9 from "./../handlers/handlers.js";
import * as Helpers20 from "./../helpers/helpers.js";
import * as Types11 from "./../types/types.js";
var UIStrings18 = {
  /** Title of an insight that provides details about if the page's viewport is optimized for mobile viewing. */
  title: "Optimize viewport for mobile",
  /**
   * @description Text to tell the user how a viewport meta element can improve performance. \xa0 is a non-breaking space
   */
  description: "Tap interactions may be [delayed by up to 300\xA0ms](https://developer.chrome.com/docs/performance/insights/viewport) if the viewport is not optimized for mobile.",
  /**
   * @description Text for a label describing the portion of an interaction event that was delayed due to a bad mobile viewport.
   */
  mobileTapDelayLabel: "Mobile tap delay"
};
var str_18 = i18n35.i18n.registerUIStrings("models/trace/insights/Viewport.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
function finalize18(partialModel) {
  return {
    insightKey: "Viewport",
    strings: UIStrings18,
    title: i18nString18(UIStrings18.title),
    description: i18nString18(UIStrings18.description),
    docs: "https://developer.chrome.com/docs/performance/insights/viewport",
    category: InsightCategory.INP,
    state: partialModel.mobileOptimized === false ? "fail" : "pass",
    ...partialModel
  };
}
function isViewportInsight(model) {
  return model.insightKey === "Viewport";
}
function generateInsight18(data, context) {
  const viewportEvent = data.UserInteractions.parseMetaViewportEvents.find((event) => {
    if (event.args.data.frame !== context.frameId) {
      return false;
    }
    return Helpers20.Timing.eventIsInBounds(event, context.bounds);
  });
  const compositorEvents = data.UserInteractions.beginCommitCompositorFrameEvents.filter((event) => {
    if (event.args.frame !== context.frameId) {
      return false;
    }
    if (viewportEvent && event.ts < viewportEvent.ts) {
      return false;
    }
    return Helpers20.Timing.eventIsInBounds(event, context.bounds);
  });
  if (!compositorEvents.length) {
    return finalize18({
      mobileOptimized: null,
      warnings: [InsightWarning.NO_LAYOUT]
    });
  }
  for (const event of compositorEvents) {
    if (!event.args.is_mobile_optimized) {
      const longPointerInteractions = [...data.UserInteractions.interactionsOverThreshold.values()].filter((interaction) => Handlers9.ModelHandlers.UserInteractions.categoryOfInteraction(interaction) === "POINTER" && interaction.inputDelay >= 5e4);
      const inputDelay = Math.max(0, ...longPointerInteractions.map((interaction) => interaction.inputDelay)) / 1e3;
      const inpMetricSavings = Platform6.NumberUtilities.clamp(inputDelay, 0, 300);
      return finalize18({
        mobileOptimized: false,
        viewportEvent,
        longPointerInteractions,
        metricSavings: { INP: inpMetricSavings }
      });
    }
  }
  return finalize18({
    mobileOptimized: true,
    viewportEvent
  });
}
function createOverlays18(model) {
  if (!model.longPointerInteractions) {
    return [];
  }
  return model.longPointerInteractions.map((interaction) => {
    const delay = Math.min(interaction.inputDelay, 300 * 1e3);
    const bounds = Helpers20.Timing.traceWindowFromMicroSeconds(Types11.Timing.Micro(interaction.ts), Types11.Timing.Micro(interaction.ts + delay));
    return {
      type: "TIMESPAN_BREAKDOWN",
      entry: interaction,
      sections: [{ bounds, label: i18nString18(UIStrings18.mobileTapDelayLabel), showDuration: true }],
      renderLocation: "ABOVE_EVENT"
    };
  });
}
export {
  Cache_exports as Cache,
  Common_exports as Common,
  Models_exports as Models,
  ModernHTTP_exports as ModernHTTP,
  Statistics_exports as Statistics,
  types_exports as Types
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=insights.js.map
