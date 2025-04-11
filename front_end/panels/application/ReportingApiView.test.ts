// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

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
    sinon.assert.calledOnce(endpointsGridData.set);
    sinon.assert.calledWith(endpointsGridData.set, {endpoints: new Map([[ORIGIN_1, ENDPOINTS_1]])});

    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: ORIGIN_2, endpoints: ENDPOINTS_2});
    sinon.assert.calledTwice(endpointsGridData.set);
    sinon.assert.calledWith(
        endpointsGridData.set, {endpoints: new Map([[ORIGIN_1, ENDPOINTS_1], [ORIGIN_2, ENDPOINTS_2]])});
  });

  it('shows placeholder if no report or endpoint data is available yet', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const endpointsGrid = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    const view = new Application.ReportingApiView.ReportingApiView(endpointsGrid);

    assert.exists(view.element.querySelector('.empty-state'));
    assert.deepEqual(view.element.querySelector('.empty-state-header')?.textContent, 'No report or endpoint');
    assert.deepEqual(
        view.element.querySelector('.empty-state-description > span')?.textContent,
        'On this page you will be able to inspect Reporting API reports and endpoints.');
  });

  it('shows reports (main element) and endpoints (sidebar element) if endpoint appears', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const endpointsGrid = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    const view = new Application.ReportingApiView.ReportingApiView(endpointsGrid);

    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: 'dummy', endpoints: []});
    assert.strictEqual(view.showMode(), UI.SplitWidget.ShowMode.BOTH);
    assert.isNotNull(view.mainWidget());
    assert.instanceOf(view.mainWidget(), Application.ReportingApiReportsView.ReportingApiReportsView);
    assert.isNotNull(view.sidebarElement());
  });

  it('shows reports (main element) and endpoints (sidebar element) if report appears', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const endpointsGrid = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    const view = new Application.ReportingApiView.ReportingApiView(endpointsGrid);

    const report = {
      id: 'some_id' as Protocol.Network.ReportId,
      initiatorUrl: 'https://example.com/script.js',
      destination: 'main-endpoint',
      type: 'deprecation',
      timestamp: 1,
      depth: 1,
      completedAttempts: 0,
      body: {
        columnNumber: 8,
        id: 'PrefixedStorageInfo',
        lineNumber: 15,
        message: '',
        sourceFile: 'https://example.com/script.js',
      },
      status: Protocol.Network.ReportStatus.Queued,
    };

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, report);
    assert.strictEqual(view.showMode(), UI.SplitWidget.ShowMode.BOTH);
    assert.isNotNull(view.mainWidget());
    assert.instanceOf(view.mainWidget(), Application.ReportingApiReportsView.ReportingApiReportsView);
    assert.isNotNull(view.sidebarElement());
  });
});
