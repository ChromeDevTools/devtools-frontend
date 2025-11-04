// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as Logs from '../models/logs/logs.js';
export function createNetworkRequest(requestId) {
    return {
        requestId() {
            return requestId;
        },
        backendRequestId() {
            return requestId;
        },
    };
}
export class MockNetworkLog extends Common.ObjectWrapper.ObjectWrapper {
    mockRequests;
    constructor(mockRequests) {
        super();
        this.mockRequests = mockRequests;
    }
    requestsForId(requestId) {
        return this.mockRequests.filter(x => x.requestId() === requestId);
    }
    addRequest(mockRequest) {
        this.mockRequests.push(mockRequest);
        this.dispatchEventToListeners(Logs.NetworkLog.Events.RequestAdded, { request: mockRequest });
    }
}
//# sourceMappingURL=MockNetworkLog.js.map