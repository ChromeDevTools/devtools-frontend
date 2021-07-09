// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {Events as NetworkLogEvents, NetworkLog} from './NetworkLog.js';

export type Callback = (request: SDK.NetworkRequest.NetworkRequest) => void;

interface PromiseInfo {
  promise: Promise<SDK.NetworkRequest.NetworkRequest>;
  resolve: Callback;
  reject: (error: Error) => void;
}

/**
  * A class that facilitates resolving a requestId to a network request. If the requestId does not resolve, a listener
  * is installed on the network request to wait for the request to appear. This is useful if an attempt to resolve the
  * requestId is made before the network request got reported.
  *
  * This functionality is intentionally provided in this class (instead of as part of NetworkLog) to enable clients
  * to control the duration of the wait and the lifetime of the associated promises by using the `clear` method on
  * this class.
  */
export class RequestResolver {
  private networkListener: Common.EventTarget.EventDescriptor|null = null;
  private unresolvedRequestIds: Map<Protocol.Network.RequestId, PromiseInfo> = new Map();
  private networkLog: NetworkLog;

  constructor(networkLog: NetworkLog = NetworkLog.instance()) {
    this.networkLog = networkLog;
  }

  /**
   * Returns a promise that resolves once the `requestId` can be resolved to a network request.
   */
  waitForNetworkRequest(requestId: Protocol.Network.RequestId): Promise<SDK.NetworkRequest.NetworkRequest> {
    const requests = this.networkLog.requestsForId(requestId);
    if (!requests.length) {
      return this.getOrCreatePromise(requestId);
    }
    return Promise.resolve(requests[0]);
  }

  /**
   * Resolve the `requestId`. Returns the network request immediatelly if it
   * is available, and otherwise waits for the request to appear and calls
   * `callback` once it is resolved.
   */
  tryGetNetworkRequest(requestId: Protocol.Network.RequestId, callback: Callback): SDK.NetworkRequest.NetworkRequest
      |null {
    const requests = this.networkLog.requestsForId(requestId);
    if (!requests.length) {
      const swallowTheError = (): void => {};
      this.getOrCreatePromise(requestId).catch(swallowTheError).then(request => {
        if (request) {
          callback(request);
        }
      });
      return null;
    }
    return requests[0];
  }

  /**
   * Aborts all waiting and rejects all unresolved promises.
   */
  clear(): void {
    this.stopListening();
    for (const [requestId, {reject}] of this.unresolvedRequestIds.entries()) {
      reject(new Error(`NetworkRequest with ${requestId} never resolved.`));
    }
    this.unresolvedRequestIds.clear();
  }

  private getOrCreatePromise(requestId: Protocol.Network.RequestId): Promise<SDK.NetworkRequest.NetworkRequest> {
    const promiseInfo = this.unresolvedRequestIds.get(requestId);
    if (promiseInfo) {
      return promiseInfo.promise;
    }
    let resolve: (value: SDK.NetworkRequest.NetworkRequest) => void = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<SDK.NetworkRequest.NetworkRequest>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.unresolvedRequestIds.set(requestId, {promise, resolve, reject});
    this.startListening();
    return promise;
  }

  private onRequestAdded(event: Common.EventTarget.EventTargetEvent): void {
    const request = event.data as SDK.NetworkRequest.NetworkRequest;
    const backendRequestId = request.backendRequestId();
    if (!backendRequestId) {
      return;
    }
    const promiseInfo = this.unresolvedRequestIds.get(backendRequestId);
    this.unresolvedRequestIds.delete(backendRequestId);
    if (this.unresolvedRequestIds.size === 0) {
      this.stopListening();
    }
    promiseInfo?.resolve(request);
  }

  private startListening(): void {
    if (this.networkListener) {
      return;
    }
    this.networkListener = this.networkLog.addEventListener(NetworkLogEvents.RequestAdded, this.onRequestAdded, this);
  }

  private stopListening(): void {
    if (!this.networkListener) {
      return;
    }
    Common.EventTarget.EventTarget.removeEventListeners([this.networkListener]);
    this.networkListener = null;
  }
}
