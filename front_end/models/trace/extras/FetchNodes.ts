// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Types from '../types/types.js';

const domLookUpSingleNodeCache =
    new Map<Handlers.Types.ParsedTrace, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
const domLookUpBatchNodesCache = new Map<
    Handlers.Types.ParsedTrace,
    Map<Protocol.DOM.BackendNodeId[], Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>>();

export function clearCacheForTesting(): void {
  domLookUpSingleNodeCache.clear();
  domLookUpBatchNodesCache.clear();
}

/**
 * Looks up the DOM Node on the page for the given BackendNodeId. Uses the
 * provided ParsedTrace as the cache and will cache the result after the
 * first lookup.
 */
export async function domNodeForBackendNodeID(
    modelData: Handlers.Types.ParsedTrace, nodeId: Protocol.DOM.BackendNodeId): Promise<SDK.DOMModel.DOMNode|null> {
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

const nodeIdsForEventCache = new WeakMap<Types.Events.Event, Set<Protocol.DOM.BackendNodeId>>();
/**
 * Extracts a set of NodeIds for a given event.
 * NOTE: you probably don't want to call this and instead use
 * `extractRelatedDOMNodesFromEvent`, which will fetch the nodes over CDP.
 * This method is primarily exported so we can test the logic more easily
 * without having to mock the CDP layer.
 **/
export function nodeIdsForEvent(
    modelData: Handlers.Types.ParsedTrace,
    event: Types.Events.Event,
    ): Set<Protocol.DOM.BackendNodeId> {
  const fromCache = nodeIdsForEventCache.get(event);
  if (fromCache) {
    return fromCache;
  }
  const foundIds = new Set<Protocol.DOM.BackendNodeId>();

  if (Types.Events.isLayout(event)) {
    event.args.endData?.layoutRoots.forEach(root => foundIds.add(root.nodeId));
  } else if (Types.Events.isSyntheticLayoutShift(event) && event.args.data?.impacted_nodes) {
    event.args.data.impacted_nodes.forEach(node => foundIds.add(node.node_id));
  } else if (Types.Events.isLargestContentfulPaintCandidate(event) && typeof event.args.data?.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Types.Events.isPaint(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Types.Events.isPaintImage(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Types.Events.isScrollLayer(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (
      Types.Events.isSyntheticAnimation(event) && typeof event.args.data.beginEvent.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.beginEvent.args.data.nodeId);
  } else if (Types.Events.isDecodeImage(event)) {
    // For a DecodeImage event, we can use the ImagePaintingHandler, which has
    // done the work to build the relationship between a DecodeImage event and
    // the corresponding PaintImage event.
    const paintImageEvent = modelData.ImagePainting.paintImageForEvent.get(event);
    if (typeof paintImageEvent?.args.data.nodeId !== 'undefined') {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Types.Events.isDrawLazyPixelRef(event) && event.args?.LazyPixelRef) {
    const paintImageEvent = modelData.ImagePainting.paintImageByDrawLazyPixelRef.get(event.args.LazyPixelRef);
    if (typeof paintImageEvent?.args.data.nodeId !== 'undefined') {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Types.Events.isParseMetaViewport(event) && typeof event.args?.data.node_id !== 'undefined') {
    foundIds.add(event.args.data.node_id);
  }
  nodeIdsForEventCache.set(event, foundIds);
  return foundIds;
}

/**
 * Looks up for backend node ids in different types of trace events
 * and resolves them into related DOM nodes.
 * This method should be progressively updated to support more events
 * containing node ids which we want to resolve.
 */
export async function extractRelatedDOMNodesFromEvent(modelData: Handlers.Types.ParsedTrace, event: Types.Events.Event):
    Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>|null> {
  const nodeIds = nodeIdsForEvent(modelData, event);
  if (nodeIds.size) {
    return await domNodesForMultipleBackendNodeIds(modelData, Array.from(nodeIds));
  }
  return null;
}

/**
 * Takes a set of Protocol.DOM.BackendNodeId ids and will return a map of NodeId=>DOMNode.
 * Results are cached based on 1) the provided ParsedTrace and 2) the provided set of IDs.
 */
export async function domNodesForMultipleBackendNodeIds(
    modelData: Handlers.Types.ParsedTrace,
    nodeIds: Protocol.DOM.BackendNodeId[]): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>> {
  const fromCache = domLookUpBatchNodesCache.get(modelData)?.get(nodeIds);
  if (fromCache) {
    return fromCache;
  }
  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return new Map();
  }

  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set(nodeIds)) || new Map();

  const cacheForModel = domLookUpBatchNodesCache.get(modelData) ||
      new Map<Protocol.DOM.BackendNodeId[], Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
  cacheForModel.set(nodeIds, domNodesMap);
  domLookUpBatchNodesCache.set(modelData, cacheForModel);

  return domNodesMap;
}
