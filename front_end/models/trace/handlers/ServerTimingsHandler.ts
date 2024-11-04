// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {data as networkData} from './NetworkRequestsHandler.js';
import type {HandlerName} from './types.js';

const serverTimings: Types.Events.SyntheticServerTiming[] = [];

export function reset(): void {
  serverTimings.length = 0;
}

export function handleEvent(_event: Types.Events.Event): void {
  // Implementation not needed because data is sourced from NetworkRequestsHandler
}

export async function finalize(): Promise<void> {
  extractServerTimings();
  Helpers.Trace.sortTraceEventsInPlace(serverTimings);
}

const RESPONSE_START_METRIC_NAME = 'response-start';
const RESPONSE_END_METRIC_NAME = 'response-end';

/**
 * Creates synthetic trace events based on server timings in the
 * `Server-Timing` response header. A non-standard `start` param is
 * expected on each metric that contains the start time of the timing
 * based on the server clock.
 *
 * In order to estimate the offset between the server and client clocks,
 * we look for the non-standard `response-start` and `response-end`
 * metrics in the response header, which contain the start and end
 * timestamps of the network request processing in the server. We
 * compare these with the times the request was sent and received in the
 * client to estimate the offset between the client and the server
 * clocks.
 *
 * With this offset estimation at hand, we can map timestamps from the
 * server clock to the tracing clock and locate the timings in the
 * performance timeline.
 */
function extractServerTimings(): void {
  for (const networkEvent of networkData().byTime) {
    let timingsInRequest: Platform.ServerTiming.ServerTiming[]|null = null;
    for (const header of networkEvent.args.data.responseHeaders) {
      const headerName = header.name.toLocaleLowerCase();
      // Some popular hosting providers like vercel or render get rid of
      // Server-Timing headers added by users, so as a workaround we
      // also support server timing headers with the `-test` suffix
      // while this feature is experimental, to enable easier trials.
      if (headerName === 'server-timing' || headerName === 'server-timing-test') {
        header.name = 'server-timing';
        timingsInRequest = Platform.ServerTiming.ServerTiming.parseHeaders([header]);
        continue;
      }
    }
    const serverStart = timingsInRequest?.find(timing => timing.metric === RESPONSE_START_METRIC_NAME)?.start;
    const serverEnd = timingsInRequest?.find(timing => timing.metric === RESPONSE_END_METRIC_NAME)?.start;
    if (!serverStart || !serverEnd || !timingsInRequest) {
      continue;
    }

    const serverStartInMicro = serverStart * 1_000;
    const serverEndInMicro = serverEnd * 1_000;
    serverTimings.push(
        ...createSyntheticServerTiming(networkEvent, serverStartInMicro, serverEndInMicro, timingsInRequest));
  }
}
function createSyntheticServerTiming(
    request: Types.Events.SyntheticNetworkRequest, serverStart: number, serverEnd: number,
    timingsInRequest: Platform.ServerTiming.ServerTiming[]): Types.Events.SyntheticServerTiming[] {
  const clientStart = request.args.data.syntheticData.sendStartTime;
  const clientEndTime = request.args.data.syntheticData.sendStartTime + request.args.data.syntheticData.waiting;
  const offset = Types.Timing.MicroSeconds((serverStart - clientStart + serverEnd - clientEndTime) / 2);
  const convertedServerTimings: Types.Events.SyntheticServerTiming[] = [];
  for (const timing of timingsInRequest) {
    if (timing.metric === RESPONSE_START_METRIC_NAME || timing.metric === RESPONSE_END_METRIC_NAME) {
      continue;
    }
    if (timing.start === null) {
      continue;
    }
    const convertedTimestamp =
        Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(timing.start)) - offset;
    const parsedUrl = new URL(request.args.data.url);
    const origin = parsedUrl.origin;

    const serverTiming = Helpers.SyntheticEvents.SyntheticEventsManager.registerServerTiming({
      rawSourceEvent: request.rawSourceEvent,
      name: timing.metric,
      ph: Types.Events.Phase.COMPLETE,
      pid: Types.Events.ProcessID(0),
      tid: Types.Events.ThreadID(0),
      ts: Types.Timing.MicroSeconds(convertedTimestamp),
      dur: Helpers.Timing.millisecondsToMicroseconds(Types.Timing.MilliSeconds(timing.value)),
      cat: 'devtools.server-timing',
      args: {data: {desc: timing.description || undefined, origin}},
    });

    if (!request.args.data.syntheticServerTimings) {
      request.args.data.syntheticServerTimings = [];
    }
    request.args.data.syntheticServerTimings.push(serverTiming);
    convertedServerTimings.push(serverTiming);
  }
  return convertedServerTimings;
}

export function data(): {serverTimings: Types.Events.SyntheticServerTiming[]} {
  return {
    serverTimings,
  };
}

export function deps(): HandlerName[] {
  return ['NetworkRequests'];
}
