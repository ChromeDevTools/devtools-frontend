// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Security from './security.js';

describeWithMockConnection('IPProtectionView', () => {
  let mockView: ViewFunctionStub<typeof Security.IPProtectionView.IPProtectionView>;
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;

  const allStatuses = [
    Protocol.Network.IpProxyStatus.Available,
    Protocol.Network.IpProxyStatus.FeatureNotEnabled,
    Protocol.Network.IpProxyStatus.MaskedDomainListNotEnabled,
    Protocol.Network.IpProxyStatus.MaskedDomainListNotPopulated,
    Protocol.Network.IpProxyStatus.AuthTokensUnavailable,
    Protocol.Network.IpProxyStatus.Unavailable,
    Protocol.Network.IpProxyStatus.BypassedByDevTools,
    null,
  ];

  beforeEach(() => {
    mockView = createViewFunctionStub(Security.IPProtectionView.IPProtectionView);
    stubNoopSettings();
    target = createTarget();
    networkManager = target.model(SDK.NetworkManager.NetworkManager)!;
    assert.exists(networkManager);
  });

  afterEach(() => {
    sinon.restore();
  });

  for (const status of allStatuses) {
    it(`should render the status "${status}"`, async () => {
      // Mock the promise returned by getIpProtectionProxyStatus.
      const getIpProtectionProxyStatusStub =
          sinon.stub(networkManager, 'getIpProtectionProxyStatus').resolves(status as Protocol.Network.IpProxyStatus);

      // Instantiate the view, which will immediately call wasShown() and fetch the status.
      const view = new Security.IPProtectionView.IPProtectionView(undefined, mockView);

      // Wait for the asynchronous operations to complete and the view to update.
      await view.wasShown();
      await mockView.nextInput;

      // Assert that the mocked method was called.
      sinon.assert.called(getIpProtectionProxyStatusStub);

      // Assert that the view's input now contains the expected status.
      assert.deepEqual(mockView.input.status, status);
    });
  }
});
