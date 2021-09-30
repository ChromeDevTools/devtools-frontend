// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import * as DataGrid from '../../../../../front_end/ui/components/data_grid/data_grid.js';
import {raf} from '../../helpers/DOMHelpers.js';

import View = Resources.ReportingApiReportsView;

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

describeWithMockConnection('ReportingApiReportsView', () => {
  let networkManager: SDK.NetworkManager.NetworkManager|null;

  beforeEach(() => {
    const target = createTarget();
    networkManager = target.model(SDK.NetworkManager.NetworkManager);
  });

  it('listens to and stores added reports', () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const view = new View.ReportingApiReportsView(networkManager);

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[1]);
    assert.deepEqual(view.getReports(), reports);
  });

  it('can handle report updates', () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const view = new View.ReportingApiReportsView(networkManager);

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
    assert.deepEqual(view.getReports(), [successReport]);
  });

  it('updates sidebarWidget upon receiving cellFocusedEvent', async () => {
    if (!networkManager) {
      throw new Error('No networkManager');
    }
    const view = new View.ReportingApiReportsView(networkManager);

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[0]);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.ReportingApiReportAdded, reports[1]);
    const grid = view.getReportsGrid();
    const cells = [
      {
        columnId: 'id',
        value: 'some_id',
      },
      {
        columnId: 'status',
        value: 'Queued',
      },
    ];
    const stub = sinon.stub(view, 'setSidebarWidget');
    assert.isTrue(stub.notCalled);
    grid.dispatchEvent(
        new DataGrid.DataGridEvents.BodyCellFocusedEvent({columnId: 'status', value: 'Queued'}, {cells}));
    await raf();
    assert.isTrue(stub.calledOnce);
  });
});
