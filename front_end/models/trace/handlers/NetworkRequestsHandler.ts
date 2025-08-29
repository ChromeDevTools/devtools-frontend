// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import * as HandlerHelpers from './helpers.js';
import {data as metaHandlerData} from './MetaHandler.js';
import type {HandlerName} from './types.js';

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
export interface TraceEventsForNetworkRequest {
  changePriority?: Types.Events.ResourceChangePriority;
  willSendRequests?: Types.Events.ResourceWillSendRequest[];
  sendRequests?: Types.Events.ResourceSendRequest[];
  receiveResponse?: Types.Events.ResourceReceiveResponse;
  resourceFinish?: Types.Events.ResourceFinish;
  receivedData?: Types.Events.ResourceReceivedData[];
  resourceMarkAsCached?: Types.Events.ResourceMarkAsCached;
}

export interface WebSocketTraceDataForFrame {
  frame: string;
  webSocketIdentifier: number;
  events: Types.Events.WebSocketEvent[];
  syntheticConnection: Types.Events.SyntheticWebSocketConnection|null;
}
export interface WebSocketTraceDataForWorker {
  workerId: string;
  webSocketIdentifier: number;
  events: Types.Events.WebSocketEvent[];
  syntheticConnection: Types.Events.SyntheticWebSocketConnection|null;
}
export type WebSocketTraceData = WebSocketTraceDataForFrame|WebSocketTraceDataForWorker;

const webSocketData = new Map<number, WebSocketTraceData>();
const linkPreconnectEvents: Types.Events.LinkPreconnect[] = [];

interface NetworkRequestData {
  byId: Map<string, Types.Events.SyntheticNetworkRequest>;
  byTime: Types.Events.SyntheticNetworkRequest[];
  eventToInitiator: Map<Types.Events.SyntheticNetworkRequest, Types.Events.SyntheticNetworkRequest>;
  webSocket: WebSocketTraceData[];
  entityMappings: HandlerHelpers.EntityMappings;
  linkPreconnectEvents: Types.Events.LinkPreconnect[];
}

const requestMap = new Map<string, TraceEventsForNetworkRequest>();
const requestsById = new Map<string, Types.Events.SyntheticNetworkRequest>();
const requestsByTime: Types.Events.SyntheticNetworkRequest[] = [];

const networkRequestEventByInitiatorUrl = new Map<string, Types.Events.SyntheticNetworkRequest[]>();
const eventToInitiatorMap = new Map<Types.Events.SyntheticNetworkRequest, Types.Events.SyntheticNetworkRequest>();

/**
 * These are to store ThirdParty data relationships between entities and events. To reduce iterating through data
 * more than we have to, here we start building the caches. After this, the RendererHandler will update
 * the relationships. When handling ThirdParty references, use the one in the RendererHandler instead.
 */
const entityMappings: HandlerHelpers.EntityMappings = {
  eventsByEntity: new Map<HandlerHelpers.Entity, Types.Events.Event[]>(),
  entityByEvent: new Map<Types.Events.Event, HandlerHelpers.Entity>(),
  createdEntityCache: new Map<string, HandlerHelpers.Entity>(),
  entityByUrlCache: new Map<string, HandlerHelpers.Entity>(),
};

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
    const target = traceEvents[key] as Types.Events.Event[];
    const values = value as Types.Events.Event[];
    target.push(...values);
  } else {
    traceEvents[key] = value;
  }
}

function firstPositiveValueInList(entries: Array<number|null>): number {
  for (const entry of entries) {
    if (entry && entry > 0) {
      return entry;
    }
  }

  // In the event we don't find a positive value, we return 0 so as to
  // be a mathematical noop. It's typically not correct to return – say –
  // a -1 here because it would affect the calculation of stats below.
  return 0;
}

export function reset(): void {
  requestsById.clear();
  requestMap.clear();
  requestsByTime.length = 0;
  networkRequestEventByInitiatorUrl.clear();
  eventToInitiatorMap.clear();
  webSocketData.clear();
  entityMappings.eventsByEntity.clear();
  entityMappings.entityByEvent.clear();
  entityMappings.createdEntityCache.clear();
  entityMappings.entityByUrlCache.clear();
  linkPreconnectEvents.length = 0;
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isResourceChangePriority(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'changePriority', event);
    return;
  }

  if (Types.Events.isResourceWillSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'willSendRequests', [event]);
    return;
  }

  if (Types.Events.isResourceSendRequest(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'sendRequests', [event]);
    return;
  }

  if (Types.Events.isResourceReceiveResponse(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'receiveResponse', event);
    return;
  }

  if (Types.Events.isResourceReceivedData(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'receivedData', [event]);
    return;
  }

  if (Types.Events.isResourceFinish(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'resourceFinish', event);
    return;
  }

  if (Types.Events.isResourceMarkAsCached(event)) {
    storeTraceEventWithRequestId(event.args.data.requestId, 'resourceMarkAsCached', event);
    return;
  }

  if (Types.Events.isWebSocketCreate(event) || Types.Events.isWebSocketInfo(event) ||
      Types.Events.isWebSocketTransfer(event)) {
    const identifier = event.args.data.identifier;
    if (!webSocketData.has(identifier)) {
      if (event.args.data.frame) {
        webSocketData.set(identifier, {
          frame: event.args.data.frame,
          webSocketIdentifier: identifier,
          events: [],
          syntheticConnection: null,
        });
      } else if (event.args.data.workerId) {
        webSocketData.set(identifier, {
          workerId: event.args.data.workerId,
          webSocketIdentifier: identifier,
          events: [],
          syntheticConnection: null,
        });
      }
    }

    webSocketData.get(identifier)?.events.push(event);
  }

  if (Types.Events.isLinkPreconnect(event)) {
    linkPreconnectEvents.push(event);
    return;
  }
}

export async function finalize(): Promise<void> {
  const {rendererProcessesByFrame} = metaHandlerData();
  for (const [requestId, request] of requestMap.entries()) {
    // If we have an incomplete set of events here, we choose to drop the network
    // request rather than attempt to synthesize the missing data.
    if (!request.sendRequests) {
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
    const redirects: Types.Events.SyntheticNetworkRedirect[] = [];
    for (let i = 0; i < request.sendRequests.length - 1; i++) {
      const sendRequest = request.sendRequests[i];
      const nextSendRequest = request.sendRequests[i + 1];

      // Use the willSendRequests as the source for redirects if possible.
      // We default to those of the sendRequests, however, since willSendRequest
      // is not guaranteed to be present in the data for every request.
      let ts = sendRequest.ts;
      let dur = Types.Timing.Micro(nextSendRequest.ts - sendRequest.ts);
      if (request.willSendRequests?.[i] && request.willSendRequests[i + 1]) {
        const willSendRequest = request.willSendRequests[i];
        const nextWillSendRequest = request.willSendRequests[i + 1];
        ts = willSendRequest.ts;
        dur = Types.Timing.Micro(nextWillSendRequest.ts - willSendRequest.ts);
      }

      redirects.push({
        url: sendRequest.args.data.url,
        priority: sendRequest.args.data.priority,
        requestMethod: sendRequest.args.data.requestMethod,
        ts,
        dur,
      });
    }

    const firstSendRequest = request.sendRequests[0];
    const finalSendRequest = request.sendRequests[request.sendRequests.length - 1];

    // We currently do not want to include data URI requests. We may revisit this in the future.
    if (finalSendRequest.args.data.url.startsWith('data:')) {
      continue;
    }

    /**
     * LR loses transfer size information, but passes it in the 'X-TotalFetchedSize' header.
     * 'X-TotalFetchedSize' is the canonical transfer size in LR.
     *
     * In Lightrider, due to instrumentation limitations, our values for encodedDataLength are bogus
     * and not valid. However the resource's true encodedDataLength/transferSize is shared via a
     * special response header, X-TotalFetchedSize. In this situation, we read this value from
     * responseReceived, use it for the transferSize and ignore the original encodedDataLength values.
     */
    // @ts-expect-error
    const isLightrider = globalThis.isLightrider;
    if (isLightrider && request.resourceFinish && request.receiveResponse?.args.data.headers) {
      const lrSizeHeader = request.receiveResponse.args.data.headers.find(h => h.name === 'X-TotalFetchedSize');
      if (lrSizeHeader) {
        const size = parseFloat(lrSizeHeader.value);
        if (!isNaN(size)) {
          request.resourceFinish.args.data.encodedDataLength = size;
        }
      }
    }

    // If a ResourceFinish event with an encoded data length is received,
    // then the resource was not cached; it was fetched before it was
    // requested, e.g. because it was pushed in this navigation.
    const isPushedResource = request.resourceFinish?.args.data.encodedDataLength !== 0;
    // This works around crbug.com/998397, which reports pushed resources, and resources served by a service worker as disk cached.
    const isDiskCached = !!request.receiveResponse && request.receiveResponse.args.data.fromCache &&
        !request.receiveResponse.args.data.fromServiceWorker && !isPushedResource;
    // If the request contains a resourceMarkAsCached event, it was served from memory cache.
    // The timing data returned is from the original (uncached) request, which
    // means that if we leave the above network record data as-is when the
    // request came from either the disk cache or memory cache, our calculations
    // will be incorrect.
    //
    // So we use this flag so when we calculate the timestamps of the various
    // events, we can overwrite them.
    // These timestamps may not be perfect (indeed they don't always match
    // the Network CDP domain exactly, which is likely an artifact of the way
    // the data is routed on the backend), but they're the closest we have.
    const isMemoryCached = request.resourceMarkAsCached !== undefined;
    // If a request has `resourceMarkAsCached` field, the `timing` field is not correct.
    // So let's discard it and override to 0 (which will be handled in later logic if timing field is undefined).
    let timing = isMemoryCached ? undefined : request.receiveResponse?.args.data.timing;

    /**
     * LR gets additional, accurate timing information from its underlying fetch infrastructure.  This
     * is passed in via X-Headers similar to 'X-TotalFetchedSize'.
     *
     * See `_updateTimingsForLightrider` in Lighthouse for more detail.
     */
    if (isLightrider && request.receiveResponse?.args.data.headers) {
      timing = {
        requestTime: Helpers.Timing.microToSeconds(request.sendRequests.at(0)?.ts ?? 0 as Types.Timing.Micro),
        connectEnd: 0 as Types.Timing.Milli,
        connectStart: 0 as Types.Timing.Milli,
        dnsEnd: 0 as Types.Timing.Milli,
        dnsStart: 0 as Types.Timing.Milli,
        proxyEnd: 0 as Types.Timing.Milli,
        proxyStart: 0 as Types.Timing.Milli,
        pushEnd: 0 as Types.Timing.Milli,
        pushStart: 0 as Types.Timing.Milli,
        receiveHeadersEnd: 0 as Types.Timing.Milli,
        receiveHeadersStart: 0 as Types.Timing.Milli,
        sendEnd: 0 as Types.Timing.Milli,
        sendStart: 0 as Types.Timing.Milli,
        sslEnd: 0 as Types.Timing.Milli,
        sslStart: 0 as Types.Timing.Milli,
        workerReady: 0 as Types.Timing.Milli,
        workerStart: 0 as Types.Timing.Milli,

        ...timing,
      };

      const TCPMsHeader = request.receiveResponse.args.data.headers.find(h => h.name === 'X-TCPMs');
      const TCPMs = TCPMsHeader ? Math.max(0, parseInt(TCPMsHeader.value, 10)) : 0;

      if (request.receiveResponse.args.data.protocol.startsWith('h3')) {
        timing.connectStart = 0 as Types.Timing.Milli;
        timing.connectEnd = TCPMs as Types.Timing.Milli;
      } else {
        timing.connectStart = 0 as Types.Timing.Milli;
        timing.sslStart = TCPMs / 2 as Types.Timing.Milli;
        timing.connectEnd = TCPMs as Types.Timing.Milli;
        timing.sslEnd = TCPMs as Types.Timing.Milli;
      }
    }

    // TODO: consider allowing chrome / about.
    const allowedProtocols = [
      'blob:',
      'file:',
      'filesystem:',
      'http:',
      'https:',
    ];
    if (!allowedProtocols.some(p => firstSendRequest.args.data.url.startsWith(p))) {
      continue;
    }

    const initialPriority = finalSendRequest.args.data.priority;
    let finalPriority = initialPriority;
    if (request.changePriority) {
      finalPriority = request.changePriority.args.data.priority;
    }

    // Network timings are complicated.
    // https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/Network-Timings.svg is generally correct, but.. less so for navigations/redirects/etc.

    // Start time
    // =======================
    // The time where the request started, which is either the first willSendRequest
    // event if there is one, or, if there is not, the sendRequest.
    const startTime = (request.willSendRequests?.length) ? Types.Timing.Micro(request.willSendRequests[0].ts) :
                                                           Types.Timing.Micro(firstSendRequest.ts);

    // End redirect time
    // =======================
    // It's possible that when we start requesting data we will receive redirections.
    // Here we note the time of the *last* willSendRequest / sendRequest event,
    // which is used later on in the calculations for time queueing etc.
    const endRedirectTime = (request.willSendRequests?.length) ?
        Types.Timing.Micro(request.willSendRequests[request.willSendRequests.length - 1].ts) :
        Types.Timing.Micro(finalSendRequest.ts);

    // Finish time and end time
    // =======================
    // The finish time and the end time are subtly different.
    //  - Finish time: records the point at which the network stack stopped receiving the data
    //  - End time: the timestamp of the finish event itself (if one exists)
    //
    // The end time, then, will be slightly after the finish time.
    const endTime = request.resourceFinish ? request.resourceFinish.ts : endRedirectTime;
    const finishTime = request.resourceFinish?.args.data.finishTime ?
        Types.Timing.Micro(request.resourceFinish.args.data.finishTime * SECONDS_TO_MICROSECONDS) :
        Types.Timing.Micro(endTime);

    // Network duration
    // =======================
    // Time spent on the network.
    const networkDuration = Types.Timing.Micro(timing ? (finishTime || endRedirectTime) - endRedirectTime : 0);

    // Processing duration
    // =======================
    // Time spent from start to end.
    const processingDuration = Types.Timing.Micro(endTime - (finishTime || endTime));

    // Redirection duration
    // =======================
    // Time between the first willSendRequest / sendRequest and last. This we place in *front* of the
    // queueing, since the queueing time that we know about from the trace data is only the last request,
    // i.e., the one that occurs after all the redirects.
    const redirectionDuration = Types.Timing.Micro(endRedirectTime - startTime);

    // Queueing
    // =======================
    // The amount of time queueing is the time between the request's start time to the requestTime
    // arg recorded in the receiveResponse event. In the cases where the recorded start time is larger
    // that the requestTime we set queueing time to zero.
    const queueingFromTraceData = timing ? timing.requestTime * SECONDS_TO_MICROSECONDS - endRedirectTime : 0;
    const queueing = Types.Timing.Micro(Platform.NumberUtilities.clamp(queueingFromTraceData, 0, Number.MAX_VALUE));

    // Stalled
    // =======================
    // If the request is cached, the amount of time stalled is the time between the start time and
    // receiving a response.
    // Otherwise it is whichever positive number comes first from the following timing info:
    // DNS start, Connection start, Send Start, or the time duration between our start time and
    // receiving a response.
    const stalled = timing ?
        Types.Timing.Micro(firstPositiveValueInList([
          timing.dnsStart * MILLISECONDS_TO_MICROSECONDS,
          timing.connectStart * MILLISECONDS_TO_MICROSECONDS,
          timing.sendStart * MILLISECONDS_TO_MICROSECONDS,
          request.receiveResponse ? (request.receiveResponse.ts - endRedirectTime) : null,
        ])) :
        (request.receiveResponse ? Types.Timing.Micro(request.receiveResponse.ts - startTime) : Types.Timing.Micro(0));

    // Sending HTTP request
    // =======================
    // Time when the HTTP request is sent.
    const sendStartTime = timing ?
        Types.Timing.Micro(
            timing.requestTime * SECONDS_TO_MICROSECONDS + timing.sendStart * MILLISECONDS_TO_MICROSECONDS) :
        startTime;

    // Waiting
    // =======================
    // Time from when the send finished going to when the headers were received.
    const waiting = timing ?
        Types.Timing.Micro((timing.receiveHeadersEnd - timing.sendEnd) * MILLISECONDS_TO_MICROSECONDS) :
        Types.Timing.Micro(0);

    // Download
    // =======================
    // Time from receipt of headers to the finish time.
    const downloadStart = timing ?
        Types.Timing.Micro(
            timing.requestTime * SECONDS_TO_MICROSECONDS + timing.receiveHeadersEnd * MILLISECONDS_TO_MICROSECONDS) :
        startTime;
    const download = timing     ? Types.Timing.Micro(((finishTime || downloadStart) - downloadStart)) :
        request.receiveResponse ? Types.Timing.Micro(endTime - request.receiveResponse.ts) :
                                  Types.Timing.Micro(0);

    const totalTime = Types.Timing.Micro(networkDuration + processingDuration);

    // Collect a few values from the timing info.
    // If the Network request is cached, these fields will be zero, so the minus will zero out them.
    const dnsLookup = timing ? Types.Timing.Micro((timing.dnsEnd - timing.dnsStart) * MILLISECONDS_TO_MICROSECONDS) :
                               Types.Timing.Micro(0);
    const ssl = timing ? Types.Timing.Micro((timing.sslEnd - timing.sslStart) * MILLISECONDS_TO_MICROSECONDS) :
                         Types.Timing.Micro(0);
    const proxyNegotiation = timing ?
        Types.Timing.Micro((timing.proxyEnd - timing.proxyStart) * MILLISECONDS_TO_MICROSECONDS) :
        Types.Timing.Micro(0);
    const requestSent = timing ?
        Types.Timing.Micro((timing.sendEnd - timing.sendStart) * MILLISECONDS_TO_MICROSECONDS) :
        Types.Timing.Micro(0);
    const initialConnection = timing ?
        Types.Timing.Micro((timing.connectEnd - timing.connectStart) * MILLISECONDS_TO_MICROSECONDS) :
        Types.Timing.Micro(0);

    // Finally get some of the general data from the trace events.
    const {frame, url, renderBlocking} = finalSendRequest.args.data;
    const {encodedDataLength, decodedBodyLength} =
        request.resourceFinish ? request.resourceFinish.args.data : {encodedDataLength: 0, decodedBodyLength: 0};
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const requestingFrameUrl =
        Helpers.Trace.activeURLForFrameAtTime(frame, finalSendRequest.ts, rendererProcessesByFrame) || '';
    // Construct a synthetic trace event for this network request.
    const networkEvent =
        Helpers.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent<Types.Events.SyntheticNetworkRequest>({
          rawSourceEvent: finalSendRequest,
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
              fromServiceWorker: request.receiveResponse?.args.data.fromServiceWorker,
              isLinkPreload: finalSendRequest.args.data.isLinkPreload || false,
              mimeType: request.receiveResponse?.args.data.mimeType ?? '',
              priority: finalPriority,
              initialPriority,
              protocol: request.receiveResponse?.args.data.protocol ?? 'unknown',
              redirects,
              // In the event the property isn't set, assume non-blocking.
              renderBlocking: renderBlocking ?? 'non_blocking',
              requestId,
              requestingFrameUrl,
              requestMethod: finalSendRequest.args.data.requestMethod,
              resourceType: finalSendRequest.args.data.resourceType ?? Protocol.Network.ResourceType.Other,
              statusCode: request.receiveResponse?.args.data.statusCode ?? 0,
              responseHeaders: request.receiveResponse?.args.data.headers ?? null,
              fetchPriorityHint: finalSendRequest.args.data.fetchPriorityHint ?? 'auto',
              initiator: finalSendRequest.args.data.initiator,
              stackTrace: finalSendRequest.args.data.stackTrace,
              timing,
              url,
              failed: request.resourceFinish?.args.data.didFail ?? false,
              finished: Boolean(request.resourceFinish),
              hasResponse: Boolean(request.receiveResponse),
              connectionId: request.receiveResponse?.args.data.connectionId,
              connectionReused: request.receiveResponse?.args.data.connectionReused,
            },
          },
          cat: 'loading',
          name: Types.Events.Name.SYNTHETIC_NETWORK_REQUEST,
          ph: Types.Events.Phase.COMPLETE,
          dur: Types.Timing.Micro(endTime - startTime),
          tdur: Types.Timing.Micro(endTime - startTime),
          ts: Types.Timing.Micro(startTime),
          tts: Types.Timing.Micro(startTime),
          pid: finalSendRequest.pid,
          tid: finalSendRequest.tid,
        });

    // However, there are also times where we just want to loop through all
    // the captured requests, so here we store all of them together.
    requestsByTime.push(networkEvent);
    requestsById.set(networkEvent.args.data.requestId, networkEvent);

    // Update entity relationships for network events
    HandlerHelpers.addNetworkRequestToEntityMapping(networkEvent, entityMappings, request);

    // Establish initiator relationships
    const initiatorUrl = networkEvent.args.data.initiator?.url ||
        Helpers.Trace.getZeroIndexedStackTraceInEventPayload(networkEvent)?.at(0)?.url;
    if (initiatorUrl) {
      const events = networkRequestEventByInitiatorUrl.get(initiatorUrl) ?? [];
      events.push(networkEvent);
      networkRequestEventByInitiatorUrl.set(initiatorUrl, events);
    }
  }

  for (const request of requestsByTime) {
    const initiatedEvents = networkRequestEventByInitiatorUrl.get(request.args.data.url);

    if (initiatedEvents) {
      for (const initiatedEvent of initiatedEvents) {
        eventToInitiatorMap.set(initiatedEvent, request);
      }
    }
  }

  finalizeWebSocketData();
}

export function data(): NetworkRequestData {
  return {
    byId: requestsById,
    byTime: requestsByTime,
    eventToInitiator: eventToInitiatorMap,
    webSocket: [...webSocketData.values()],
    entityMappings: {
      entityByEvent: new Map(entityMappings.entityByEvent),
      eventsByEntity: new Map(entityMappings.eventsByEntity),
      createdEntityCache: new Map(entityMappings.createdEntityCache),
      entityByUrlCache: new Map(entityMappings.entityByUrlCache),
    },
    linkPreconnectEvents,
  };
}

export function deps(): HandlerName[] {
  return ['Meta'];
}

function finalizeWebSocketData(): void {
  // for each WebSocketTraceData in webSocketData map, we create a synthetic event
  // to represent the entire WebSocket connection. This is done by finding the start and end event
  // if they exist, and if they don't, we use the first event in the list for start, and the traceBounds.max
  // for the end. So each WebSocketTraceData will have
  // {
  //    events:  the list of WebSocket events
  //    syntheticConnection:  the synthetic event representing the entire WebSocket connection
  // }
  webSocketData.forEach(data => {
    let startEvent: Types.Events.WebSocketEvent|null = null;
    let endEvent: Types.Events.WebSocketDestroy|null = null;
    for (const event of data.events) {
      if (Types.Events.isWebSocketCreate(event)) {
        startEvent = event;
      }
      if (Types.Events.isWebSocketDestroy(event)) {
        endEvent = event;
      }
    }
    data.syntheticConnection = createSyntheticWebSocketConnection(startEvent, endEvent, data.events[0]);
  });
}

function createSyntheticWebSocketConnection(
    startEvent: Types.Events.WebSocketCreate|null, endEvent: Types.Events.WebSocketDestroy|null,
    firstRecordedEvent: Types.Events.WebSocketEvent): Types.Events.SyntheticWebSocketConnection {
  const {traceBounds} = metaHandlerData();
  const startTs = startEvent ? startEvent.ts : traceBounds.min;
  const endTs = endEvent ? endEvent.ts : traceBounds.max;
  const duration = endTs - startTs;
  const mainEvent = startEvent || endEvent || firstRecordedEvent;
  return {
    name: 'SyntheticWebSocketConnection',
    cat: mainEvent.cat,
    ph: Types.Events.Phase.COMPLETE,
    ts: startTs,
    dur: duration as Types.Timing.Micro,
    pid: mainEvent.pid,
    tid: mainEvent.tid,
    s: mainEvent.s,
    rawSourceEvent: mainEvent,
    _tag: 'SyntheticEntryTag',
    args: {
      data: {
        identifier: mainEvent.args.data.identifier,
        priority: Protocol.Network.ResourcePriority.Low,
        url: mainEvent.args.data.url || '',
      },
    },
  };
}
