// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
