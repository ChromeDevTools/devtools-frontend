// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
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
  maxCriticalPathLatency: 'Max critical path latency:'
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

export interface CriticalRequestNode {
  request: Types.Events.SyntheticNetworkRequest;
  timeFromInitialRequest: Types.Timing.Micro;
  children: CriticalRequestNode[];
  isLongest?: boolean;
  // Store all the requests that appear in any chains this request appears in.
  // Use set to avoid duplication.
  relatedRequests: Set<Types.Events.SyntheticNetworkRequest>;
}

export type NetworkDependencyTreeInsightModel = InsightModel<typeof UIStrings, {
  rootNodes: CriticalRequestNode[],
  maxTime: Types.Timing.Micro,
  fail: boolean,
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

export function generateInsight(
    _parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): NetworkDependencyTreeInsightModel {
  if (!context.navigation) {
    return finalize({
      rootNodes: [],
      maxTime: Types.Timing.Micro(0),
      fail: false,
    });
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

      // TODO(b/372897712) Switch the UIString to markdown.
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

  return finalize({
    rootNodes,
    maxTime,
    fail,
    relatedEvents,
  });
}
