// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Handlers from '../handlers/handlers.js';
import type * as Types from '../types/types.js';

const domLookUpSingleNodeCache =
    new Map<Handlers.Types.TraceParseData, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
const domLookUpBatchNodesCache = new Map<
    Handlers.Types.TraceParseData,
    Map<Set<Protocol.DOM.BackendNodeId>, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>>();

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _TEST_clearCache(): void {
  domLookUpSingleNodeCache.clear();
  domLookUpBatchNodesCache.clear();
  layoutShiftSourcesCache.clear();
  normalizedLayoutShiftNodesCache.clear();
}

/**
 * Looks up the DOM Node on the page for the given BackendNodeId. Uses the
 * provided TraceParseData as the cache and will cache the result after the
 * first lookup.
 */
export async function domNodeForBackendNodeID(
    modelData: Handlers.Types.TraceParseData, nodeId: Protocol.DOM.BackendNodeId): Promise<SDK.DOMModel.DOMNode|null> {
  const fromCache = domLookUpSingleNodeCache.get(modelData)?.get(nodeId);
  if (fromCache !== undefined) {
    return fromCache;
  }

  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return null;
  }

  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([nodeId]));
  const result = domNodesMap?.get(nodeId) || null;

  const cacheForModel =
      domLookUpSingleNodeCache.get(modelData) || new Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>();
  cacheForModel.set(nodeId, result);
  domLookUpSingleNodeCache.set(modelData, cacheForModel);

  return result;
}

/**
 * Takes a set of Protocol.DOM.BackendNodeId ids and will return a map of NodeId=>DOMNode.
 * Results are cached based on 1) the provided TraceParseData and 2) the provided set of IDs.
 */
export async function domNodesForMultipleBackendNodeIds(
    modelData: Handlers.Types.TraceParseData,
    nodeIds: Set<Protocol.DOM.BackendNodeId>): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>> {
  const fromCache = domLookUpBatchNodesCache.get(modelData)?.get(nodeIds);
  if (fromCache) {
    return fromCache;
  }
  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return new Map();
  }

  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(nodeIds) || new Map();

  const cacheForModel = domLookUpBatchNodesCache.get(modelData) ||
      new Map<Set<Protocol.DOM.BackendNodeId>, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
  cacheForModel.set(nodeIds, domNodesMap);
  domLookUpBatchNodesCache.set(modelData, cacheForModel);

  return domNodesMap;
}

const layoutShiftSourcesCache = new Map<
    Handlers.Types.TraceParseData, Map<Types.TraceEvents.TraceEventLayoutShift, readonly LayoutShiftSource[]>>();

const normalizedLayoutShiftNodesCache = new Map<
    Handlers.Types.TraceParseData,
    Map<Types.TraceEvents.TraceEventLayoutShift, readonly Types.TraceEvents.TraceImpactedNode[]>>();

export interface LayoutShiftSource {
  previousRect: DOMRect;
  currentRect: DOMRect;
  node: SDK.DOMModel.DOMNode;
}

/**
 * Calculates and returns a list of sources for a LayoutShift.
 * Here, a source is considered as a node that moved and contributed to the
 * given LayoutShift existing and the score it was given. Each source returned
 * contains a reference to the DOM Node, and its dimensions (as a DOMRect), both
 * before and now, so we can see how this node changed and how that impacted the
 * layout shift.
 *
 * This data is cached based on the provided model data and the given layout
 * shift, so it is is safe to call multiple times with the same input.
 */
export async function sourcesForLayoutShift(
    modelData: Handlers.Types.TraceParseData,
    event: Types.TraceEvents.TraceEventLayoutShift): Promise<readonly LayoutShiftSource[]> {
  const fromCache = layoutShiftSourcesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }
  const sources: LayoutShiftSource[] = [];
  await Promise.all(impactedNodes.map(async node => {
    const domNode = await domNodeForBackendNodeID(modelData, node.node_id);
    if (domNode) {
      sources.push({
        previousRect: new DOMRect(node.old_rect[0], node.old_rect[1], node.old_rect[2], node.old_rect[3]),
        currentRect: new DOMRect(node.new_rect[0], node.new_rect[1], node.new_rect[2], node.new_rect[3]),
        node: domNode,
      });
    }
  }));
  const cacheForModel =
      layoutShiftSourcesCache.get(modelData) || new Map<Types.TraceEvents.TraceEventLayoutShift, LayoutShiftSource[]>();
  cacheForModel.set(event, sources);
  layoutShiftSourcesCache.set(modelData, cacheForModel);
  return sources;
}

/**
 * Takes a LayoutShift and normalizes its node dimensions based on the device
 * pixel ratio (DPR) of the user's display.
 * This is required because the Layout Instability API is not based on CSS
 * pixels, but physical pixels. Therefore we need to map these to normalized CSS
 * pixels if we can. For example, if the user is on a device with a DPR of 2,
 * the values of the node dimensions reported by the Instability API need to be
 * divided by 2 to be accurate.
 * This function is safe to call multiple times as results are cached based on
 * the provided model data.
 * See https://crbug.com/1300309 for details.
 */
export async function normalizedImpactedNodesForLayoutShift(
    modelData: Handlers.Types.TraceParseData,
    event: Types.TraceEvents.TraceEventLayoutShift): Promise<readonly Types.TraceEvents.TraceImpactedNode[]> {
  const fromCache = normalizedLayoutShiftNodesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args?.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }

  let viewportScale: number|null = null;
  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  // Get the CSS-to-physical pixel ratio of the device the inspected
  // target is running at.
  const evaluateResult = await target?.runtimeAgent().invoke_evaluate({expression: 'window.devicePixelRatio'});
  if (evaluateResult?.result.type === 'number') {
    viewportScale = evaluateResult?.result.value as number ?? null;
  }

  if (!viewportScale) {
    // Bail and return the nodes as is.
    return impactedNodes;
  }

  const normalizedNodes: Types.TraceEvents.TraceImpactedNode[] = [];
  for (const impactedNode of impactedNodes) {
    const newNode = {...impactedNode};
    for (let i = 0; i < impactedNode.old_rect.length; i++) {
      newNode.old_rect[i] /= viewportScale;
    }
    for (let i = 0; i < impactedNode.new_rect.length; i++) {
      newNode.new_rect[i] /= viewportScale;
    }
    normalizedNodes.push(newNode);
  }

  const cacheForModel = normalizedLayoutShiftNodesCache.get(modelData) ||
      new Map<Types.TraceEvents.TraceEventLayoutShift, readonly Types.TraceEvents.TraceImpactedNode[]>();
  cacheForModel.set(event, normalizedNodes);
  normalizedLayoutShiftNodesCache.set(modelData, cacheForModel);

  return normalizedNodes;
}
