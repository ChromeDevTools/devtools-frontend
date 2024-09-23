// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type InsightResults, type InsightSetContextWithNavigation, type TraceInsightSets} from './types.js';

export function getInsight<InsightName extends keyof InsightResults>(
    insightName: InsightName, insights: TraceInsightSets|null, key: string|null): InsightResults[InsightName]|null {
  if (!insights || !key) {
    return null;
  }

  const insightSets = insights.get(key);
  if (!insightSets) {
    return null;
  }

  const insight = insightSets.data[insightName];
  if (insight instanceof Error) {
    return null;
  }

  // For some reason typescript won't narrow the type by removing Error, so do it manually.
  return insight as InsightResults[InsightName];
}

/**
 * Finds a network request given a navigation context and URL.
 * Considers redirects.
 */
export function findRequest(
    parsedTrace: Pick<Handlers.Types.ParsedTrace, 'Meta'|'NetworkRequests'>, context: InsightSetContextWithNavigation,
    url: string): Types.Events.SyntheticNetworkRequest|null {
  const request = parsedTrace.NetworkRequests.byTime.find(req => {
    const urlMatch = req.args.data.url === url || req.args.data.redirects.some(r => r.url === url);
    if (!urlMatch) {
      return false;
    }

    const nav = Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, parsedTrace.Meta.navigationsByFrameId);
    return nav === context.navigation;
  });
  return request ?? null;
}

export function findLCPRequest(
    parsedTrace: Pick<Handlers.Types.ParsedTrace, 'Meta'|'NetworkRequests'|'LargestImagePaint'>,
    context: InsightSetContextWithNavigation,
    lcpEvent: Types.Events.LargestContentfulPaintCandidate): Types.Events.SyntheticNetworkRequest|null {
  const lcpNodeId = lcpEvent.args.data?.nodeId;
  if (!lcpNodeId) {
    throw new Error('no lcp node id');
  }

  const imagePaint = parsedTrace.LargestImagePaint.get(lcpNodeId);
  if (!imagePaint) {
    return null;
  }

  const lcpUrl = imagePaint.args.data?.imageUrl;
  if (!lcpUrl) {
    throw new Error('no lcp url');
  }
  const lcpRequest = findRequest(parsedTrace, context, lcpUrl);

  if (!lcpRequest) {
    throw new Error('no lcp request found');
  }

  return lcpRequest;
}
