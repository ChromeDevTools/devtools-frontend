// gen/front_end/models/trace/lantern/core/LanternError.js
var LanternError = class extends Error {
};

// gen/front_end/models/trace/lantern/core/NetworkAnalyzer.js
var UrlUtils = class {
  /**
   * There is fancy URL rewriting logic for the chrome://settings page that we need to work around.
   * Why? Special handling was added by Chrome team to allow a pushState transition between chrome:// pages.
   * As a result, the network URL (chrome://chrome/settings/) doesn't match the final document URL (chrome://settings/).
   */
  static rewriteChromeInternalUrl(url) {
    if (!url?.startsWith("chrome://")) {
      return url;
    }
    if (url.endsWith("/")) {
      url = url.replace(/\/$/, "");
    }
    return url.replace(/^chrome:\/\/chrome\//, "chrome://");
  }
  /**
   * Determine if url1 equals url2, ignoring URL fragments.
   */
  static equalWithExcludedFragments(url1, url2) {
    [url1, url2] = [url1, url2].map(this.rewriteChromeInternalUrl);
    try {
      const urla = new URL(url1);
      urla.hash = "";
      const urlb = new URL(url2);
      urlb.hash = "";
      return urla.href === urlb.href;
    } catch {
      return false;
    }
  }
};
var INITIAL_CWD = 14 * 1024;
var DEFAULT_SERVER_RESPONSE_PERCENTAGE = 0.4;
var SERVER_RESPONSE_PERCENTAGE_OF_TTFB = {
  Document: 0.9,
  XHR: 0.9,
  Fetch: 0.9
};
var NetworkAnalyzer = class _NetworkAnalyzer {
  static get summary() {
    return "__SUMMARY__";
  }
  static groupByOrigin(records) {
    const grouped = /* @__PURE__ */ new Map();
    records.forEach((item) => {
      const key = item.parsedURL.securityOrigin;
      const group = grouped.get(key) || [];
      group.push(item);
      grouped.set(key, group);
    });
    return grouped;
  }
  static getSummary(values) {
    values.sort((a, b) => a - b);
    let median;
    if (values.length === 0) {
      median = values[0];
    } else if (values.length % 2 === 0) {
      const a = values[Math.floor((values.length - 1) / 2)];
      const b = values[Math.floor((values.length - 1) / 2) + 1];
      median = (a + b) / 2;
    } else {
      median = values[Math.floor((values.length - 1) / 2)];
    }
    return {
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median
    };
  }
  static summarize(values) {
    const summaryByKey = /* @__PURE__ */ new Map();
    const allEstimates = [];
    for (const [key, estimates] of values) {
      summaryByKey.set(key, _NetworkAnalyzer.getSummary(estimates));
      allEstimates.push(...estimates);
    }
    summaryByKey.set(_NetworkAnalyzer.summary, _NetworkAnalyzer.getSummary(allEstimates));
    return summaryByKey;
  }
  static estimateValueByOrigin(requests, iteratee) {
    const connectionWasReused = _NetworkAnalyzer.estimateIfConnectionWasReused(requests);
    const groupedByOrigin = _NetworkAnalyzer.groupByOrigin(requests);
    const estimates = /* @__PURE__ */ new Map();
    for (const [origin, originRequests] of groupedByOrigin.entries()) {
      let originEstimates = [];
      for (const request of originRequests) {
        const timing = request.timing;
        if (!timing) {
          continue;
        }
        const value = iteratee({
          request,
          timing,
          connectionReused: connectionWasReused.get(request.requestId)
        });
        if (typeof value !== "undefined") {
          originEstimates = originEstimates.concat(value);
        }
      }
      if (!originEstimates.length) {
        continue;
      }
      estimates.set(origin, originEstimates);
    }
    return estimates;
  }
  /**
   * Estimates the observed RTT to each origin based on how long the connection setup.
   * For h1 and h2, this could includes two estimates - one for the TCP handshake, another for
   * SSL negotiation.
   * For h3, we get only one estimate since QUIC establishes a secure connection in a
   * single handshake.
   * This is the most accurate and preferred method of measurement when the data is available.
   */
  static estimateRTTViaConnectionTiming(info) {
    const { timing, connectionReused, request } = info;
    if (connectionReused) {
      return;
    }
    const { connectStart, sslStart, sslEnd, connectEnd } = timing;
    if (connectEnd >= 0 && connectStart >= 0 && request.protocol.startsWith("h3")) {
      return connectEnd - connectStart;
    }
    if (sslStart >= 0 && sslEnd >= 0 && sslStart !== connectStart) {
      return [connectEnd - sslStart, sslStart - connectStart];
    }
    if (connectStart >= 0 && connectEnd >= 0) {
      return connectEnd - connectStart;
    }
    return;
  }
  /**
   * Estimates the observed RTT to each origin based on how long a download took on a fresh connection.
   * NOTE: this will tend to overestimate the actual RTT quite significantly as the download can be
   * slow for other reasons as well such as bandwidth constraints.
   */
  static estimateRTTViaDownloadTiming(info) {
    const { timing, connectionReused, request } = info;
    if (connectionReused) {
      return;
    }
    if (request.transferSize <= INITIAL_CWD) {
      return;
    }
    if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) {
      return;
    }
    const totalTime = request.networkEndTime - request.networkRequestTime;
    const downloadTimeAfterFirstByte = totalTime - timing.receiveHeadersEnd;
    const numberOfRoundTrips = Math.log2(request.transferSize / INITIAL_CWD);
    if (numberOfRoundTrips > 5) {
      return;
    }
    return downloadTimeAfterFirstByte / numberOfRoundTrips;
  }
  /**
   * Estimates the observed RTT to each origin based on how long it took until Chrome could
   * start sending the actual request when a new connection was required.
   * NOTE: this will tend to overestimate the actual RTT as the request can be delayed for other
   * reasons as well such as more SSL handshakes if TLS False Start is not enabled.
   */
  static estimateRTTViaSendStartTiming(info) {
    const { timing, connectionReused, request } = info;
    if (connectionReused) {
      return;
    }
    if (!Number.isFinite(timing.sendStart) || timing.sendStart < 0) {
      return;
    }
    let roundTrips = 1;
    if (!request.protocol.startsWith("h3")) {
      roundTrips += 1;
    }
    if (request.parsedURL.scheme === "https") {
      roundTrips += 1;
    }
    return timing.sendStart / roundTrips;
  }
  /**
   * Estimates the observed RTT to each origin based on how long it took until Chrome received the
   * headers of the response (~TTFB).
   * NOTE: this is the most inaccurate way to estimate the RTT, but in some environments it's all
   * we have access to :(
   */
  static estimateRTTViaHeadersEndTiming(info) {
    const { timing, connectionReused, request } = info;
    if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) {
      return;
    }
    if (!request.resourceType) {
      return;
    }
    const serverResponseTimePercentage = SERVER_RESPONSE_PERCENTAGE_OF_TTFB[request.resourceType] || DEFAULT_SERVER_RESPONSE_PERCENTAGE;
    const estimatedServerResponseTime = timing.receiveHeadersEnd * serverResponseTimePercentage;
    let roundTrips = 1;
    if (!connectionReused) {
      roundTrips += 1;
      if (!request.protocol.startsWith("h3")) {
        roundTrips += 1;
      }
      if (request.parsedURL.scheme === "https") {
        roundTrips += 1;
      }
    }
    return Math.max((timing.receiveHeadersEnd - estimatedServerResponseTime) / roundTrips, 3);
  }
  /**
   * Given the RTT to each origin, estimates the observed server response times.
   */
  static estimateResponseTimeByOrigin(records, rttByOrigin) {
    return _NetworkAnalyzer.estimateValueByOrigin(records, ({ request, timing }) => {
      if (request.serverResponseTime !== void 0) {
        return request.serverResponseTime;
      }
      if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) {
        return;
      }
      if (!Number.isFinite(timing.sendEnd) || timing.sendEnd < 0) {
        return;
      }
      const ttfb = timing.receiveHeadersEnd - timing.sendEnd;
      const origin = request.parsedURL.securityOrigin;
      const rtt = rttByOrigin.get(origin) || rttByOrigin.get(_NetworkAnalyzer.summary) || 0;
      return Math.max(ttfb - rtt, 0);
    });
  }
  static canTrustConnectionInformation(requests) {
    const connectionIdWasStarted = /* @__PURE__ */ new Map();
    for (const request of requests) {
      const started = connectionIdWasStarted.get(request.connectionId) || !request.connectionReused;
      connectionIdWasStarted.set(request.connectionId, started);
    }
    if (connectionIdWasStarted.size <= 1) {
      return false;
    }
    return Array.from(connectionIdWasStarted.values()).every((started) => started);
  }
  /**
   * Returns a map of requestId -> connectionReused, estimating the information if the information
   * available in the records themselves appears untrustworthy.
   */
  static estimateIfConnectionWasReused(records, options) {
    const { forceCoarseEstimates = false } = options || {};
    if (!forceCoarseEstimates && _NetworkAnalyzer.canTrustConnectionInformation(records)) {
      return new Map(records.map((request) => [request.requestId, Boolean(request.connectionReused)]));
    }
    const connectionWasReused = /* @__PURE__ */ new Map();
    const groupedByOrigin = _NetworkAnalyzer.groupByOrigin(records);
    for (const originRecords of groupedByOrigin.values()) {
      const earliestReusePossible = originRecords.map((request) => request.networkEndTime).reduce((a, b) => Math.min(a, b), Infinity);
      for (const request of originRecords) {
        connectionWasReused.set(request.requestId, request.networkRequestTime >= earliestReusePossible || request.protocol === "h2");
      }
      const firstRecord = originRecords.reduce((a, b) => {
        return a.networkRequestTime > b.networkRequestTime ? b : a;
      });
      connectionWasReused.set(firstRecord.requestId, false);
    }
    return connectionWasReused;
  }
  /**
   * Estimates the RTT to each origin by examining observed network timing information.
   * Attempts to use the most accurate information first and falls back to coarser estimates when it
   * is unavailable.
   */
  static estimateRTTByOrigin(records, options) {
    const {
      forceCoarseEstimates = false,
      // coarse estimates include lots of extra time and noise
      // multiply by some factor to deflate the estimates a bit.
      coarseEstimateMultiplier = 0.3,
      useDownloadEstimates = true,
      useSendStartEstimates = true,
      useHeadersEndEstimates = true
    } = options || {};
    const connectionWasReused = _NetworkAnalyzer.estimateIfConnectionWasReused(records);
    const groupedByOrigin = _NetworkAnalyzer.groupByOrigin(records);
    const estimatesByOrigin = /* @__PURE__ */ new Map();
    for (const [origin, originRequests] of groupedByOrigin.entries()) {
      let collectEstimates = function(estimator, multiplier = 1) {
        for (const request of originRequests) {
          const timing = request.timing;
          if (!timing || !request.transferSize) {
            continue;
          }
          const estimates = estimator({
            request,
            timing,
            connectionReused: connectionWasReused.get(request.requestId)
          });
          if (estimates === void 0) {
            continue;
          }
          if (!Array.isArray(estimates)) {
            originEstimates.push(estimates * multiplier);
          } else {
            originEstimates.push(...estimates.map((e) => e * multiplier));
          }
        }
      };
      const originEstimates = [];
      if (!forceCoarseEstimates) {
        collectEstimates(this.estimateRTTViaConnectionTiming);
      }
      if (!originEstimates.length) {
        if (useDownloadEstimates) {
          collectEstimates(this.estimateRTTViaDownloadTiming, coarseEstimateMultiplier);
        }
        if (useSendStartEstimates) {
          collectEstimates(this.estimateRTTViaSendStartTiming, coarseEstimateMultiplier);
        }
        if (useHeadersEndEstimates) {
          collectEstimates(this.estimateRTTViaHeadersEndTiming, coarseEstimateMultiplier);
        }
      }
      if (originEstimates.length) {
        estimatesByOrigin.set(origin, originEstimates);
      }
    }
    if (!estimatesByOrigin.size) {
      throw new LanternError("No timing information available");
    }
    return _NetworkAnalyzer.summarize(estimatesByOrigin);
  }
  /**
   * Estimates the server response time of each origin. RTT times can be passed in or will be
   * estimated automatically if not provided.
   */
  static estimateServerResponseTimeByOrigin(records, options) {
    let rttByOrigin = options?.rttByOrigin;
    if (!rttByOrigin) {
      rttByOrigin = /* @__PURE__ */ new Map();
      const rttSummaryByOrigin = _NetworkAnalyzer.estimateRTTByOrigin(records, options);
      for (const [origin, summary] of rttSummaryByOrigin.entries()) {
        rttByOrigin.set(origin, summary.min);
      }
    }
    const estimatesByOrigin = _NetworkAnalyzer.estimateResponseTimeByOrigin(records, rttByOrigin);
    return _NetworkAnalyzer.summarize(estimatesByOrigin);
  }
  /**
   * Computes the average throughput for the given requests in bits/second.
   * Excludes data URI, failed or otherwise incomplete, and cached requests.
   * Returns null if there were no analyzable network requests.
   */
  static estimateThroughput(records) {
    let totalBytes = 0;
    const timeBoundaries = records.reduce((boundaries, request) => {
      const scheme = request.parsedURL?.scheme;
      if (scheme === "data" || request.failed || !request.finished || request.statusCode > 300 || !request.transferSize) {
        return boundaries;
      }
      totalBytes += request.transferSize;
      boundaries.push({ time: request.responseHeadersEndTime / 1e3, isStart: true });
      boundaries.push({ time: request.networkEndTime / 1e3, isStart: false });
      return boundaries;
    }, []).sort((a, b) => a.time - b.time);
    if (!timeBoundaries.length) {
      return null;
    }
    let inflight = 0;
    let currentStart = 0;
    let totalDuration = 0;
    timeBoundaries.forEach((boundary) => {
      if (boundary.isStart) {
        if (inflight === 0) {
          currentStart = boundary.time;
        }
        inflight++;
      } else {
        inflight--;
        if (inflight === 0) {
          totalDuration += boundary.time - currentStart;
        }
      }
    });
    return totalBytes * 8 / totalDuration;
  }
  static computeRTTAndServerResponseTime(records) {
    const rttByOrigin = /* @__PURE__ */ new Map();
    for (const [origin, summary] of _NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    const responseTimeSummaries = _NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin
    });
    const additionalRttByOrigin = /* @__PURE__ */ new Map();
    const serverResponseTimeByOrigin = /* @__PURE__ */ new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      const rttForOrigin = rttByOrigin.get(origin) || minimumRtt;
      additionalRttByOrigin.set(origin, rttForOrigin - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }
    return {
      rtt: minimumRtt,
      additionalRttByOrigin,
      serverResponseTimeByOrigin
    };
  }
  static analyze(records) {
    const throughput = _NetworkAnalyzer.estimateThroughput(records);
    if (throughput === null) {
      return null;
    }
    return {
      throughput,
      ..._NetworkAnalyzer.computeRTTAndServerResponseTime(records)
    };
  }
  static findResourceForUrl(records, resourceUrl) {
    return records.find((request) => resourceUrl.startsWith(request.url) && UrlUtils.equalWithExcludedFragments(request.url, resourceUrl));
  }
  static findLastDocumentForUrl(records, resourceUrl) {
    const matchingRequests = records.filter((request) => request.resourceType === "Document" && !request.failed && // Note: `request.url` should never have a fragment, else this optimization gives wrong results.
    resourceUrl.startsWith(request.url) && UrlUtils.equalWithExcludedFragments(request.url, resourceUrl));
    return matchingRequests[matchingRequests.length - 1];
  }
  /**
   * Resolves redirect chain given a main document.
   * See: {@link NetworkAnalyzer.findLastDocumentForUrl} for how to retrieve main document.
   */
  static resolveRedirects(request) {
    while (request.redirectDestination) {
      request = request.redirectDestination;
    }
    return request;
  }
};
export {
  LanternError,
  NetworkAnalyzer
};
//# sourceMappingURL=core.js.map
