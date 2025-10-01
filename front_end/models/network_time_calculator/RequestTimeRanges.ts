// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

export const enum RequestTimeRangeNames {
  PUSH = 'push',
  QUEUEING = 'queueing',
  BLOCKING = 'blocking',
  CONNECTING = 'connecting',
  DNS = 'dns',
  PROXY = 'proxy',
  RECEIVING = 'receiving',
  RECEIVING_PUSH = 'receiving-push',
  SENDING = 'sending',
  SERVICE_WORKER = 'serviceworker',
  SERVICE_WORKER_PREPARATION = 'serviceworker-preparation',
  SERVICE_WORKER_RESPOND_WITH = 'serviceworker-respondwith',
  SERVICE_WORKER_ROUTER_EVALUATION = 'serviceworker-routerevaluation',
  SERVICE_WORKER_CACHE_LOOKUP = 'serviceworker-cachelookup',
  SSL = 'ssl',
  TOTAL = 'total',
  WAITING = 'waiting',
}

export const ServiceWorkerRangeNames = new Set<RequestTimeRangeNames>([
  RequestTimeRangeNames.SERVICE_WORKER,
  RequestTimeRangeNames.SERVICE_WORKER_PREPARATION,
  RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH,
  RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION,
  RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP,
]);

export const ConnectionSetupRangeNames = new Set<RequestTimeRangeNames>([
  RequestTimeRangeNames.QUEUEING,
  RequestTimeRangeNames.BLOCKING,
  RequestTimeRangeNames.CONNECTING,
  RequestTimeRangeNames.DNS,
  RequestTimeRangeNames.PROXY,
  RequestTimeRangeNames.SSL,
]);

export interface RequestTimeRange {
  name: RequestTimeRangeNames;
  start: number;
  end: number;
}

export function calculateRequestTimeRanges(
    request: SDK.NetworkRequest.NetworkRequest, navigationStart: number): RequestTimeRange[] {
  const result: RequestTimeRange[] = [];
  function addRange(name: RequestTimeRangeNames, start: number, end: number): void {
    if (start < Number.MAX_VALUE && start <= end) {
      result.push({name, start, end});
    }
  }

  function firstPositive(numbers: number[]): number|undefined {
    for (let i = 0; i < numbers.length; ++i) {
      if (numbers[i] > 0) {
        return numbers[i];
      }
    }
    return undefined;
  }

  function addOffsetRange(name: RequestTimeRangeNames, start: number, end: number): void {
    if (start >= 0 && end >= 0) {
      addRange(name, startTime + (start / 1000), startTime + (end / 1000));
    }
  }

  /**
   * In some situations, argument `start` may come before `startTime` (`timing.requestStart`). This is especially true
   * in cases such as SW static routing API where fields like `workerRouterEvaluationStart` or `workerCacheLookupStart`
   * is set before setting `timing.requestStart`. If the `start` and `end` is known to be a valid value (i.e. not default
   * invalid value -1 or undefined), we allow adding the range.
   **/
  function addMaybeNegativeOffsetRange(name: RequestTimeRangeNames, start: number, end: number): void {
    addRange(name, startTime + (start / 1000), startTime + (end / 1000));
  }

  const timing = request.timing;
  if (!timing) {
    const start = request.issueTime() !== -1 ? request.issueTime() : request.startTime !== -1 ? request.startTime : 0;
    const hasDifferentIssueAndStartTime =
        request.issueTime() !== -1 && request.startTime !== -1 && request.issueTime() !== request.startTime;
    const middle = (request.responseReceivedTime === -1) ?
        (hasDifferentIssueAndStartTime ? request.startTime : Number.MAX_VALUE) :
        request.responseReceivedTime;
    const end = (request.endTime === -1) ? Number.MAX_VALUE : request.endTime;
    addRange(RequestTimeRangeNames.TOTAL, start, end);
    addRange(RequestTimeRangeNames.BLOCKING, start, middle);
    const state =
        request.responseReceivedTime === -1 ? RequestTimeRangeNames.CONNECTING : RequestTimeRangeNames.RECEIVING;
    addRange(state, middle, end);
    return result;
  }

  const issueTime = request.issueTime();
  const startTime = timing.requestTime;
  const endTime = firstPositive([request.endTime, request.responseReceivedTime]) || startTime;

  addRange(RequestTimeRangeNames.TOTAL, issueTime < startTime ? issueTime : startTime, endTime);
  if (timing.pushStart) {
    const pushEnd = timing.pushEnd || endTime;
    // Only show the part of push that happened after the navigation/reload.
    // Pushes that happened on the same connection before we started main request will not be shown.
    if (pushEnd > navigationStart) {
      addRange(RequestTimeRangeNames.PUSH, Math.max(timing.pushStart, navigationStart), pushEnd);
    }
  }
  if (issueTime < startTime) {
    addRange(RequestTimeRangeNames.QUEUEING, issueTime, startTime);
  }

  const responseReceived = (request.responseReceivedTime - startTime) * 1000;
  if (request.fetchedViaServiceWorker) {
    addOffsetRange(RequestTimeRangeNames.BLOCKING, 0, timing.workerStart);
    addOffsetRange(RequestTimeRangeNames.SERVICE_WORKER_PREPARATION, timing.workerStart, timing.workerReady);
    addOffsetRange(
        RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH, timing.workerFetchStart, timing.workerRespondWithSettled);
    addOffsetRange(RequestTimeRangeNames.SERVICE_WORKER, timing.workerReady, timing.sendEnd);
    addOffsetRange(RequestTimeRangeNames.WAITING, timing.sendEnd, responseReceived);
  } else if (!timing.pushStart) {
    const blockingEnd = firstPositive([timing.dnsStart, timing.connectStart, timing.sendStart, responseReceived]) || 0;
    addOffsetRange(RequestTimeRangeNames.BLOCKING, 0, blockingEnd);
    addOffsetRange(RequestTimeRangeNames.PROXY, timing.proxyStart, timing.proxyEnd);
    addOffsetRange(RequestTimeRangeNames.DNS, timing.dnsStart, timing.dnsEnd);
    addOffsetRange(RequestTimeRangeNames.CONNECTING, timing.connectStart, timing.connectEnd);
    addOffsetRange(RequestTimeRangeNames.SSL, timing.sslStart, timing.sslEnd);
    addOffsetRange(RequestTimeRangeNames.SENDING, timing.sendStart, timing.sendEnd);
    addOffsetRange(
        RequestTimeRangeNames.WAITING,
        Math.max(timing.sendEnd, timing.connectEnd, timing.dnsEnd, timing.proxyEnd, blockingEnd), responseReceived);
  }

  const {serviceWorkerRouterInfo} = request;
  if (serviceWorkerRouterInfo) {
    if (timing.workerRouterEvaluationStart) {
      // Depending on the source,the next timestamp will be different. Determine the timestamp by checking
      // the matched and actual source.
      let routerEvaluationEnd = timing.sendStart;
      if (serviceWorkerRouterInfo?.matchedSourceType === Protocol.Network.ServiceWorkerRouterSource.Cache &&
          timing.workerCacheLookupStart) {
        routerEvaluationEnd = timing.workerCacheLookupStart;
      } else if (serviceWorkerRouterInfo?.actualSourceType === Protocol.Network.ServiceWorkerRouterSource.FetchEvent) {
        routerEvaluationEnd = timing.workerStart;
      }
      addMaybeNegativeOffsetRange(
          RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION, timing.workerRouterEvaluationStart,
          routerEvaluationEnd);
    }

    if (timing.workerCacheLookupStart) {
      let cacheLookupEnd = timing.sendStart;
      if (serviceWorkerRouterInfo?.actualSourceType === Protocol.Network.ServiceWorkerRouterSource.Cache) {
        cacheLookupEnd = timing.receiveHeadersStart;
      }
      addMaybeNegativeOffsetRange(
          RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP, timing.workerCacheLookupStart, cacheLookupEnd);
    }
  }

  if (request.endTime !== -1) {
    addRange(
        timing.pushStart ? RequestTimeRangeNames.RECEIVING_PUSH : RequestTimeRangeNames.RECEIVING,
        request.responseReceivedTime, endTime);
  }

  return result;
}
