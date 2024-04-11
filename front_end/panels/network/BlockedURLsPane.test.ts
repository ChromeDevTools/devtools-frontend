// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import {createTarget, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Network from './network.js';

describeWithMockConnection('BlockedURLsPane', () => {
  beforeEach(() => {
    registerNoopActions([
      'network.add-network-request-blocking-pattern',
      'network.remove-all-network-request-blocking-patterns',
    ]);
  });

  describe('update', () => {
    const updatesOnRequestFinishedEvent = (inScope: boolean) => () => {
      const target = createTarget();
      const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      assert.exists(networkManager);
      const updateStub = sinon.stub(blockedURLsPane, 'update');

      const request = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest, {
        wasBlocked: true,
        url: 'http://example.com' as Platform.DevToolsPath.UrlString,
      });
      networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

      assert.strictEqual(updateStub.calledOnce, inScope);
    };

    it('is called upon RequestFinished event (when target is in scope)', updatesOnRequestFinishedEvent(true));
    it('is called upon RequestFinished event (when target is out of scope)', updatesOnRequestFinishedEvent(false));

    it('is called upon Reset event', () => {
      const blockedURLsPane = new Network.BlockedURLsPane.BlockedURLsPane();
      const updateStub = sinon.stub(blockedURLsPane, 'update');

      Logs.NetworkLog.NetworkLog.instance().dispatchEventToListeners(
          Logs.NetworkLog.Events.Reset, {clearIfPreserved: true});

      assert.isTrue(updateStub.calledOnce);
    });
  });
});
