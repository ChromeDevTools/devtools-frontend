// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Application from './application.js';
import * as ApplicationComponents from './components/components.js';

describeWithMockConnection('ReportingApiView', () => {
  const ORIGIN_1 = 'origin1';
  const ENDPOINTS_1 = [{url: 'url1', groupName: 'group1'}];
  const ORIGIN_2 = 'origin2';
  const ENDPOINTS_2 = [{url: 'url2', groupName: 'group1'}, {url: 'url3', groupName: 'group2'}];

  it('updates endpoints grid when they change', () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const frameTarget = createTarget({parentTarget: tabTarget});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const networkManager = frameTarget.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const endpointsGrid = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    new Application.ReportingApiView.ReportingApiView(endpointsGrid);
    const endpointsGridData = sinon.spy(endpointsGrid, 'data', ['set']);
    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: ORIGIN_1, endpoints: ENDPOINTS_1});
    assert.isTrue(endpointsGridData.set.calledOnce);
    sinon.assert.calledWith(endpointsGridData.set, {endpoints: new Map([[ORIGIN_1, ENDPOINTS_1]])});

    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: ORIGIN_2, endpoints: ENDPOINTS_2});
    assert.isTrue(endpointsGridData.set.calledTwice);
    sinon.assert.calledWith(
        endpointsGridData.set, {endpoints: new Map([[ORIGIN_1, ENDPOINTS_1], [ORIGIN_2, ENDPOINTS_2]])});
  });
});
