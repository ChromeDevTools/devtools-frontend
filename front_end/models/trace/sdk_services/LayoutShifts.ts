// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Handlers from '../handlers/handlers.js';
import type * as Types from '../types/types.js';
import * as SDK from '../../../core/sdk/sdk.js';

import {forNodeId} from './DOMNodeLookup.js';

const layoutShiftSourcesCache = new Map<
    Handlers.Types.TraceParseData,
    Map<Types.TraceEvents.TraceEventLayoutShift, readonly Handlers.ModelHandlers.LayoutShifts.LayoutShiftSource[]>>();

const normalizedNodesCache = new Map<
    Handlers.Types.TraceParseData,
    Map<Types.TraceEvents.TraceEventLayoutShift, readonly Types.TraceEvents.TraceImpactedNode[]>>();

// eslint-disable-next-line @typescript-eslint/naming-convention
export function _TEST_clearCache(): void {
  layoutShiftSourcesCache.clear();
  normalizedNodesCache.clear();
}

export async function sourcesForLayoutShift(
    modelData: Handlers.Types.TraceParseData, event: Types.TraceEvents.TraceEventLayoutShift):
    Promise<readonly Handlers.ModelHandlers.LayoutShifts.LayoutShiftSource[]> {
  const fromCache = layoutShiftSourcesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }
  const sources: Handlers.ModelHandlers.LayoutShifts.LayoutShiftSource[] = [];
  await Promise.all(impactedNodes.map(async node => {
    const domNode = await forNodeId(modelData, node.node_id);
    if (domNode) {
      sources.push({
        previousRect: new DOMRect(node.old_rect[0], node.old_rect[1], node.old_rect[2], node.old_rect[3]),
        currentRect: new DOMRect(node.new_rect[0], node.new_rect[1], node.new_rect[2], node.new_rect[3]),
        node: domNode,
      });
    }
  }));
  const cacheForModel = layoutShiftSourcesCache.get(modelData) ||
      new Map<Types.TraceEvents.TraceEventLayoutShift, Handlers.ModelHandlers.LayoutShifts.LayoutShiftSource[]>();
  cacheForModel.set(event, sources);
  layoutShiftSourcesCache.set(modelData, cacheForModel);
  return sources;
}

/**
 * The Layout Instability API in Blink, which reports the LayoutShift trace
 * events, is not based on CSS pixels but physical pixels. As such the values
 * in the impacted_nodes field need to be normalized to CSS units in order
 * to map them to the viewport dimensions, which we get in CSS pixels. That's
 * what this function does.
 * See https://crbug.com/1300309
 */
export async function normalizedImpactedNodesForLayoutShift(
    modelData: Handlers.Types.TraceParseData,
    event: Types.TraceEvents.TraceEventLayoutShift): Promise<readonly Types.TraceEvents.TraceImpactedNode[]> {
  const fromCache = normalizedNodesCache.get(modelData)?.get(event);
  if (fromCache) {
    return fromCache;
  }
  const impactedNodes = event.args?.data?.impacted_nodes;
  if (!impactedNodes) {
    return [];
  }

  let viewportScale: number|null = null;
  const target = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
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

  const cacheForModel = normalizedNodesCache.get(modelData) ||
      new Map<Types.TraceEvents.TraceEventLayoutShift, readonly Types.TraceEvents.TraceImpactedNode[]>();
  cacheForModel.set(event, normalizedNodes);
  normalizedNodesCache.set(modelData, cacheForModel);

  return normalizedNodes;
}
