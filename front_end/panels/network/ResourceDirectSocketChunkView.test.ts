// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {
  setUpEnvironment,
} from '../../testing/OverridesHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

function createNetworkRequest(type: SDK.NetworkRequest.DirectSocketType) {
  const networkRequest = SDK.NetworkRequest.NetworkRequest.createForSocket(
      'requestId' as Protocol.Network.RequestId, urlString`www.example.com/some/path:3000`);
  networkRequest.hasNetworkData = true;
  networkRequest.setRemoteAddress('www.example.com', 3000);

  switch (type) {
    case SDK.NetworkRequest.DirectSocketType.TCP:
      networkRequest.protocol = 'tcp';
      break;
    case SDK.NetworkRequest.DirectSocketType.UDP_BOUND, SDK.NetworkRequest.DirectSocketType.UDP_CONNECTED:
      networkRequest.protocol = 'udp';
      break;
  }

  networkRequest.statusText = 'Opening';
  networkRequest.directSocketInfo = {
    type,
    status: SDK.NetworkRequest.DirectSocketStatus.OPEN,
    createOptions: {
      remoteAddr: 'www.example.com/some/path',
      remotePort: 3000,
      noDelay: false,
      keepAliveDelay: 1001,
      sendBufferSize: 1002,
      receiveBufferSize: 1003,
      dnsQueryType: Protocol.Network.DirectSocketDnsQueryType.Ipv4,
    },
    openInfo: {remoteAddr: 'www.sample.com', remotePort: 3005, localAddr: '127.0.0.1', localPort: 9472}
  };
  networkRequest.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
  networkRequest.setIssueTime(Date.now(), Date.now());
  return networkRequest;
}

describeWithEnvironment('ResourceDirectSocketChunkView', () => {
  let chunkView: Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView|undefined;

  beforeEach(() => {
    setUpEnvironment();
    Common.Settings.Settings.instance().clearAll();
  });

  afterEach(() => {
    if (chunkView) {
      chunkView.detach();
      chunkView = undefined;
    }
  });

  async function renderView(request: SDK.NetworkRequest.NetworkRequest):
      Promise<Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView> {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const view = new Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView(request);
    view.markAsRoot();
    view.show(container);

    view.getFilterInputForTest().setValue('', false);

    return view;
  }

  for (const [testName, type] of [
           ['tcp', SDK.NetworkRequest.DirectSocketType.TCP],
           ['udp_connected', SDK.NetworkRequest.DirectSocketType.UDP_CONNECTED],
  ]) {
    it(`renders ${testName} messages with correct columns`, async () => {
      const request = createNetworkRequest(type as SDK.NetworkRequest.DirectSocketType);
      request.addDirectSocketChunk({
        data: 'c29tZSBkYXRh',
        type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
        timestamp: 1700000000.123,
      });
      request.addDirectSocketChunk({
        data: 'c29tZSBkYXRhIDI=',
        type: SDK.NetworkRequest.DirectSocketChunkType.RECEIVE,
        timestamp: 1700000001.456,
      });

      chunkView = await renderView(request);
      await RenderCoordinator.done();

      assertGridData(chunkView, [
        ['c29tZSBkYXRh', '9\xA0B', '22:13:20.123'],
        ['c29tZSBkYXRhIDI=', '11\xA0B', '22:13:21.456'],
      ]);
    });
  }

  it('renders UDP bound messages with correct columns', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.UDP_BOUND);
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRh',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000000.123,
      remoteAddress: '192.168.0.1',
      remotePort: 12345,
    });
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRhIDI=',
      type: SDK.NetworkRequest.DirectSocketChunkType.RECEIVE,
      timestamp: 1700000001.456,
      remoteAddress: '134.168.0.1',
      remotePort: 54321,
    });

    chunkView = await renderView(request);
    await RenderCoordinator.done();

    assertGridData(chunkView, [
      ['c29tZSBkYXRh', '192.168.0.1', '12345', '9\xA0B', '22:13:20.123'],
      ['c29tZSBkYXRhIDI=', '134.168.0.1', '54321', '11\xA0B', '22:13:21.456'],
    ]);
  });

  it('shows binary view on click', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.TCP);
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRh',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000000.123,
    });

    chunkView = await renderView(request);
    await RenderCoordinator.done();

    const dataGrid = chunkView.getDataGridForTest();
    dataGrid.rootNode().children[0].select();
    await RenderCoordinator.done();

    const splitWidget = chunkView.getSplitWidgetForTest();
    const sidebarWidget = splitWidget.sidebarWidget();
    assert.instanceOf(sidebarWidget, Network.BinaryResourceView.BinaryResourceView);
  });

  it('clears messages with "Clear All" button', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.TCP);
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRh',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000000.123,
    });

    chunkView = await renderView(request);
    await RenderCoordinator.done();
    assertGridData(chunkView, [['c29tZSBkYXRh', '9\xA0B', '22:13:20.123']]);

    const clearButton = chunkView.getClearAllButtonForTest();

    dispatchClickEvent(clearButton.element);
    await RenderCoordinator.done();

    assertGridData(chunkView, []);
  });

  it('filters messages by regex', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.TCP);
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRhIDE=',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000000.123,
    });
    request.addDirectSocketChunk({
      data: 'b3RoZXIgZGF0YSAy',
      type: SDK.NetworkRequest.DirectSocketChunkType.RECEIVE,
      timestamp: 1700000001.456,
    });
    request.addDirectSocketChunk({
      data: 'c29tZSBkYXRhIDM=',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000002.789,
    });

    chunkView = await renderView(request);

    const filterInput = chunkView.getFilterInputForTest();
    filterInput.setValue('c29tZ', true);
    await RenderCoordinator.done();

    assertGridData(chunkView, [
      ['c29tZSBkYXRhIDE=', '11\xA0B', '22:13:20.123'],
      ['c29tZSBkYXRhIDM=', '11\xA0B', '22:13:22.789'],
    ]);

    filterInput.setValue('b3Ro', true);
    await RenderCoordinator.done();
    assertGridData(chunkView, [
      ['b3RoZXIgZGF0YSAy', '12\xA0B', '22:13:21.456'],
    ]);
  });

  it('filters messages by type (SEND/RECEIVE/ALL)', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.TCP);
    request.addDirectSocketChunk({
      data: 'c2VuZA==',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000000.123,
    });
    request.addDirectSocketChunk({
      data: 'cmVjZWl2ZQ==',
      type: SDK.NetworkRequest.DirectSocketChunkType.RECEIVE,
      timestamp: 1700000001.456,
    });

    chunkView = await renderView(request);
    const filterCombobox = chunkView.getFilterTypeComboboxForTest();

    // Filter by SEND.
    filterCombobox.element.value = 'send';
    filterCombobox.element.dispatchEvent(new Event('change'));
    await RenderCoordinator.done();
    assertGridData(chunkView, [['c2VuZA==', '4\xA0B', '22:13:20.123']]);

    // Filter by RECEIVE.
    filterCombobox.element.value = 'receive';
    filterCombobox.element.dispatchEvent(new Event('change'));
    await RenderCoordinator.done();
    assertGridData(chunkView, [['cmVjZWl2ZQ==', '7\xA0B', '22:13:21.456']]);

    // Filter by ALL.
    filterCombobox.element.value = 'all';
    filterCombobox.element.dispatchEvent(new Event('change'));
    await RenderCoordinator.done();
    assertGridData(chunkView, [
      ['c2VuZA==', '4\xA0B', '22:13:20.123'],
      ['cmVjZWl2ZQ==', '7\xA0B', '22:13:21.456'],
    ]);
  });

  it('sorts messages by time column (ASC/DESC)', async () => {
    const request = createNetworkRequest(SDK.NetworkRequest.DirectSocketType.TCP);
    request.addDirectSocketChunk({
      data: 'MQ==',
      type: SDK.NetworkRequest.DirectSocketChunkType.SEND,
      timestamp: 1700000001.123,
    });
    request.addDirectSocketChunk({
      data: 'Mg==',
      type: SDK.NetworkRequest.DirectSocketChunkType.RECEIVE,
      timestamp: 1700000000.456,
    });

    chunkView = await renderView(request);
    await RenderCoordinator.done();

    // Initial sort is ASC by time.
    assertGridData(chunkView, [
      ['Mg==', '1\xA0B', '22:13:20.456'],
      ['MQ==', '1\xA0B', '22:13:21.123'],
    ]);

    // Click time header to sort DESC.
    const dataGrid = chunkView.getDataGridForTest();
    const timeHeader = dataGrid.element.querySelector('th[jslog*="context: time"]');
    assert.instanceOf(timeHeader, HTMLTableCellElement);
    dispatchClickEvent(timeHeader);
    await RenderCoordinator.done();
    assertGridData(chunkView, [
      ['MQ==', '1\xA0B', '22:13:21.123'],
      ['Mg==', '1\xA0B', '22:13:20.456'],
    ]);

    // Click time header to sort ASC again.
    dispatchClickEvent(timeHeader);
    await RenderCoordinator.done();
    assertGridData(chunkView, [
      ['Mg==', '1\xA0B', '22:13:20.456'],
      ['MQ==', '1\xA0B', '22:13:21.123'],
    ]);
  });
});

function assertTime(actual: string, expectedMillis: string): void {
  assert.match(actual, /\d{2}:\d{2}:\d{2}\.\d{3}/);
  assert.isTrue(actual.endsWith(expectedMillis));
}

function getInnerTextOfGrid(view: Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView): string[][] {
  const grid = view.getDataGridForTest();
  return grid.rootNode().children.map(row => {
    return Object.keys(row.data).map(key => {
      const value = row.data[key];

      if (value instanceof HTMLDivElement) {
        return value.innerText.trim();
      }
      return value.toString().trim();
    });
  });
}

function assertGridData(
    view: Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView, rowsExpected: string[][]): void {
  const actualGridData = getInnerTextOfGrid(view);
  assert.lengthOf(actualGridData, rowsExpected.length, 'Number of rows should match');

  for (let i = 0; i < rowsExpected.length; i++) {
    const expectedRow = rowsExpected[i];
    const actualRow = actualGridData[i];
    assert.lengthOf(actualRow, expectedRow.length, `Number of columns in row ${i} should match`);

    // Time is always the last column. It is checked differently,
    // because the time is converted using local timezone.
    for (let j = 0; j < expectedRow.length; j++) {
      if (j === expectedRow.length - 1) {
        assertTime(actualRow[j], expectedRow[j].substring(expectedRow[j].lastIndexOf('.') + 1));
      } else {
        assert.strictEqual(actualRow[j], expectedRow[j], `Row ${i}, Column ${j} data should match`);
      }
    }
  }
}
