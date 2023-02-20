// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {type TraceEventHandlerName, HandlerState} from './types.js';

import {data as metaHandlerData} from './MetaHandler.js';

import * as Types from '../types/types.js';

const MILLISECONDS_TO_MICROSECONDS = 1000;
const SECONDS_TO_MICROSECONDS = 1000000;

// Network requests from traces are actually formed of 5 trace records.
// This handler tracks all trace records based on the request ID, and
// then creates a new synthetic trace event for those network requests.
//
// This interface, then, defines the shape of the object we intend to
// keep for each request in the trace. In the finalize we will convert
// these 5 types of trace records to a synthetic complete event that
// represents a composite of these trace records.
interface TraceEventsForNetworkRequest {
  willSendRequests?: Types.TraceEvents.TraceEventResourceWillSendRequest[];
  sendRequests?: Types.TraceEvents.TraceEventResourceSendRequest[];
  receiveResponse?: Types.TraceEvents.TraceEventResourceReceiveResponse;
  resourceFinish?: Types.TraceEvents.TraceEventResourceFinish;
  receivedData?: Types.TraceEvents.TraceEventResourceReceivedData[];
}

interface NetworkRequestData {
  byOrigin: Map<string, {
    renderBlocking: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
    nonRenderBlocking: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
    all: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
  }>;
  byTime: Types.TraceEvents.TraceEventSyntheticNetworkRequest[];
}

const requestMap = new Map<string, TraceEventsForNetworkRequest>();
const requestsByOrigin = new Map<string, {
  renderBlocking: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
  nonRenderBlocking: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
  all: Types.TraceEvents.TraceEventSyntheticNetworkRequest[],
}>();
const requestsByTime: Types.TraceEvents.TraceEventSyntheticNetworkRequest[] = [];

function storeTraceEventWithRequestId<K extends keyof TraceEventsForNetworkRequest>(
    requestId: string, key: K, value: TraceEventsForNetworkRequest[K]): void {
  if (!requestMap.has(requestId)) {
    requestMap.set(requestId, {});
  }

  const traceEvents = requestMap.get(requestId);
  if (!traceEvents) {
    throw new Error(`Unable to locate trace events for request ID ${requestId}`);
  }

  if (Array.isArray(traceEvents[key])) {
    const target = traceEvents[key] as Types.TraceEvents.TraceEventData[];
    const values = value as Types.TraceEvents.TraceEventData[];
    target.push(...values);
  } else {
    traceEvents[key] = value;
  }
}

function firstPositiveValueInList(entries: number[]): number {
  for (const entry of entries) {
    if (entry > 0) {
      return entry;
    }
  }

  // In the event we don't find a positive value, we return 0 so as to
  // be a mathematical noop. It's typically not correct to return – say –
  // a -1 here because it would affect the calculation of stats below.
  return 0;
}

let handlerState = HandlerState.UNINITIALIZED;

export function reset(): void {
  requestsByOrigin.clear();
  requestMap.clear();
  requestsByTime.length = 0;

  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Network Request handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventResourceWillSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'willSendRequests', [event]);
    return;
  }

  if (Types.TraceEvents.isTraceEventResourceSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'sendRequests', [event]);
    return;
  }

  if (Types.TraceEvents.isTraceEventResourceReceiveResponse(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'receiveResponse', event);
    return;
  }

  if (Types.TraceEvents.isTraceEventResourceReceivedData(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'receivedData', [event]);
    return;
  }

  if (Types.TraceEvents.isTraceEventResourceFinish(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'resourceFinish', event);
    return;
  }
}

export async function finalize(): Promise<void> {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Network Request handler is not initialized');
  }

  const {rendererProcessesByFrame} = metaHandlerData();
  for (const [requestId, request] of requestMap.entries()) {
    // If we have an incomplete set of events here, we choose to drop the network
    // request rather than attempt to synthesize the missing data.
    if (!request.sendRequests || !request.receiveResponse) {
      continue;
    }

    // In the data we may get multiple willSendRequests and sendRequests, which
    // will indicate that there are redirects for a given (sub)resource. In the
    // case of a navigation, e.g., example.com/ we will get willSendRequests,
    // and we should use these to calculate time spent in redirects.
    // In the case of subresources, however, e.g., example.com/foo.js we will
    // *only* get sendRequests, and we use these instead of willSendRequests
    // to detect the time in redirects. We always use the sendRequest for the
    // url, priority etc since it contains those values, but we use the
    // willSendRequest (if it exists) to calculate the timestamp and durations
    // of redirects.
    const redirects: Types.TraceEvents.TraceEventSyntheticNetworkRedirect[] = [];
    for (let i = 0; i < request.sendRequests.length - 1; i++) {
      const sendRequest = request.sendRequests[i];
      const nextSendRequest = request.sendRequests[i + 1];

      // Use the willSendRequests as the source for redirects if possible.
      // We default to those of the sendRequests, however, since willSendRequest
      // is not guaranteed to be present in the data for every request.
      let ts = sendRequest.ts;
      let dur = Types.Timing.MicroSeconds(nextSendRequest.ts - sendRequest.ts);
      if (request.willSendRequests && request.willSendRequests[i] && request.willSendRequests[i + 1]) {
        const willSendRequest = request.willSendRequests[i];
        const nextWillSendRequest = request.willSendRequests[i + 1];
        ts = willSendRequest.ts;
        dur = Types.Timing.MicroSeconds(nextWillSendRequest.ts - willSendRequest.ts);
      }

      redirects.push({
        url: sendRequest.args.data.url,
        priority: sendRequest.args.data.priority,
        ts,
        dur,
      });
    }

    const firstSendRequest = request.sendRequests[0];
    const finalSendRequest = request.sendRequests[request.sendRequests.length - 1];
    const {timing} = request.receiveResponse.args.data;
    // No timing indicates data URLs, which we ignore.
    if (!timing) {
      continue;
    }

    // Start time
    // =======================
    // The time where the request started, which is either the first willSendRequest
    // event if there is one, or, if there is not, the sendRequest.
    const startTime = (request.willSendRequests && request.willSendRequests.length) ?
        Types.Timing.MicroSeconds(request.willSendRequests[0].ts) :
        Types.Timing.MicroSeconds(firstSendRequest.ts);

    // End redirect time
    // =======================
    // It's possible that when we start requesting data we will receive redirections.
    // Here we note the time of the *last* willSendRequest / sendRequest event,
    // which is used later on in the calculations for time queueing etc.
    const endRedirectTime = (request.willSendRequests && request.willSendRequests.length) ?
        Types.Timing.MicroSeconds(request.willSendRequests[request.willSendRequests.length - 1].ts) :
        Types.Timing.MicroSeconds(finalSendRequest.ts);

    // Finsh time and end time
    // =======================
    // The finish time and the end time are subtly different.
    //  - Finish time: records the point at which the network stack stopped receiving the data
    //  - End time: the timestamp of the finish event itself (if one exists)
    //
    // The end time, then, will be slightly after the finish time.
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish ?
        Types.Timing.MicroSeconds(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) :
        Types.Timing.MicroSeconds(endTime);

    // Network duration
    // =======================
    // Time spent on the network.
    const networkDuration = Types.Timing.MicroSeconds((finishTime || endRedirectTime) - endRedirectTime);

    // Processing duration
    // =======================
    // Time spent from start to end.
    const processingDuration = Types.Timing.MicroSeconds(endTime - (finishTime || endTime));

    // Redirection duration
    // =======================
    // Time between the first willSendRequest / sendRequest and last. This we place in *front* of the
    // queueing, since the queueing time that we know about from the trace data is only the last request,
    // i.e., the one that occurs after all the redirects.
    const redirectionDuration = Types.Timing.MicroSeconds(endRedirectTime - startTime);

    // Queueing
    // =======================
    // The amount of time queueing is the time between the request's start time to the requestTime
    // arg recorded in the receiveResponse event. In the cases where the recorded start time is larger
    // that the requestTime we set queueing time to zero.
    const queueing = Types.Timing.MicroSeconds(Platform.NumberUtilities.clamp(
        (timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime), 0, Number.MAX_VALUE));

    // Stalled
    // =======================
    // The amount of time stalled is whichever positive number comes first from the
    // following timing info: DNS start, Connection start, Send Start, or the time duration
    // between our start time and receiving a response.
    const stalled = Types.Timing.MicroSeconds(firstPositiveValueInList([
      timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
      timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
      timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
      (request.receiveResponse.ts - endRedirectTime),
    ]));

    // Waiting
    // =======================
    // Time from when the send finished going to when the headers were received.
    const waiting =
        Types.Timing.MicroSeconds((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS);

    // Download
    // =======================
    // Time from receipt of headers to the finish time.
    const downloadStart = Types.Timing.MicroSeconds(
        timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS);
    const download = Types.Timing.MicroSeconds(((finishTime || downloadStart) - downloadStart));
    const totalTime = Types.Timing.MicroSeconds(networkDuration + processingDuration);

    // Collate a few values from the timing info.
    const dnsLookup = Types.Timing.MicroSeconds((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS);
    const ssl = Types.Timing.MicroSeconds((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS);
    const proxyNegotiation =
        Types.Timing.MicroSeconds((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS);
    const requestSent = Types.Timing.MicroSeconds((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS);
    const initialConnection =
        Types.Timing.MicroSeconds((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS);

    // Finally get some of the general data from the trace events.
    const {priority, frame, url, renderBlocking} = finalSendRequest.args.data;
    const {mimeType, fromCache, fromServiceWorker} = request.receiveResponse.args.data;
    const {encodedDataLength, decodedBodyLength} =
        request.resourceFinish ? request.resourceFinish.args.data : {encodedDataLength: 0, decodedBodyLength: 0};
    const {receiveHeadersEnd, requestTime, sendEnd, sendStart, sslStart} = timing;
    const {host, protocol, pathname, search} = new URL(url);
    const isHttps = protocol === 'https:';
    const renderProcesses = rendererProcessesByFrame.get(frame);
    const processInfo = renderProcesses?.get(finalSendRequest.pid);
    const requestingFrameUrl = processInfo ? processInfo.frame.url : '';

    // Construct a synthetic trace event for this network request.
    const networkEvent: Types.TraceEvents.TraceEventSyntheticNetworkRequest = {
      args: {
        data: {
          decodedBodyLength,
          dnsLookup,
          download,
          encodedDataLength,
          finishTime,
          frame,
          fromCache,
          fromServiceWorker,
          initialConnection,
          host,
          isHttps,
          mimeType,
          networkDuration,
          pathname,
          search,
          priority,
          processingDuration,
          protocol,
          proxyNegotiation,
          redirectionDuration,
          queueing,
          receiveHeadersEnd: Types.Timing.MicroSeconds(receiveHeadersEnd),
          redirects,
          requestId,
          // In the event the property isn't set, assume non-blocking.
          renderBlocking: renderBlocking ? renderBlocking : 'non_blocking',
          requestSent,
          requestTime,
          requestingFrameUrl,
          sendEnd: Types.Timing.MicroSeconds(sendEnd * MILLISECONDS_TO_MICROSECONDS),
          sendStart: Types.Timing.MicroSeconds(sendStart * MILLISECONDS_TO_MICROSECONDS),
          ssl,
          sslStart: Types.Timing.MicroSeconds(sslStart * MILLISECONDS_TO_MICROSECONDS),
          stalled,
          statusCode: request.receiveResponse.args.data.statusCode,
          stackTrace: finalSendRequest.args.data.stackTrace,
          totalTime,
          url,
          waiting,
        },
      },
      cat: 'loading',
      name: 'SyntheticNetworkRequest',
      ph: Types.TraceEvents.Phase.COMPLETE,
      dur: Types.Timing.MicroSeconds(endTime - startTime),
      tdur: Types.Timing.MicroSeconds(endTime - startTime),
      ts: Types.Timing.MicroSeconds(startTime),
      tts: Types.Timing.MicroSeconds(startTime),
      pid: finalSendRequest.pid,
      tid: finalSendRequest.tid,
    };

    // The timing data returned is from the original (uncached) request,
    // which means that if we leave the above network record data as-is
    // when the request came from either the disk cache or memory cache,
    // our calculations will be incorrect.
    //
    // Here we override the request data args based on the timestamps of the
    // various events in the case where the fromCache flag is set to true.
    // These timestamps may not be perfect (indeed they don't always match
    // the Network CDP domain exactly, which is likely an artifact of the way
    // the data is routed on the backend), but they're the closest we have.
    if (networkEvent.args.data.fromCache) {
      // Zero out the network-based timing info.
      networkEvent.args.data.queueing = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.waiting = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.dnsLookup = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.initialConnection = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.ssl = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.requestSent = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.proxyNegotiation = Types.Timing.MicroSeconds(0);
      networkEvent.args.data.networkDuration = Types.Timing.MicroSeconds(0);

      // Update the stalled and download values.
      const endStalled = request.receiveResponse ? request.receiveResponse.ts : startTime;
      networkEvent.args.data.stalled = Types.Timing.MicroSeconds(endStalled - startTime);
      networkEvent.args.data.download = Types.Timing.MicroSeconds(endTime - endStalled);
    }

    const requests = Platform.MapUtilities.getWithDefault(requestsByOrigin, host, () => {
      return {
        renderBlocking: [],
        nonRenderBlocking: [],
        all: [],
      };
    });

    // For ease of rendering we sometimes want to differentiate between
    // render-blocking and non-render-blocking, so we divide the data here.
    if (networkEvent.args.data.renderBlocking === 'non_blocking') {
      requests.nonRenderBlocking.push(networkEvent);
    } else {
      requests.renderBlocking.push(networkEvent);
    }

    // However, there are also times where we just want to loop through all
    // the captured requests, so here we store all of them together.
    requests.all.push(networkEvent);
    requestsByTime.push(networkEvent);
  }

  handlerState = HandlerState.FINALIZED;
}

export function data(): NetworkRequestData {
  if (handlerState !== HandlerState.FINALIZED) {
    throw new Error('Network Request handler is not finalized');
  }

  return {
    byOrigin: new Map(requestsByOrigin),
    byTime: [...requestsByTime],
  };
}

export function deps(): TraceEventHandlerName[] {
  return ['Meta'];
}
