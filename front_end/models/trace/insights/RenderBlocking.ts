// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type InsightResult, InsightWarning, type NavigationInsightContext, type RequiredData} from './types.js';

export function deps(): ['NetworkRequests', 'PageLoadMetrics'] {
  return ['NetworkRequests', 'PageLoadMetrics'];
}

export function generateInsight(traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext):
    InsightResult<{renderBlockingRequests: Types.TraceEvents.SyntheticNetworkRequest[]}> {
  const firstPaintTs = traceParsedData.PageLoadMetrics.metricScoresByFrameId.get(context.frameId)
                           ?.get(context.navigationId)
                           ?.get(Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP)
                           ?.event?.ts;
  if (!firstPaintTs) {
    return {
      renderBlockingRequests: [],
      warnings: [InsightWarning.NO_FP],
    };
  }

  const renderBlockingRequests = [];
  for (const req of traceParsedData.NetworkRequests.byTime) {
    if (req.args.data.frame !== context.frameId) {
      continue;
    }

    if (req.args.data.renderBlocking !== 'blocking' && req.args.data.renderBlocking !== 'in_body_parser_blocking') {
      continue;
    }

    if (req.args.data.syntheticData.finishTime > firstPaintTs) {
      continue;
    }

    // If a resource is marked `in_body_parser_blocking` it should only be considered render blocking if it is a
    // high enough priority. Some resources (e.g. scripts) are not marked as high priority if they are fetched
    // after a non-preloaded image. (See "early" definition in https://web.dev/articles/fetch-priority)
    //
    // There are edge cases and exceptions (e.g. priority hints) but this gives us the best approximation
    // of render blocking resources in the document body.
    if (req.args.data.renderBlocking === 'in_body_parser_blocking') {
      const priority = req.args.data.priority;
      const isScript = req.args.data.resourceType === Protocol.Network.ResourceType.Script;
      const isBlockingScript = isScript && priority === Protocol.Network.ResourcePriority.High;
      if (priority !== Protocol.Network.ResourcePriority.VeryHigh && !isBlockingScript) {
        continue;
      }
    }

    const navigation =
        Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, traceParsedData.Meta.navigationsByFrameId);
    if (navigation?.args.data?.navigationId !== context.navigationId) {
      continue;
    }

    renderBlockingRequests.push(req);
  }

  return {
    renderBlockingRequests,
  };
}
