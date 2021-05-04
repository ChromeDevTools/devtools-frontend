// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Common from '../../../../../front_end/core/common/common.js';

describe('MultitargetNetworkManager', () => {
  describe('Trust Token done event', () => {
    it('is not lost when arriving before the corresponding requestWillBeSent event', () => {
      // 1) Setup a NetworkManager and listen to "RequestStarted" events.
      const networkManager = new Common.ObjectWrapper.ObjectWrapper();
      const startedRequests: SDK.NetworkRequest.NetworkRequest[] = [];
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, event => {
        const request = event.data.request as SDK.NetworkRequest.NetworkRequest;
        startedRequests.push(request);
      });
      const networkDispatcher =
          new SDK.NetworkManager.NetworkDispatcher(networkManager as SDK.NetworkManager.NetworkManager);

      // 2) Fire a trust token event, followed by a requestWillBeSent event.
      const mockEvent = {requestId: 'mockId'} as Protocol.Network.TrustTokenOperationDoneEvent;
      networkDispatcher.trustTokenOperationDone(mockEvent);
      networkDispatcher.requestWillBeSent(
          {requestId: 'mockId', request: {url: 'example.com'}} as Protocol.Network.RequestWillBeSentEvent);

      // 3) Check that the resulting NetworkRequest has the Trust Token Event data associated with it.
      assert.strictEqual(startedRequests.length, 1);
      assert.strictEqual(startedRequests[0].trustTokenOperationDoneEvent(), mockEvent);
    });
  });
});
