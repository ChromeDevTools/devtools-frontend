// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type NavigationInsightContext, type RequiredData} from './types.js';

export function deps(): ['NetworkRequests', 'Meta'] {
  return ['NetworkRequests', 'Meta'];
}

export function generateInsight(traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext):
    {renderBlockingRequests: Types.TraceEvents.SyntheticNetworkRequest[]} {
  const renderBlockingRequests = [];
  for (const req of traceParsedData.NetworkRequests.byTime) {
    if (req.args.data.frame !== context.frameId) {
      continue;
    }

    const navigation =
        Helpers.Trace.getNavigationForTraceEvent(req, context.frameId, traceParsedData.Meta.navigationsByFrameId);
    if (navigation?.args.data?.navigationId !== context.navigationId) {
      continue;
    }

    if (req.args.data.renderBlocking !== 'blocking') {
      continue;
    }

    renderBlockingRequests.push(req);
  }

  return {
    renderBlockingRequests,
  };
}
