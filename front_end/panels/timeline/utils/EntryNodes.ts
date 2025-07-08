// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';

const nodeIdsForEventCache = new WeakMap<Trace.Types.Events.Event, Set<Protocol.DOM.BackendNodeId>>();
const domNodesForEventCache =
    new WeakMap<Trace.Types.Events.Event, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();

/**
 * Extracts a set of NodeIds for a given event.
 * The result is cached so you can safely call this multiple times.
 **/
export function nodeIdsForEvent(
    modelData: Trace.Handlers.Types.ParsedTrace,
    event: Trace.Types.Events.Event,
    ): Set<Protocol.DOM.BackendNodeId> {
  const fromCache = nodeIdsForEventCache.get(event);
  if (fromCache) {
    return fromCache;
  }
  const foundIds = new Set<Protocol.DOM.BackendNodeId>();

  if (Trace.Types.Events.isLayout(event)) {
    event.args.endData?.layoutRoots.forEach(root => foundIds.add(root.nodeId));
  } else if (Trace.Types.Events.isSyntheticLayoutShift(event) && event.args.data?.impacted_nodes) {
    event.args.data.impacted_nodes.forEach(node => foundIds.add(node.node_id));
  } else if (
      Trace.Types.Events.isLargestContentfulPaintCandidate(event) && typeof event.args.data?.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isPaint(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isPaintImage(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (Trace.Types.Events.isScrollLayer(event) && typeof event.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.nodeId);
  } else if (
      Trace.Types.Events.isSyntheticAnimation(event) &&
      typeof event.args.data.beginEvent.args.data.nodeId !== 'undefined') {
    foundIds.add(event.args.data.beginEvent.args.data.nodeId);
  } else if (Trace.Types.Events.isDecodeImage(event)) {
    // For a DecodeImage event, we can use the ImagePaintingHandler, which has
    // done the work to build the relationship between a DecodeImage event and
    // the corresponding PaintImage event.
    const paintImageEvent = modelData.ImagePainting.paintImageForEvent.get(event);
    if (typeof paintImageEvent?.args.data.nodeId !== 'undefined') {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Trace.Types.Events.isDrawLazyPixelRef(event) && event.args?.LazyPixelRef) {
    const paintImageEvent = modelData.ImagePainting.paintImageByDrawLazyPixelRef.get(event.args.LazyPixelRef);
    if (typeof paintImageEvent?.args.data.nodeId !== 'undefined') {
      foundIds.add(paintImageEvent.args.data.nodeId);
    }
  } else if (Trace.Types.Events.isParseMetaViewport(event) && typeof event.args?.data.node_id !== 'undefined') {
    foundIds.add(event.args.data.node_id);
  }
  nodeIdsForEventCache.set(event, foundIds);
  return foundIds;
}

/**
 * Looks up for backend node ids in different types of trace events
 * and resolves them into related DOM nodes.
 * This method is cached for the given event.
 */
export async function relatedDOMNodesForEvent(
    modelData: Trace.Handlers.Types.ParsedTrace,
    event: Trace.Types.Events.Event): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>|null> {
  const fromCache = domNodesForEventCache.get(event);
  if (fromCache) {
    return fromCache;
  }

  const nodeIds = nodeIdsForEvent(modelData, event);
  if (nodeIds.size) {
    const frame = event.args?.data?.frame as Protocol.Page.FrameId;
    const result = await domNodesForBackendIds(frame, nodeIds);
    domNodesForEventCache.set(event, result);
    return result;
  }

  return null;
}

/**
 * Takes a set of Protocol.DOM.BackendNodeId ids and will return a map of NodeId=>DOMNode.
 */
export async function domNodesForBackendIds(frameId: Protocol.Page.FrameId, nodeIds: Set<Protocol.DOM.BackendNodeId>):
    Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>> {
  const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  const resourceTreeModel = target?.model(SDK.ResourceTreeModel.ResourceTreeModel);
  if (!domModel || !resourceTreeModel) {
    return new Map();
  }

  // The node is only relevant if the target contains the specified frame.
  // For now, allow events that specify no frame id to continue to resolve a node.
  if (frameId && !resourceTreeModel.frames().some(frame => frame.id === frameId)) {
    return new Map();
  }

  return await domModel.pushNodesByBackendIdsToFrontend(nodeIds) || new Map();
}
