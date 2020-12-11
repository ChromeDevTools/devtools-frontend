// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDKModule from '../../../../front_end/sdk/sdk.js';
import * as Common from '../../../../front_end/common/common.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

describeWithEnvironment('MultitargetNetworkManager', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  describe('_generateBrandVersionList', () => {
    it('produces expected things for M84', () => {
      // Matches ChromeContentBrowserClientTest.GenerateBrandVersionList
      const res = SDK.NetworkManager.MultitargetNetworkManager._generateBrandVersionList(84, 'Totally A Brand', '84');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, '\\Not"A;Brand');
      assert.strictEqual(res[0].version, '99');
      assert.strictEqual(res[1].brand, 'Chromium');
      assert.strictEqual(res[1].version, '84');
      assert.strictEqual(res[2].brand, 'Totally A Brand');
      assert.strictEqual(res[2].version, '84');
    });
    it('produces a different shuffle for M85', () => {
      // See a different order for 85 and different non-brand. Also check at
      // non-integer version, just in case someone non-Chrome wants it.
      const res = SDK.NetworkManager.MultitargetNetworkManager._generateBrandVersionList(85, 'Totally A Brand', '85.1');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, '\\Not;A"Brand');
      assert.strictEqual(res[0].version, '99');
      assert.strictEqual(res[1].brand, 'Totally A Brand');
      assert.strictEqual(res[1].version, '85.1');
      assert.strictEqual(res[2].brand, 'Chromium');
      assert.strictEqual(res[2].version, '85.1');
    });
    it('produces a different shuffle for M86', () => {
      // See a different order for 86.
      const res = SDK.NetworkManager.MultitargetNetworkManager._generateBrandVersionList(86, 'Totally A Brand', '86');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, 'Chromium');
      assert.strictEqual(res[0].version, '86');
      assert.strictEqual(res[1].brand, '"Not\\A;Brand');
      assert.strictEqual(res[1].version, '99');
      assert.strictEqual(res[2].brand, 'Totally A Brand');
      assert.strictEqual(res[2].version, '86');
    });
  });

  describe('Trust Token done event', () => {
    it('is not lost when arriving before the corresponding requestWillBeSent event', () => {
      // 1) Setup a NetworkManager and listen to "RequestStarted" events.
      const networkManager = new Common.ObjectWrapper.ObjectWrapper();
      const startedRequests: SDKModule.NetworkRequest.NetworkRequest[] = [];
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, event => {
        const request = event.data.request as SDKModule.NetworkRequest.NetworkRequest;
        startedRequests.push(request);
      });
      const networkDispatcher =
          new SDK.NetworkManager.NetworkDispatcher(networkManager as SDKModule.NetworkManager.NetworkManager);

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
