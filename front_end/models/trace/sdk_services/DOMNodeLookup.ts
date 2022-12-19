// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as SDK from '../../../core/sdk/sdk.js';

const singleNodeCache =
    new Map<Handlers.Types.TraceParseData, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
const batchNodesCache = new Map<
    Handlers.Types.TraceParseData,
    Map<Set<Protocol.DOM.BackendNodeId>, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>>();

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _TEST_clearCache(): void {
  singleNodeCache.clear();
  batchNodesCache.clear();
}

/**
 * Looks up the DOM Node on the page for the given BackendNodeId. Uses the
 * provided TraceParseData as the cache and will cache the result after the
 * first lookup.
 */
export async function forNodeId(
    modelData: Handlers.Types.TraceParseData, nodeId: Protocol.DOM.BackendNodeId): Promise<SDK.DOMModel.DOMNode|null> {
  const fromCache = singleNodeCache.get(modelData)?.get(nodeId);
  if (fromCache !== undefined) {
    return fromCache;
  }

  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return null;
  }

  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([nodeId]));
  const result = domNodesMap?.get(nodeId) || null;

  const cacheForModel =
      singleNodeCache.get(modelData) || new Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>();
  cacheForModel.set(nodeId, result);
  singleNodeCache.set(modelData, cacheForModel);

  return result;
}

/**
 * Takes a set of Protocol.DOM.BackendNodeId ids and will return a map of NodeId=>DOMNode.
 * Results are cached based on 1) the provided TraceParseData and 2) the provided set of IDs.
 */
export async function forMultipleNodeIds(
    modelData: Handlers.Types.TraceParseData,
    nodeIds: Set<Protocol.DOM.BackendNodeId>): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>> {
  const fromCache = batchNodesCache.get(modelData)?.get(nodeIds);
  if (fromCache) {
    return fromCache;
  }
  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
  const domModel = target?.model(SDK.DOMModel.DOMModel);
  if (!domModel) {
    return new Map();
  }

  const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(nodeIds) || new Map();

  const cacheForModel = batchNodesCache.get(modelData) ||
      new Map<Set<Protocol.DOM.BackendNodeId>, Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode|null>>();
  cacheForModel.set(nodeIds, domNodesMap);
  batchNodesCache.set(modelData, cacheForModel);

  return domNodesMap;
}
