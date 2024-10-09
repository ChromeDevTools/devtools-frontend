// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type InsightResult, type InsightSetContext, type RequiredData} from './types.js';

export function deps(): ['Meta', 'NetworkRequests', 'LayoutShifts'] {
  return ['Meta', 'NetworkRequests', 'LayoutShifts'];
}

export type FontDisplayResult = InsightResult<{
  fonts: Array<{
    request: Types.Events.SyntheticNetworkRequest,
    display: string,
    wastedTime: Types.Timing.MilliSeconds,
  }>,
}>;

export function generateInsight(parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): FontDisplayResult {
  const fonts = [];
  for (const event of parsedTrace.LayoutShifts.beginRemoteFontLoadEvents) {
    if (!Helpers.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }

    const requestId = `${event.pid}.${event.args.id}`;
    const request = parsedTrace.NetworkRequests.byId.get(requestId);
    if (!request) {
      continue;
    }

    const display = event.args.display;
    let wastedTime = Types.Timing.MilliSeconds(0);

    if (/^(block|fallback|auto)$/.test(display)) {
      const wastedTimeMicro = Types.Timing.MicroSeconds(
          request.args.data.syntheticData.finishTime - request.args.data.syntheticData.sendStartTime);
      // TODO(crbug.com/352244504): should really end at the time of the next Commit trace event.
      wastedTime = Platform.NumberUtilities.floor(Helpers.Timing.microSecondsToMilliseconds(wastedTimeMicro), 1 / 5) as
          Types.Timing.MilliSeconds;
      // All browsers wait for no more than 3s.
      wastedTime = Math.min(wastedTime, 3000) as Types.Timing.MilliSeconds;
    }

    fonts.push({
      request,
      display,
      wastedTime,
    });
  }

  fonts.sort((a, b) => b.wastedTime - a.wastedTime);

  const savings = Math.max(...fonts.map(f => f.wastedTime)) as Types.Timing.MilliSeconds;

  return {
    relatedEvents: fonts.map(f => f.request),
    fonts,
    metricSavings: {FCP: savings},
  };
}
