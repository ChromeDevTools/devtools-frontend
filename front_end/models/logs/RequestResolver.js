// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import { Events as NetworkLogEvents, NetworkLog } from './NetworkLog.js';
/**
 * A class that facilitates resolving a requestId to a network request. If the requestId does not resolve, a listener
 * is installed on the network request to wait for the request to appear. This is useful if an attempt to resolve the
 * requestId is made before the network request got reported.
 *
 * This functionality is intentionally provided in this class (instead of as part of NetworkLog) to enable clients
 * to control the duration of the wait and the lifetime of the associated promises by using the `clear` method on
 * this class.
 */
export class RequestResolver extends Common.ResolverBase.ResolverBase {
    networkListener = null;
    networkLog;
    constructor(networkLog = NetworkLog.instance()) {
        super();
        this.networkLog = networkLog;
    }
    getForId(id) {
        const requests = this.networkLog.requestsForId(id);
        if (requests.length > 0) {
            return requests[0];
        }
        return null;
    }
    onRequestAdded(event) {
        const { request } = event.data;
        const backendRequestId = request.backendRequestId();
        if (backendRequestId) {
            this.onResolve(backendRequestId, request);
        }
    }
    startListening() {
        if (this.networkListener) {
            return;
        }
        this.networkListener = this.networkLog.addEventListener(NetworkLogEvents.RequestAdded, this.onRequestAdded, this);
    }
    stopListening() {
        if (!this.networkListener) {
            return;
        }
        Common.EventTarget.removeEventListeners([this.networkListener]);
        this.networkListener = null;
    }
}
//# sourceMappingURL=RequestResolver.js.map