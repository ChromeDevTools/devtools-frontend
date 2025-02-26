// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';

import * as Handlers from './handlers/handlers.js';
import * as Lantern from './lantern/lantern.js';
import type * as Types from './types/types.js';

type NetworkRequest = Lantern.Types.NetworkRequest<Types.Events.SyntheticNetworkRequest>;

function createProcessedNavigation(parsedTrace: Handlers.Types.ParsedTrace, frameId: string, navigationId: string):
    Lantern.Types.Simulation.ProcessedNavigation {
  const scoresByNav = parsedTrace.PageLoadMetrics.metricScoresByFrameId.get(frameId);
  if (!scoresByNav) {
    throw new Lantern.Core.LanternError('missing metric scores for frame');
  }

  const scores = scoresByNav.get(navigationId);
  if (!scores) {
    throw new Lantern.Core.LanternError('missing metric scores for specified navigation');
  }

  const getTimestampOrUndefined =
      (metric: Handlers.ModelHandlers.PageLoadMetrics.MetricName): Types.Timing.Micro|undefined => {
        const metricScore = scores.get(metric);
        if (!metricScore?.event) {
          return;
        }
        return metricScore.event.ts;
      };
  const getTimestamp = (metric: Handlers.ModelHandlers.PageLoadMetrics.MetricName): Types.Timing.Micro => {
    const metricScore = scores.get(metric);
    if (!metricScore?.event) {
      throw new Lantern.Core.LanternError(`missing metric: ${metric}`);
    }
    return metricScore.event.ts;
  };
  return {
    timestamps: {
      firstContentfulPaint: getTimestamp(Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP),
      largestContentfulPaint: getTimestampOrUndefined(Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP),
    },
  };
}

function createParsedUrl(url: URL|string): Lantern.Types.ParsedURL {
  if (typeof url === 'string') {
    url = new URL(url);
  }
  return {
    scheme: url.protocol.split(':')[0],
    // Intentional, DevTools uses different terminology
    host: url.hostname,
    securityOrigin: url.origin,
  };
}

/**
 * Returns a map of `pid` -> `tid[]`.
 */
function findWorkerThreads(trace: Lantern.Types.Trace): Map<number, number[]> {
  // TODO: WorkersHandler in Trace Engine needs to be updated to also include `pid` (only had `tid`).
  const workerThreads = new Map();
  const workerCreationEvents = ['ServiceWorker thread', 'DedicatedWorker thread'];

  for (const event of trace.traceEvents) {
    if (event.name !== 'thread_name' || !event.args.name) {
      continue;
    }
    if (!workerCreationEvents.includes(event.args.name)) {
      continue;
    }

    const tids = workerThreads.get(event.pid);
    if (tids) {
      tids.push(event.tid);
    } else {
      workerThreads.set(event.pid, [event.tid]);
    }
  }

  return workerThreads;
}

function createLanternRequest(
    parsedTrace: Readonly<Handlers.Types.ParsedTrace>, workerThreads: Map<number, number[]>,
    request: Types.Events.SyntheticNetworkRequest): NetworkRequest|undefined {
  if (request.args.data.connectionId === undefined || request.args.data.connectionReused === undefined) {
    throw new Lantern.Core.LanternError('Trace is too old');
  }

  let url;
  try {
    url = new URL(request.args.data.url);
  } catch {
    return;
  }

  const timing = request.args.data.timing ? {
    // These two timings are not included in the trace.
    workerFetchStart: -1,
    workerRespondWithSettled: -1,
    ...request.args.data.timing,
  } :
                                            undefined;

  const networkRequestTime = timing ? timing.requestTime * 1000 : request.args.data.syntheticData.downloadStart / 1000;

  let fromWorker = false;
  const tids = workerThreads.get(request.pid);
  if (tids?.includes(request.tid)) {
    fromWorker = true;
  }

  // Trace Engine collects worker thread ids in a different manner than `workerThreads` does.
  // AFAIK these should be equivalent, but in case they are not let's also check this for now.
  if (parsedTrace.Workers.workerIdByThread.has(request.tid)) {
    fromWorker = true;
  }

  // `initiator` in the trace does not contain the stack trace for JS-initiated
  // requests. Instead, that is stored in the `stackTrace` property of the SyntheticNetworkRequest.
  // There are some minor differences in the fields, accounted for here.
  // Most importantly, there seems to be fewer frames in the trace than the equivalent
  // events over the CDP. This results in less accuracy in determining the initiator request,
  // which means less edges in the graph, which mean worse results.
  // TODO: Should fix in Chromium.
  const initiator: Lantern.Types.NetworkRequest['initiator'] =
      request.args.data.initiator ?? {type: Protocol.Network.InitiatorType.Other};
  if (request.args.data.stackTrace) {
    const callFrames = request.args.data.stackTrace.map(f => {
      return {
        scriptId: String(f.scriptId) as Protocol.Runtime.ScriptId,
        url: f.url,
        lineNumber: f.lineNumber - 1,
        columnNumber: f.columnNumber - 1,
        functionName: f.functionName,
      };
    });
    initiator.stack = {callFrames};
    // Note: there is no `parent` to set ...
  }

  let resourceType = request.args.data.resourceType;
  if (request.args.data.initiator?.fetchType === 'xmlhttprequest') {
    // @ts-expect-error yes XHR is a valid ResourceType. TypeScript const enums are so unhelpful.
    resourceType = 'XHR';
  } else if (request.args.data.initiator?.fetchType === 'fetch') {
    // @ts-expect-error yes Fetch is a valid ResourceType. TypeScript const enums are so unhelpful.
    resourceType = 'Fetch';
  }

  // TODO: set decodedBodyLength for data urls in Trace Engine.
  let resourceSize = request.args.data.decodedBodyLength ?? 0;
  if (url.protocol === 'data:' && resourceSize === 0) {
    const commaIndex = url.pathname.indexOf(',');
    if (url.pathname.substring(0, commaIndex).includes(';base64')) {
      resourceSize = atob(url.pathname.substring(commaIndex + 1)).length;
    } else {
      resourceSize = url.pathname.length - commaIndex - 1;
    }
  }

  return {
    rawRequest: request,
    requestId: request.args.data.requestId,
    connectionId: request.args.data.connectionId,
    connectionReused: request.args.data.connectionReused,
    url: request.args.data.url,
    protocol: request.args.data.protocol,
    parsedURL: createParsedUrl(url),
    documentURL: request.args.data.requestingFrameUrl,
    rendererStartTime: request.ts / 1000,
    networkRequestTime,
    responseHeadersEndTime: request.args.data.syntheticData.downloadStart / 1000,
    networkEndTime: request.args.data.syntheticData.finishTime / 1000,
    transferSize: request.args.data.encodedDataLength,
    resourceSize,
    fromDiskCache: request.args.data.syntheticData.isDiskCached,
    fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
    isLinkPreload: request.args.data.isLinkPreload,
    finished: request.args.data.finished,
    failed: request.args.data.failed,
    statusCode: request.args.data.statusCode,
    initiator,
    timing,
    resourceType,
    mimeType: request.args.data.mimeType,
    priority: request.args.data.priority,
    frameId: request.args.data.frame,
    fromWorker,
    // Set later.
    redirects: undefined,
    redirectSource: undefined,
    redirectDestination: undefined,
    initiatorRequest: undefined,
  };
}

/**
 * @param request The request to find the initiator of
 */
function chooseInitiatorRequest(request: NetworkRequest, requestsByURL: Map<string, NetworkRequest[]>): NetworkRequest|
    null {
  if (request.redirectSource) {
    return request.redirectSource;
  }

  const initiatorURL = Lantern.Graph.PageDependencyGraph.getNetworkInitiators(request)[0];
  let candidates = requestsByURL.get(initiatorURL) || [];
  // The (valid) initiator must come before the initiated request.
  candidates = candidates.filter(c => {
    return c.responseHeadersEndTime <= request.rendererStartTime && c.finished && !c.failed;
  });
  if (candidates.length > 1) {
    // Disambiguate based on prefetch. Prefetch requests have type 'Other' and cannot
    // initiate requests, so we drop them here.
    const nonPrefetchCandidates =
        candidates.filter(cand => cand.resourceType !== Lantern.Types.NetworkRequestTypes.Other);
    if (nonPrefetchCandidates.length) {
      candidates = nonPrefetchCandidates;
    }
  }
  if (candidates.length > 1) {
    // Disambiguate based on frame. It's likely that the initiator comes from the same frame.
    const sameFrameCandidates = candidates.filter(cand => cand.frameId === request.frameId);
    if (sameFrameCandidates.length) {
      candidates = sameFrameCandidates;
    }
  }
  if (candidates.length > 1 && request.initiator.type === 'parser') {
    // Filter to just Documents when initiator type is parser.
    const documentCandidates =
        candidates.filter(cand => cand.resourceType === Lantern.Types.NetworkRequestTypes.Document);
    if (documentCandidates.length) {
      candidates = documentCandidates;
    }
  }
  if (candidates.length > 1) {
    // If all real loads came from successful preloads (url preloaded and
    // loads came from the cache), filter to link rel=preload request(s).
    const linkPreloadCandidates = candidates.filter(c => c.isLinkPreload);
    if (linkPreloadCandidates.length) {
      const nonPreloadCandidates = candidates.filter(c => !c.isLinkPreload);
      const allPreloaded = nonPreloadCandidates.every(c => c.fromDiskCache || c.fromMemoryCache);
      if (nonPreloadCandidates.length && allPreloaded) {
        candidates = linkPreloadCandidates;
      }
    }
  }

  // Only return an initiator if the result is unambiguous.
  return candidates.length === 1 ? candidates[0] : null;
}

function linkInitiators(lanternRequests: NetworkRequest[]): void {
  const requestsByURL = new Map<string, NetworkRequest[]>();
  for (const request of lanternRequests) {
    const requests = requestsByURL.get(request.url) || [];
    requests.push(request);
    requestsByURL.set(request.url, requests);
  }

  for (const request of lanternRequests) {
    const initiatorRequest = chooseInitiatorRequest(request, requestsByURL);
    if (initiatorRequest) {
      request.initiatorRequest = initiatorRequest;
    }
  }
}

function createNetworkRequests(
    trace: Lantern.Types.Trace, parsedTrace: Handlers.Types.ParsedTrace, startTime = 0,
    endTime = Number.POSITIVE_INFINITY): NetworkRequest[] {
  const workerThreads = findWorkerThreads(trace);

  const lanternRequests: NetworkRequest[] = [];
  for (const request of parsedTrace.NetworkRequests.byTime) {
    if (request.ts >= startTime && request.ts < endTime) {
      const lanternRequest = createLanternRequest(parsedTrace, workerThreads, request);
      if (lanternRequest) {
        lanternRequests.push(lanternRequest);
      }
    }
  }

  // Trace Engine consolidates all redirects into a single request object, but lantern needs
  // an entry for each redirected request.
  for (const request of [...lanternRequests]) {
    if (!request.rawRequest) {
      continue;
    }

    const redirects = request.rawRequest.args.data.redirects;
    if (!redirects.length) {
      continue;
    }

    const requestChain = [];
    for (const redirect of redirects) {
      const redirectedRequest = structuredClone(request);

      redirectedRequest.networkRequestTime = redirect.ts / 1000;
      redirectedRequest.rendererStartTime = redirectedRequest.networkRequestTime;

      redirectedRequest.networkEndTime = (redirect.ts + redirect.dur) / 1000;
      redirectedRequest.responseHeadersEndTime = redirectedRequest.networkEndTime;

      redirectedRequest.timing = {
        requestTime: redirectedRequest.networkRequestTime / 1000,
        receiveHeadersStart: redirectedRequest.responseHeadersEndTime,
        receiveHeadersEnd: redirectedRequest.responseHeadersEndTime,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: -1,
        dnsEnd: -1,
        connectStart: -1,
        connectEnd: -1,
        sslStart: -1,
        sslEnd: -1,
        sendStart: -1,
        sendEnd: -1,
        workerStart: -1,
        workerReady: -1,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
        pushStart: -1,
        pushEnd: -1,
      };

      redirectedRequest.url = redirect.url;
      redirectedRequest.parsedURL = createParsedUrl(redirect.url);
      // TODO: Trace Engine is not retaining the actual status code.
      redirectedRequest.statusCode = 302;
      redirectedRequest.resourceType = undefined;
      // TODO: Trace Engine is not retaining transfer size of redirected request.
      redirectedRequest.transferSize = 400;
      requestChain.push(redirectedRequest);
      lanternRequests.push(redirectedRequest);
    }
    requestChain.push(request);

    for (let i = 0; i < requestChain.length; i++) {
      const request = requestChain[i];
      if (i > 0) {
        request.redirectSource = requestChain[i - 1];
        request.redirects = requestChain.slice(0, i);
      }
      if (i !== requestChain.length - 1) {
        request.redirectDestination = requestChain[i + 1];
      }
    }

    // Apply the `:redirect` requestId convention: only redirects[0].requestId is the actual
    // requestId, all the rest have n occurrences of `:redirect` as a suffix.
    for (let i = 1; i < requestChain.length; i++) {
      requestChain[i].requestId = `${requestChain[i - 1].requestId}:redirect`;
    }
  }

  linkInitiators(lanternRequests);

  // This would already be sorted by rendererStartTime, if not for the redirect unwrapping done
  // above.
  return lanternRequests.sort((a, b) => a.rendererStartTime - b.rendererStartTime);
}

function collectMainThreadEvents(
    trace: Lantern.Types.Trace, parsedTrace: Handlers.Types.ParsedTrace): Lantern.Types.TraceEvent[] {
  const Meta = parsedTrace.Meta;
  const mainFramePids = Meta.mainFrameNavigations.length ? new Set(Meta.mainFrameNavigations.map(nav => nav.pid)) :
                                                           Meta.topLevelRendererIds;

  const rendererPidToTid = new Map();
  for (const pid of mainFramePids) {
    const threads = Meta.threadsInProcess.get(pid) ?? [];

    let found = false;
    for (const [tid, thread] of threads) {
      if (thread.args.name === 'CrRendererMain') {
        rendererPidToTid.set(pid, tid);
        found = true;
        break;
      }
    }

    if (found) {
      continue;
    }

    // `CrRendererMain` can be missing if chrome is launched with the `--single-process` flag.
    // In this case, page tasks will be run in the browser thread.
    for (const [tid, thread] of threads) {
      if (thread.args.name === 'CrBrowserMain') {
        rendererPidToTid.set(pid, tid);
        found = true;
        break;
      }
    }
  }

  return trace.traceEvents.filter(e => rendererPidToTid.get(e.pid) === e.tid);
}

function createGraph(
    requests: Lantern.Types.NetworkRequest[], trace: Lantern.Types.Trace, parsedTrace: Handlers.Types.ParsedTrace,
    url?: Lantern.Types.Simulation.URL): Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest> {
  const mainThreadEvents = collectMainThreadEvents(trace, parsedTrace);

  // url defines the initial request that the Lantern graph starts at (the root node) and the
  // main document request. These are equal if there are no redirects.
  if (!url) {
    url = {
      requestedUrl: requests[0].url,
      mainDocumentUrl: '',
    };

    let request = requests[0];
    while (request.redirectDestination) {
      request = request.redirectDestination;
    }
    url.mainDocumentUrl = request.url;
  }

  return Lantern.Graph.PageDependencyGraph.createGraph(mainThreadEvents, requests, url);
}

export {
  createGraph,
  createNetworkRequests,
  createProcessedNavigation,
};
