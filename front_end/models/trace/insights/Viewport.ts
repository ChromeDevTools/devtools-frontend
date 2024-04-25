// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';

import {type InsightResult, InsightWarning, type NavigationInsightContext, type RequiredData} from './types.js';

export function deps(): ['Meta', 'UserInteractions'] {
  return ['Meta', 'UserInteractions'];
}

export function generateInsight(traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext):
    InsightResult<{mobileOptimized: boolean | null}> {
  const events = traceParsedData.UserInteractions.beginCommitCompositorFrameEvents.filter(event => {
    if (event.args.frame !== context.frameId) {
      return false;
    }

    const navigation =
        Helpers.Trace.getNavigationForTraceEvent(event, context.frameId, traceParsedData.Meta.navigationsByFrameId);
    if (navigation?.args.data?.navigationId !== context.navigationId) {
      return false;
    }

    return true;
  });

  if (!events.length) {
    // Trace doesn't have the data we need.
    return {
      mobileOptimized: null,
      warnings: [InsightWarning.NO_LAYOUT],
    };
  }

  // Returns true only if all events are mobile optimized.
  for (const event of events) {
    if (!event.args.is_mobile_optimized) {
      return {
        mobileOptimized: false,
      };
    }
  }

  return {
    mobileOptimized: true,
  };
}
