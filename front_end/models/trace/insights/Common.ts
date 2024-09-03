// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type NavigationInsightContext} from './types.js';

/**
 * Finds a network request given a navigation context and URL.
 * Considers redirects.
 */
export function findRequest(
    traceData: Pick<Handlers.Types.TraceParseData, 'Meta'|'NetworkRequests'>, context: NavigationInsightContext,
    url: string): Types.TraceEvents.SyntheticNetworkRequest|null {
  const request = traceData.NetworkRequests.byTime.find(req => {
    const urlMatch = req.args.data.url === url || req.args.data.redirects.some(r => r.url === url);
    if (!urlMatch) {
      return false;
    }

    const nav = Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, traceData.Meta.navigationsByFrameId);
    return nav === context.navigation;
  });
  return request ?? null;
}

export function findLCPRequest(
    traceData: Pick<Handlers.Types.TraceParseData, 'Meta'|'NetworkRequests'|'LargestImagePaint'>,
    context: NavigationInsightContext, lcpEvent: Types.TraceEvents.TraceEventLargestContentfulPaintCandidate):
    Types.TraceEvents.SyntheticNetworkRequest|null {
  const lcpNodeId = lcpEvent.args.data?.nodeId;
  if (!lcpNodeId) {
    throw new Error('no lcp node id');
  }

  const imagePaint = traceData.LargestImagePaint.get(lcpNodeId);
  if (!imagePaint) {
    return null;
  }

  const lcpUrl = imagePaint.args.data?.imageUrl;
  if (!lcpUrl) {
    throw new Error('no lcp url');
  }
  const lcpRequest = findRequest(traceData, context, lcpUrl);

  if (!lcpRequest) {
    throw new Error('no lcp request found');
  }

  return lcpRequest;
}
