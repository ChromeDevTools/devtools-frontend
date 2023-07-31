// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {type TraceEventHandlerName, HandlerState} from './types.js';

import {data as metaHandlerData} from './MetaHandler.js';
import * as Helpers from '../helpers/helpers.js';

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
  changePriority?: Types.TraceEvents.TraceEventResourceChangePriority;
  willSendRequests?: Types.TraceEvents.TraceEventResourceWillSendRequest[];
  sendRequests?: Types.TraceEvents.TraceEventResourceSendRequest[];
  receiveResponse?: Types.TraceEvents.TraceEventResourceReceiveResponse;
  resourceFinish?: Types.TraceEvents.TraceEventResourceFinish;
  receivedData?: Types.TraceEvents.TraceEventResourceReceivedData[];
  resourceMarkAsCached?: Types.TraceEvents.TraceEventResourceMarkAsCached;
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

  handlerState = HandlerState.UNINITIALIZED;
}

export function initialize(): void {
  handlerState = HandlerState.INITIALIZED;
}

export function handleEvent(event: Types.TraceEvents.TraceEventData): void {
  if (handlerState !== HandlerState.INITIALIZED) {
    throw new Error('Network Request handler is not initialized');
  }

  if (Types.TraceEvents.isTraceEventResourceChangePriority(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'changePriority', event);
    return;
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

  if (Types.TraceEvents.isTraceEventResourceMarkAsCached(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'resourceMarkAsCached', event);
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
    // In the case of sub-resources, however, e.g., example.com/foo.js we will
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
        requestMethod: sendRequest.args.data.requestMethod,
        ts,
        dur,
      });
    }

    // If a ResourceFinish event with an encoded data length is received,
    // then the resource was not cached; it was fetched before it was
    // requested, e.g. because it was pushed in this navigation.
    const isPushedResource = request.resourceFinish?.args.data.encodedDataLength !== 0;
    // This works around crbug.com/998397, which reports pushed resources, and resources served by a service worker as disk cached.
    const isDiskCached = request.receiveResponse.args.data.fromCache &&
        !request.receiveResponse.args.data.fromServiceWorker && !isPushedResource;
    // If the request contains a resourceMarkAsCached event, it was served from memory cache.
    const isMemoryCached = request.resourceMarkAsCached !== undefined;

    // The timing data returned is from the original (uncached) request, which
    // means that if we leave the above network record data as-is when the
    // request came from either the disk cache or memory cache, our calculations
    // will be incorrect.
    //
    // Here we add a flag so when we calculate the timestamps of the various
    // events, we can overwrite them.
    // These timestamps may not be perfect (indeed they don't always match
    // the Network CDP domain exactly, which is likely an artifact of the way
    // the data is routed on the backend), but they're the closest we have.
    const isCached = isMemoryCached || isDiskCached;

    const timing = request.receiveResponse.args.data.timing;
    // If a non-cached request has no |timing| indicates data URLs, we ignore it.
    if (!timing && !isCached) {
      continue;
    }

    const firstSendRequest = request.sendRequests[0];
    const finalSendRequest = request.sendRequests[request.sendRequests.length - 1];

    const initialPriority = finalSendRequest.args.data.priority;
    let finalPriority = initialPriority;
    if (request.changePriority) {
      finalPriority = request.changePriority.args.data.priority;
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

    // Finish time and end time
    // =======================
    // The finish time and the end time are subtly different.
    //  - Finish time: records the point at which the network stack stopped receiving the data
    //  - End time: the timestamp of the finish event itself (if one exists)
    //
    // The end time, then, will be slightly after the finish time.
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish?.args.data.finishTime ?
        Types.Timing.MicroSeconds(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) :
        Types.Timing.MicroSeconds(endTime);

    // Network duration
    // =======================
    // Time spent on the network.
    const networkDuration = isCached ? Types.Timing.MicroSeconds(0) :
                                       Types.Timing.MicroSeconds((finishTime || endRedirectTime) - endRedirectTime);

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
    const queueing = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds(Platform.NumberUtilities.clamp(
            (timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime), 0, Number.MAX_VALUE));

    // Stalled
    // =======================
    // If the request is cached, the amount of time stalled is the time between the start time and
    // receiving a response.
    // Otherwise it is whichever positive number comes first from the following timing info:
    // DNS start, Connection start, Send Start, or the time duration between our start time and
    // receiving a response.
    const stalled = isCached ? Types.Timing.MicroSeconds(request.receiveResponse.ts - startTime) :
                               Types.Timing.MicroSeconds(firstPositiveValueInList([
                                 timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
                                 timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
                                 timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
                                 (request.receiveResponse.ts - endRedirectTime),
                               ]));

    // Sending HTTP request
    // =======================
    // Time when the HTTP request is sent.
    const sendStartTime = isCached ?
        startTime :
        Types.Timing.MicroSeconds(
            timing.requestTime * SECONDS_TO_MICROSECONDS + timing.sendStart * MILLISECONDS_TO_MICROSECONDS);

    // Waiting
    // =======================
    // Time from when the send finished going to when the headers were received.
    const waiting = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS);

    // Download
    // =======================
    // Time from receipt of headers to the finish time.
    const downloadStart = isCached ?
        startTime :
        Types.Timing.MicroSeconds(
            timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS);
    const download = isCached ? Types.Timing.MicroSeconds(endTime - request.receiveResponse.ts) :
                                Types.Timing.MicroSeconds(((finishTime || downloadStart) - downloadStart));

    const totalTime = Types.Timing.MicroSeconds(networkDuration + processingDuration);

    // Collect a few values from the timing info.
    // If the Network request is cached, we zero out them.
    const dnsLookup = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS);
    const ssl = isCached ? Types.Timing.MicroSeconds(0) :
                           Types.Timing.MicroSeconds((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS);
    const proxyNegotiation = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS);
    const requestSent = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS);
    const initialConnection = isCached ?
        Types.Timing.MicroSeconds(0) :
        Types.Timing.MicroSeconds((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS);

    // Finally get some of the general data from the trace events.
    const {frame, url, renderBlocking} = finalSendRequest.args.data;
    const {encodedDataLength, decodedBodyLength} =
        request.resourceFinish ? request.resourceFinish.args.data : {encodedDataLength: 0, decodedBodyLength: 0};
    const {host, protocol, pathname, search} = new URL(url);
    const isHttps = protocol === 'https:';
    const requestingFrameUrl =
        Helpers.Trace.activeURLForFrameAtTime(frame, finalSendRequest.ts, rendererProcessesByFrame) || '';

    // Construct a synthetic trace event for this network request.
    const networkEvent: Types.TraceEvents.TraceEventSyntheticNetworkRequest = {
      args: {
        data: {
          // All data we create from trace events should be added to |syntheticData|.
          syntheticData: {
            dnsLookup,
            download,
            downloadStart,
            finishTime,
            initialConnection,
            isDiskCached,
            isHttps,
            isMemoryCached,
            isPushedResource,
            networkDuration,
            processingDuration,
            proxyNegotiation,
            queueing,
            redirectionDuration,
            requestSent,
            sendStartTime,
            ssl,
            stalled,
            totalTime,
            waiting,
          },
          // All fields below are from TraceEventsForNetworkRequest.
          decodedBodyLength,
          encodedDataLength,
          frame,
          fromServiceWorker: request.receiveResponse.args.data.fromServiceWorker,
          host,
          mimeType: request.receiveResponse.args.data.mimeType,
          pathname,
          priority: finalPriority,
          initialPriority,
          protocol,
          redirects,
          // In the event the property isn't set, assume non-blocking.
          renderBlocking: renderBlocking ? renderBlocking : 'non_blocking',
          requestId,
          requestingFrameUrl,
          requestMethod: finalSendRequest.args.data.requestMethod,
          search,
          statusCode: request.receiveResponse.args.data.statusCode,
          stackTrace: finalSendRequest.args.data.stackTrace,
          timing,
          url,
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
