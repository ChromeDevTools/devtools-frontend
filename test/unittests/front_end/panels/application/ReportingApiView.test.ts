// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import * as ApplicationComponents from '../../../../../front_end/panels/application/components/components.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithMockConnection('ReportingApiView', () => {
  const ORIGIN_1 = 'origin1';
  const ENDPOINTS_1 = [{url: 'url1', groupName: 'group1'}];
  const ORIGIN_2 = 'origin2';
  const ENDPOINTS_2 = [{url: 'url2', groupName: 'group1'}, {url: 'url3', groupName: 'group2'}];

  it('updates endpoints grid when they change without tab target', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(networkManager);

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

  it('updates endpoints grid when they change with tab target', () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const frameTarget = createTarget({parentTarget: tabTarget});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const networkManager = frameTarget.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(networkManager);

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
