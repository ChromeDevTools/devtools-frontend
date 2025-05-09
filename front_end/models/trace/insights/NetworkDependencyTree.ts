// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Protocol from '../../../generated/protocol.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Lantern from '../lantern/lantern.js';
import * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type InsightSetContextWithNavigation,
  type PartialInsightModel,
  type RelatedEventsMap,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that recommends avoiding chaining critical requests.
   */
  title: 'Network dependency tree',
  /**
   * @description Description of an insight that recommends avoiding chaining critical requests.
   */
  description:
      '[Avoid chaining critical requests](https://developer.chrome.com/docs/lighthouse/performance/critical-request-chains) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.',
  /**
   * @description Description of the warning that recommends avoiding chaining critical requests.
   */
  warningDescription:
      'Avoid chaining critical requests by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.',
  /**
   * @description Text status indicating that there isn't long chaining critical network requests.
   */
  noNetworkDependencyTree: 'No rendering tasks impacted by network dependencies',
  /**
   * @description Text for the maximum critical path latency. This refers to the longest chain of network requests that
   * the browser must download before it can render the page.
   */
  maxCriticalPathLatency: 'Max critical path latency:',
  /** Label for a column in a data table; entries will be the network request */
  columnRequest: 'Request',
  /** Label for a column in a data table; entries will be the time from main document till current network request. */
  columnTime: 'Time',
  /**
   * @description Title of the table of the detected preconnect origins.
   */
  preconnectOriginsTableTitle: 'Preconnect origins',
  /**
   * @description Description of the table of the detected preconnect origins.
   */
  preconnectOriginsTableDescription:
      '[preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints help the browser establish a connection earlier in the page load, saving time when the first request for that origin is made. The following are the origins that the page preconnected to.',
  /**
   * @description Text status indicating that there isn't any preconnected origins.
   */
  noPreconnectOrigins: 'no origins were preconnected',
  /**
   * @description Label for a column in a data table; entries will be the source of the origin.
   */
  columnSource: 'Source',
  /**
   * @description Text status indicating that there isn't preconnect candidates.
   */
  noPreconnectCandidates: 'No additional origins are good candidates for preconnecting',
  /**
   * @description Title of the table that shows the origins that the page should have preconnected to.
   */
  estSavingTableTitle: 'Preconnect candidates',
  /**
   * @description Description of the table that recommends preconnecting to the origins to save time.
   */
  estSavingTableDescription:
      'Add [preconnect](https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/) hints to your most important origins, but try to use fewer than 4.',
  /**
   * @description Label for a column in a data table; entries will be the origin of a web resource
   */
  columnOrigin: 'Origin',
  /**
   * @description Label for a column in a data table; entries will be the number of milliseconds the user could reduce page load by if they implemented the suggestions.
   */
  columnWastedMs: 'Est LCP savings',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/NetworkDependencyTree.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// XHRs are fetched at High priority, but we exclude them, as they are unlikely to be critical
// Images are also non-critical.
const nonCriticalResourceTypes = new Set<Protocol.Network.ResourceType>([
  Protocol.Network.ResourceType.Image,
  Protocol.Network.ResourceType.XHR,
  Protocol.Network.ResourceType.Fetch,
  Protocol.Network.ResourceType.EventSource,
]);

// Preconnect establishes a "clean" socket. Chrome's socket manager will keep an unused socket
// around for 10s. Meaning, the time delta between processing preconnect a request should be <10s,
// otherwise it's wasted. We add a 5s margin so we are sure to capture all key requests.
// @see https://github.com/GoogleChrome/lighthouse/issues/3106#issuecomment-333653747
const PRECONNECT_SOCKET_MAX_IDLE_IN_MS = Types.Timing.Milli(15_000);

const IGNORE_THRESHOLD_IN_MILLISECONDS = Types.Timing.Milli(50);

export interface CriticalRequestNode {
  request: Types.Events.SyntheticNetworkRequest;
  timeFromInitialRequest: Types.Timing.Micro;
  children: CriticalRequestNode[];
  isLongest?: boolean;
  // Store all the requests that appear in any chains this request appears in.
  // Use set to avoid duplication.
  relatedRequests: Set<Types.Events.SyntheticNetworkRequest>;
}

export interface PreconnectOrigin {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  node_id: Protocol.DOM.BackendNodeId;
  frame?: string;
  url: string;
}
export interface PreconnectCandidate {
  origin: Platform.DevToolsPath.UrlString;
  wastedMs: Types.Timing.Milli;
}

export type NetworkDependencyTreeInsightModel = InsightModel<typeof UIStrings, {
  rootNodes: CriticalRequestNode[],
  maxTime: Types.Timing.Micro,
  fail: boolean,
  preconnectOrigins: PreconnectOrigin[],
  preconnectCandidates: PreconnectCandidate[],
}>;

function finalize(partialModel: PartialInsightModel<NetworkDependencyTreeInsightModel>):
    NetworkDependencyTreeInsightModel {
  return {
    insightKey: InsightKeys.NETWORK_DEPENDENCY_TREE,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.LCP,
    state: partialModel.fail ? 'fail' : 'pass',
    ...partialModel,
  };
}

function isCritical(request: Types.Events.SyntheticNetworkRequest, context: InsightSetContextWithNavigation): boolean {
  // The main resource is always critical.
  if (request.args.data.requestId === context.navigationId) {
    return true;
  }

  // Treat any preloaded resource as non-critical
  if (request.args.data.isLinkPreload) {
    return false;
  }

  // Iframes are considered High Priority but they are not render blocking
  const isIframe = request.args.data.resourceType === Protocol.Network.ResourceType.Document &&
      request.args.data.frame !== context.frameId;

  if (nonCriticalResourceTypes.has(request.args.data.resourceType) || isIframe ||
      // Treat any missed images, primarily favicons, as non-critical resources
      request.args.data.mimeType.startsWith('image/')) {
    return false;
  }

  // Requests that have no initiatorRequest are typically ambiguous late-load assets.
  // Even on the off chance they were important, we don't have any parent to display for them.
  const initiatorUrl =
      request.args.data.initiator?.url || Helpers.Trace.getZeroIndexedStackTraceInEventPayload(request)?.at(0)?.url;
  if (!initiatorUrl) {
    return false;
  }

  const isBlocking = Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request);
  const isHighPriority = Helpers.Network.isSyntheticNetworkRequestHighPriority(request);
  return isHighPriority || isBlocking;
}

function generateNetworkDependencyTree(context: InsightSetContext): {
  rootNodes: CriticalRequestNode[],
  maxTime: Types.Timing.Micro,
  fail: boolean,
  relatedEvents?: RelatedEventsMap,
} {
  if (!context.navigation) {
    return {
      rootNodes: [],
      maxTime: Types.Timing.Micro(0),
      fail: false,
    };
  }

  const rootNodes: CriticalRequestNode[] = [];
  const relatedEvents: RelatedEventsMap = new Map();
  let maxTime = Types.Timing.Micro(0);
  let fail = false;

  let longestChain: Types.Events.SyntheticNetworkRequest[] = [];

  function addChain(path: Types.Events.SyntheticNetworkRequest[]): void {
    if (path.length === 0) {
      return;
    }
    if (path.length >= 2) {
      fail = true;
    }
    const initialRequest = path[0];
    const lastRequest = path[path.length - 1];
    const totalChainTime = Types.Timing.Micro(lastRequest.ts + lastRequest.dur - initialRequest.ts);
    if (totalChainTime > maxTime) {
      maxTime = totalChainTime;
      longestChain = path;
    }

    let currentNodes = rootNodes;

    for (let depth = 0; depth < path.length; ++depth) {
      const request = path[depth];
      // find the request
      let found = currentNodes.find(node => node.request === request);

      if (!found) {
        const timeFromInitialRequest = Types.Timing.Micro(request.ts + request.dur - initialRequest.ts);
        found = {
          request,
          timeFromInitialRequest,
          children: [],
          relatedRequests: new Set(),
        };
        currentNodes.push(found);
      }

      path.forEach(request => found?.relatedRequests.add(request));

      // TODO(b/372897712): When RelatedInsight supports markdown, remove
      // UIStrings.warningDescription and use UIStrings.description.
      relatedEvents.set(request, depth < 2 ? [] : [i18nString(UIStrings.warningDescription)]);

      currentNodes = found.children;
    }
  }
  // By default `traverse` will discover nodes in BFS-order regardless of dependencies, but
  // here we need traversal in a topological sort order. We'll visit a node only when its
  // dependencies have been met.
  const seenNodes = new Set<Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest>>();
  function getNextNodes(node: Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest>):
      Array<Lantern.Graph.Node<Types.Events.SyntheticNetworkRequest>> {
    return node.getDependents().filter(n => n.getDependencies().every(d => seenNodes.has(d)));
  }

  context.lantern?.graph.traverse((node, traversalPath) => {
    seenNodes.add(node);
    if (node.type !== 'network') {
      return;
    }
    const networkNode = node;
    if (!isCritical(networkNode.rawRequest, context)) {
      return;
    }

    const networkPath = traversalPath.filter(node => node.type === 'network').reverse().map(node => node.rawRequest);

    // Ignore if some ancestor is not a critical request.
    if (networkPath.some(request => (!isCritical(request, context)))) {
      return;
    }

    // Ignore non-network things (like data urls).
    if (node.isNonNetworkProtocol) {
      return;
    }

    addChain(networkPath);
  }, getNextNodes);

  // Mark the longest chain
  if (longestChain.length > 0) {
    let currentNodes = rootNodes;
    for (const request of longestChain) {
      const found = currentNodes.find(node => node.request === request);
      if (found) {
        found.isLongest = true;
        currentNodes = found.children;
      } else {
        console.error('Some request in the longest chain is not found');
      }
    }
  }

  return {
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
  };
}

function hasValidTiming(request: Types.Events.SyntheticNetworkRequest): boolean {
  return !!request.args.data.timing && request.args.data.timing.connectEnd >= 0 &&
      request.args.data.timing.connectStart >= 0;
}

function hasAlreadyConnectedToOrigin(request: Types.Events.SyntheticNetworkRequest): boolean {
  const {timing} = request.args.data;
  if (!timing) {
    return false;
  }

  // When these values are given as -1, that means the page has
  // a connection for this origin and paid these costs already.
  if (timing.dnsStart === -1 && timing.dnsEnd === -1 && timing.connectStart === -1 && timing.connectEnd === -1) {
    return true;
  }

  // Less understood: if the connection setup took no time at all, consider
  // it the same as the above. It is unclear if this is correct, or is even possible.
  if (timing.dnsEnd - timing.dnsStart === 0 && timing.connectEnd - timing.connectStart === 0) {
    return true;
  }

  return false;
}

function socketStartTimeIsBelowThreshold(
    request: Types.Events.SyntheticNetworkRequest, mainResource: Types.Events.SyntheticNetworkRequest): boolean {
  const timeSinceMainEnd =
      Math.max(0, request.args.data.syntheticData.sendStartTime - mainResource.args.data.syntheticData.finishTime) as
      Types.Timing.Micro;
  return Helpers.Timing.microToMilli(timeSinceMainEnd) < PRECONNECT_SOCKET_MAX_IDLE_IN_MS;
}

function candidateRequestsByOrigin(
    parsedTrace: Handlers.Types.ParsedTrace, mainResource: Types.Events.SyntheticNetworkRequest,
    contextRequests: Types.Events.SyntheticNetworkRequest[],
    lcpGraphURLs: Set<string>): Map<string, Types.Events.SyntheticNetworkRequest[]> {
  const origins = new Map<string, Types.Events.SyntheticNetworkRequest[]>();

  contextRequests.forEach(request => {
    if (!hasValidTiming(request)) {
      return;
    }

    // Filter out all resources that are loaded by the document. Connections are already early.
    if (parsedTrace.NetworkRequests.eventToInitiator.get(request) === mainResource) {
      return;
    }

    const url = new URL(request.args.data.url);
    // Filter out urls that do not have an origin (data, file, etc).
    if (url.origin === 'null') {
      return;
    }
    const mainOrigin = new URL(mainResource.args.data.url).origin;
    // Filter out all resources that have the same origin. We're already connected.
    if (url.origin === mainOrigin) {
      return;
    }

    // Filter out anything that wasn't part of LCP. Only recommend important origins.
    if (!lcpGraphURLs.has(request.args.data.url)) {
      return;
    }
    // Filter out all resources where origins are already resolved.
    if (hasAlreadyConnectedToOrigin(request)) {
      return;
    }
    // Make sure the requests are below the PRECONNECT_SOCKET_MAX_IDLE_IN_MS (15s) mark.
    if (!socketStartTimeIsBelowThreshold(request, mainResource)) {
      return;
    }

    const originRequests = Platform.MapUtilities.getWithDefault(origins, url.origin, () => []);
    originRequests.push(request);
  });

  return origins;
}

export function generatePreconnectCandidates(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): PreconnectCandidate[] {
  if (!context.navigation || !context.lantern) {
    return [];
  }

  const isWithinContext = (event: Types.Events.Event): boolean => Helpers.Timing.eventIsInBounds(event, context.bounds);
  const contextRequests = parsedTrace.NetworkRequests.byTime.filter(isWithinContext);
  const mainResource = contextRequests.find(request => request.args.data.requestId === context.navigationId);
  if (!mainResource) {
    return [];
  }

  const {rtt, additionalRttByOrigin} = context.lantern.simulator.getOptions();
  const lcpGraph = context.lantern.metrics.largestContentfulPaint.pessimisticGraph;
  const fcpGraph = context.lantern.metrics.firstContentfulPaint.pessimisticGraph;
  const lcpGraphURLs = new Set<string>();
  lcpGraph.traverse(node => {
    if (node.type === 'network') {
      lcpGraphURLs.add(node.request.url);
    }
  });
  const fcpGraphURLs = new Set<string>();
  fcpGraph.traverse(node => {
    if (node.type === 'network') {
      fcpGraphURLs.add(node.request.url);
    }
  });

  const origins = candidateRequestsByOrigin(parsedTrace, mainResource, contextRequests, lcpGraphURLs);

  let maxWastedLcp = Types.Timing.Milli(0);
  let maxWastedFcp = Types.Timing.Milli(0);
  let preconnectCandidates: PreconnectCandidate[] = [];

  origins.forEach(requests => {
    const firstRequestOfOrigin = requests[0];

    // Skip the origin if we don't have timing information
    if (!firstRequestOfOrigin.args.data.timing) {
      return;
    }

    const firstRequestOfOriginParsedURL = new Common.ParsedURL.ParsedURL(firstRequestOfOrigin.args.data.url);
    const origin = firstRequestOfOriginParsedURL.securityOrigin();

    // Approximate the connection time with the duration of TCP (+potentially SSL) handshake
    // DNS time can be large but can also be 0 if a commonly used origin that's cached, so make
    // no assumption about DNS.
    const additionalRtt = additionalRttByOrigin.get(origin) ?? 0;
    let connectionTime = Types.Timing.Milli(rtt + additionalRtt);
    // TCP Handshake will be at least 2 RTTs for TLS connections
    if (firstRequestOfOriginParsedURL.scheme === 'https') {
      connectionTime = Types.Timing.Milli(connectionTime * 2);
    }

    const timeBetweenMainResourceAndDnsStart = Types.Timing.Micro(
        firstRequestOfOrigin.args.data.syntheticData.sendStartTime - mainResource.args.data.syntheticData.finishTime +
        Helpers.Timing.milliToMicro(firstRequestOfOrigin.args.data.timing.dnsStart));
    const wastedMs =
        Math.min(connectionTime, Helpers.Timing.microToMilli(timeBetweenMainResourceAndDnsStart)) as Types.Timing.Milli;
    if (wastedMs < IGNORE_THRESHOLD_IN_MILLISECONDS) {
      return;
    }

    maxWastedLcp = Math.max(wastedMs, maxWastedLcp) as Types.Timing.Milli;

    if (fcpGraphURLs.has(firstRequestOfOrigin.args.data.url)) {
      maxWastedFcp = Math.max(wastedMs, maxWastedFcp) as Types.Timing.Milli;
    }
    preconnectCandidates.push({
      origin,
      wastedMs,
    });
  });

  preconnectCandidates = preconnectCandidates.sort((a, b) => b.wastedMs - a.wastedMs);

  return preconnectCandidates;
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): NetworkDependencyTreeInsightModel {
  const {
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
  } = generateNetworkDependencyTree(context);

  const preconnectOrigins = parsedTrace.NetworkRequests.linkPreconnectEvents.map(event => ({
                                                                                   node_id: event.args.data.node_id,
                                                                                   frame: event.args.data.frame,
                                                                                   url: event.args.data.url,
                                                                                 }));

  const preconnectCandidates = generatePreconnectCandidates(parsedTrace, context);

  return finalize({
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
    preconnectOrigins,
    preconnectCandidates,
  });
}
