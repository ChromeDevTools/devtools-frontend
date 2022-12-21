// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {Events as NetworkLogEvents, NetworkLog} from './NetworkLog.js';

/**
 * A class that facilitates resolving a requestId to a network request. If the requestId does not resolve, a listener
 * is installed on the network request to wait for the request to appear. This is useful if an attempt to resolve the
 * requestId is made before the network request got reported.
 *
 * This functionality is intentionally provided in this class (instead of as part of NetworkLog) to enable clients
 * to control the duration of the wait and the lifetime of the associated promises by using the `clear` method on
 * this class.
 */
export class RequestResolver extends
    Common.ResolverBase.ResolverBase<Protocol.Network.RequestId, SDK.NetworkRequest.NetworkRequest> {
  private networkListener: Common.EventTarget.EventDescriptor|null = null;
  private networkLog: NetworkLog;

  constructor(networkLog: NetworkLog = NetworkLog.instance()) {
    super();
    this.networkLog = networkLog;
  }

  protected getForId(id: Protocol.Network.RequestId): SDK.NetworkRequest.NetworkRequest|null {
    const requests = this.networkLog.requestsForId(id);
    if (requests.length > 0) {
      return requests[0];
    }
    return null;
  }

  private onRequestAdded(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    const request = event.data;
    const backendRequestId = request.backendRequestId();
    if (backendRequestId) {
      this.onResolve(backendRequestId, request);
    }
  }

  protected override startListening(): void {
    if (this.networkListener) {
      return;
    }
    this.networkListener = this.networkLog.addEventListener(NetworkLogEvents.RequestAdded, this.onRequestAdded, this);
  }

  protected override stopListening(): void {
    if (!this.networkListener) {
      return;
    }
    Common.EventTarget.removeEventListeners([this.networkListener]);
    this.networkListener = null;
  }
}
