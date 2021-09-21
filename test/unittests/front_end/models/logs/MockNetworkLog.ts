// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';

interface MockNetworkRequest {
  requestId(): string;
}

export function createNetworkRequest(requestId: string): SDK.NetworkRequest.NetworkRequest {
  return {
    requestId() {
      return requestId;
    },
    backendRequestId() {
      return requestId;
    },
  } as unknown as SDK.NetworkRequest.NetworkRequest;
}

export class MockNetworkLog extends Common.ObjectWrapper.ObjectWrapper<Logs.NetworkLog.EventTypes> {
  private mockRequests: Array<MockNetworkRequest>;

  constructor(mockRequests: Array<MockNetworkRequest>) {
    super();
    this.mockRequests = mockRequests;
  }

  requestsForId(requestId: string) {
    return this.mockRequests.filter(x => x.requestId() === requestId);
  }

  addRequest(mockRequest: MockNetworkRequest) {
    this.mockRequests.push(mockRequest);
    this.dispatchEventToListeners(
        Logs.NetworkLog.Events.RequestAdded, mockRequest as SDK.NetworkRequest.NetworkRequest);
  }
}
