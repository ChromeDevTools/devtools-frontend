// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type InsightResult, type InsightSetContext, InsightWarning, type RequiredData} from './types.js';

export function deps(): ['Meta', 'UserInteractions'] {
  return ['Meta', 'UserInteractions'];
}

export type ViewportInsightResult = InsightResult<{
  mobileOptimized: boolean | null,
  viewportEvent?: Types.Events.ParseMetaViewport,
}>;

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): ViewportInsightResult {
  const compositorEvents = parsedTrace.UserInteractions.beginCommitCompositorFrameEvents.filter(event => {
    if (event.args.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  if (!compositorEvents.length) {
    // Trace doesn't have the data we need.
    return {
      mobileOptimized: null,
      warnings: [InsightWarning.NO_LAYOUT],
    };
  }

  const viewportEvent = parsedTrace.UserInteractions.parseMetaViewportEvents.find(event => {
    if (event.args.data.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  // Returns true only if all events are mobile optimized.
  for (const event of compositorEvents) {
    if (!event.args.is_mobile_optimized) {
      return {
        mobileOptimized: false,
        viewportEvent,
        metricSavings: {INP: 300 as Types.Timing.MilliSeconds},
      };
    }
  }

  return {
    mobileOptimized: true,
    viewportEvent,
  };
}
