// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';
import * as ApplicationComponents from './components/components.js';

const endpoints = [{url: 'www.reporting-endpoint.com', groupName: 'endpointName'}];
const reports = [
  {
    id: 'some_id' as Protocol.Network.ReportId,
    initiatorUrl: 'https://example.com/script.js',
    destination: 'main-endpoint',
    type: 'deprecation',
    timestamp: 1632747042.12696,
    depth: 1,
    completedAttempts: 0,
    body: {
      columnNumber: 8,
      id: 'PrefixedStorageInfo',
      lineNumber: 15,
      message:
          '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' or \'navigator.webkitPersistentStorage\' instead.',
      sourceFile: 'https://example.com/script.js',
    },
    status: Protocol.Network.ReportStatus.Queued,
  },
  {
    id: 'another_id' as Protocol.Network.ReportId,
    initiatorUrl: 'https://www.google.com/script.js',
    destination: 'default',
    type: 'csp-violation',
    timestamp: 1632747045.39856,
    depth: 1,
    completedAttempts: 0,
    body: {
      blockedURL: 'https://www.google.com/script.js',
      disposition: 'enforce',
      documentURL: 'https://www.google.com/document',
      effectiveDirective: 'script-src-elem',
      originalPolicy: 'script-src \'self\'; object-src \'none\'; report-to main-endpoint;',
      statusCode: 200,
    },
    status: Protocol.Network.ReportStatus.Queued,
  },
];

describeWithMockConnection('ReportingApiView', () => {
  const ORIGIN_1 = 'origin1';
  const ENDPOINTS_1 = [{url: 'url1', groupName: 'group1'}];
  const ORIGIN_2 = 'origin2';
  const ENDPOINTS_2 = [{url: 'url2', groupName: 'group1'}, {url: 'url3', groupName: 'group2'}];

  async function createComponent() {
    const view = createViewFunctionStub(Application.ReportingApiView.ReportingApiView);
    const endpointsGrid = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    const widget = new Application.ReportingApiView.ReportingApiView(endpointsGrid, view);

    const container = document.createElement('div');
    renderElementIntoDOM(container);
    widget.markAsRoot();
    widget.show(container);
    await view.nextInput;

    return {view};
  }

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

  it('shows placeholder if there is no report and no endpoint', async () => {
    const {view} = await createComponent();
    assert.isFalse(view.input.hasEndpoints);
    assert.isFalse(view.input.hasReports);
    assert.isUndefined(view.input.focusedReport);

    const viewEndpoints = view.input.endpointsGrid.data.endpoints;
    assert.strictEqual(viewEndpoints.size, 0);

    const viewReports = view.input.reportsGrid.data.reports;
    assert.lengthOf(viewReports, 0);
  });

  it('shows only endpoints when endpoint event is received', async () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const {view} = await createComponent();

    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: 'dummy', endpoints});
    await view.nextInput;

    assert.isTrue(view.input.hasEndpoints);
    assert.isFalse(view.input.hasReports);
    assert.isUndefined(view.input.focusedReport);

    const viewEndpoints = view.input.endpointsGrid.data.endpoints;
    assert.strictEqual(viewEndpoints.size, 1);
    const dummyEndpoints = viewEndpoints.get('dummy');
    assert.deepEqual(dummyEndpoints, endpoints);

    const reports = view.input.reportsGrid.data.reports;
    assert.lengthOf(reports, 0);
  });

  it('shows only reports when report events are received', async () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const {view} = await createComponent();

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[1]);
    await view.nextInput;

    assert.isFalse(view.input.hasEndpoints);
    assert.isTrue(view.input.hasReports);
    assert.isUndefined(view.input.focusedReport);

    const viewEndpoints = view.input.endpointsGrid.data.endpoints;
    assert.strictEqual(viewEndpoints.size, 0);

    const viewReports = view.input.reportsGrid.data.reports;
    assert.deepEqual(viewReports, reports);
  });

  it('shows both reports and endpoints when events for both are received', async () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const {view} = await createComponent();

    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, {origin: 'dummy', endpoints});
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    await view.nextInput;

    assert.isTrue(view.input.hasEndpoints);
    assert.isTrue(view.input.hasReports);
    assert.isUndefined(view.input.focusedReport);

    const viewEndpoints = view.input.endpointsGrid.data.endpoints;
    assert.strictEqual(viewEndpoints.size, 1);
    const dummyEndpoints = viewEndpoints.get('dummy');
    assert.deepEqual(dummyEndpoints, endpoints);

    const viewReports = view.input.reportsGrid.data.reports;
    assert.deepEqual(viewReports, [reports[0]]);
  });

  it('can handle report updates', async () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const {view} = await createComponent();

    const successReport = {
      id: 'some_id' as Protocol.Network.ReportId,
      initiatorUrl: 'https://example.com/script.js',
      destination: 'main-endpoint',
      type: 'deprecation',
      timestamp: 1632747042.12696,
      depth: 1,
      completedAttempts: 1,
      body: {
        columnNumber: 8,
        id: 'PrefixedStorageInfo',
        lineNumber: 15,
        message:
            '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' or \'navigator.webkitPersistentStorage\' instead.',
        sourceFile: 'https://example.com/script.js',
      },
      status: Protocol.Network.ReportStatus.Success,
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportUpdated, successReport);
    await view.nextInput;

    assert.isFalse(view.input.hasEndpoints);
    assert.isTrue(view.input.hasReports);
    assert.isUndefined(view.input.focusedReport);

    const viewEndpoints = view.input.endpointsGrid.data.endpoints;
    assert.strictEqual(viewEndpoints.size, 0);

    const viewReports = view.input.reportsGrid.data.reports;
    assert.deepEqual(viewReports, [successReport]);
  });

  it('shows report details when a report is selected', async () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const {view} = await createComponent();

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[1]);
    await view.nextInput;

    const grid = view.input.reportsGrid;
    assert.isUndefined(view.input.focusedReport);
    grid.dispatchEvent(new CustomEvent('select', {detail: 'some_id'}));
    await view.nextInput;
    assert.strictEqual(view.input.focusedReport, reports[0]);
  });
});
