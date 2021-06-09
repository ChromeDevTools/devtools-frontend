// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import {MockNetworkLog, createNetworkRequest} from './MockNetworkLog.js';

describe('RequestResolver', () => {
  describe('tryGetNetworkRequest', () => {
    it('should resolve an existing request', () => {
      const mockRequest = createNetworkRequest('foo');
      const networkLog = new MockNetworkLog([mockRequest]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.tryGetNetworkRequest('foo', () => {
        throw new Error('This should not get called');
      });
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });

    it('should not resolve an unknown request', () => {
      const networkLog = new MockNetworkLog([]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.tryGetNetworkRequest('foo', () => {
        throw new Error('This should not get called');
      });
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, null);
    });

    it('should resolve a previously unknown request when it becomes available', async () => {
      const mockNetworkLog = new MockNetworkLog([]);
      const networkLog = mockNetworkLog as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const waitForCall = new Promise<SDK.NetworkRequest.NetworkRequest>(resolve => {
        const request = requestResolver.tryGetNetworkRequest('foo', resolve);
        assert.strictEqual(request, null);
      });
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      const mockRequest = createNetworkRequest('foo');
      mockNetworkLog.addRequest(mockRequest);
      const request = await waitForCall;
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });
  });

  describe('waitForNetworkRequest', () => {
    it('should resolve an existing request', async () => {
      const mockRequest = createNetworkRequest('foo');
      const networkLog = new MockNetworkLog([mockRequest]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = await requestResolver.waitForNetworkRequest('foo');
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });

    it('should reject the promise after `clear` has been called', async () => {
      const networkLog = new MockNetworkLog([]) as unknown as Logs.NetworkLog.NetworkLog;
      const requestResolver = new Logs.RequestResolver.RequestResolver(networkLog);
      const request = requestResolver.waitForNetworkRequest('foo');
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
      const requestPromise = requestResolver.waitForNetworkRequest('foo');
      assert.isTrue(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      const mockRequest = createNetworkRequest('foo');
      mockNetworkLog.addRequest(mockRequest);
      const request = await requestPromise;
      assert.isFalse(networkLog.hasEventListeners(Logs.NetworkLog.Events.RequestAdded));
      assert.strictEqual(request, mockRequest);
    });
  });
});
