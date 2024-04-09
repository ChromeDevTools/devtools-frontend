// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createNetworkRequest, MockNetworkLog} from '../../testing/MockNetworkLog.js';
import * as Logs from '../logs/logs.js';

describe('RequestResolver', () => {
  const requestId1 = 'foo' as Protocol.Network.RequestId;

  describe('tryGet', () => {
    it('should resolve an existing request', () => {
      const mockRequest = createNetworkRequest(requestId1);
      const networkLog = new MockNetworkLog([mockRequest]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.tryGet(requestId1, () => {
        throw new Error('This should not get called');
      });
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });

    it('should not resolve an unknown request', () => {
      const networkLog = new MockNetworkLog([]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.tryGet(requestId1, () => {
        throw new Error('This should not get called');
      });
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, null);
      requestResolver.clear();
    });

    it('should resolve a previously unknown request when it becomes available', async () => {
      const mockNetworkLog = new MockNetworkLog([]);
      const networkLog = mockNetworkLog as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const waitForCall = new Promise<SDK.NetworkRequest.NetworkRequest>(resolve => {
        const request = requestResolver.tryGet(requestId1, resolve);
        assert.strictEqual(request, null);
      });
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      const mockRequest = createNetworkRequest(requestId1);
      mockNetworkLog.addRequest(mockRequest);
      const request = await waitForCall;
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
      requestResolver.clear();
    });
  });

  describe('waitFor', () => {
    it('should resolve an existing request', async () => {
      const mockRequest = createNetworkRequest(requestId1);
      const networkLog = new MockNetworkLog([mockRequest]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = await requestResolver.waitFor(requestId1);
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });

    it('should reject the promise after `clear` has been called', async () => {
      const networkLog = new MockNetworkLog([]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.waitFor(requestId1);
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      requestResolver.clear();
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      try {
        await request;
      } catch (e) {
        return;
      }
      assert.fail('Expected `await request` to throw.');
    });

    it('should resolve a previously unknown request when it becomes available', async () => {
      const mockNetworkLog = new MockNetworkLog([]);
      const networkLog = mockNetworkLog as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const requestPromise = requestResolver.waitFor(requestId1);
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      const mockRequest = createNetworkRequest(requestId1);
      mockNetworkLog.addRequest(mockRequest);
      const request = await requestPromise;
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });
  });
});
