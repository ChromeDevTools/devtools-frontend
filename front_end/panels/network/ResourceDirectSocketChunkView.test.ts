// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {dispatchClickEvent, doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';

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
    openInfo: {remoteAddr: 'www.sample.com', remotePort: 3005, localAddr: '127.0.0.1', localPort: 9472},
  };
  networkRequest.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
  networkRequest.setIssueTime(Date.now(), Date.now());
  return networkRequest;
}

describeWithEnvironment('ResourceDirectSocketChunkView', () => {
  let chunkView: Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView|undefined;

  beforeEach(() => {
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
    container.style.width = '600px';
    container.style.height = '400px';
    renderElementIntoDOM(container, {includeCommonStyles: true});

    const view = new Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView(request);
    view.markAsRoot();
    view.show(container);
    await view.updateComplete;

    const filterInput = getFilterInputForTest(view.contentElement) as HTMLInputElement;
    filterInput.value = '';
    filterInput.dispatchEvent(new Event('change'));
    await view.updateComplete;

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
      await chunkView.updateComplete;

      await assertGridData(chunkView, [
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
    await chunkView.updateComplete;

    await assertGridData(chunkView, [
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
    await chunkView.updateComplete;

    const dataGrid = getDataGridForTest(chunkView.contentElement);
    // The rows are rendered via Lit into a <template> tag's content within the DataGridElement.
    const template = dataGrid.querySelector('template');
    const root = template ? template.content : dataGrid;
    const configRow = root.querySelector('tr[data-index]');
    assert.exists(configRow);
    configRow.dispatchEvent(new CustomEvent('select', {bubbles: true}));
    await chunkView.updateComplete;

    const sidebarWidget = chunkView.getSplitWidgetForTest();
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
    await chunkView.updateComplete;
    await assertGridData(chunkView, [['c29tZSBkYXRh', '9\xA0B', '22:13:20.123']]);

    const clearButton = getClearAllButtonForTest(chunkView.contentElement);

    dispatchClickEvent(clearButton);
    await chunkView.updateComplete;

    await assertGridData(chunkView, []);
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

    const filterInput = getFilterInputForTest(chunkView.contentElement) as HTMLInputElement;
    filterInput.value = 'c29tZ';
    filterInput.dispatchEvent(new Event('change'));
    await chunkView.updateComplete;

    await assertGridData(chunkView, [
      ['c29tZSBkYXRhIDE=', '11\xA0B', '22:13:20.123'],
      ['c29tZSBkYXRhIDM=', '11\xA0B', '22:13:22.789'],
    ]);

    filterInput.value = 'b3Ro';
    filterInput.dispatchEvent(new Event('change'));
    await chunkView.updateComplete;
    await assertGridData(chunkView, [
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
    const filterCombobox = getFilterTypeComboboxForTest(chunkView.contentElement);

    // Filter by SEND.
    filterCombobox.value = 'send';
    filterCombobox.dispatchEvent(new Event('change'));
    await chunkView.updateComplete;
    await assertGridData(chunkView, [['c2VuZA==', '4\xA0B', '22:13:20.123']]);

    // Filter by RECEIVE.
    filterCombobox.value = 'receive';
    filterCombobox.dispatchEvent(new Event('change'));
    await chunkView.updateComplete;
    await assertGridData(chunkView, [['cmVjZWl2ZQ==', '7\xA0B', '22:13:21.456']]);

    // Filter by ALL.
    filterCombobox.value = 'all';
    filterCombobox.dispatchEvent(new Event('change'));
    await chunkView.updateComplete;
    await assertGridData(chunkView, [
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
    await chunkView.updateComplete;

    // Initial sort is ASC by time.
    await assertGridData(chunkView, [
      ['Mg==', '1\xA0B', '22:13:20.456'],
      ['MQ==', '1\xA0B', '22:13:21.123'],
    ]);

    // Click time header to sort DESC.
    const dataGrid = getDataGridForTest(chunkView.contentElement);
    const timeHeader =
        dataGrid.shadowRoot?.querySelector('th.time-column') ?? dataGrid.querySelector('th[jslog*="context: time"]');
    assert.instanceOf(timeHeader, HTMLTableCellElement);
    dispatchClickEvent(timeHeader);
    await chunkView.updateComplete;
    await assertGridData(chunkView, [
      ['MQ==', '1\xA0B', '22:13:21.123'],
      ['Mg==', '1\xA0B', '22:13:20.456'],
    ]);

    // Click time header to sort ASC again.
    dispatchClickEvent(timeHeader);
    await chunkView.updateComplete;
    await assertGridData(chunkView, [
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
  const grid = getDataGridForTest(view.contentElement);
  const root = grid.shadowRoot ?? grid;
  // DataGridImpl puts its rows in tbody with class 'data-grid-data-grid-node'
  const rows = Array.from(root.querySelectorAll('tbody tr.data-grid-data-grid-node'));
  return rows.map(row => {
    // DataGridImpl creates tds with class 'xxx-column'
    // Filter out the corner column that is sometimes added by DataGridImpl
    const cells = Array.from(row.querySelectorAll('td')).filter(c => !c.classList.contains('corner'));
    return cells.map(cell => (cell.innerText || cell.textContent || '').trim());
  });
}

async function assertGridData(view: Network.ResourceDirectSocketChunkView.ResourceDirectSocketChunkView,
                              rowsExpected: string[][]): Promise<void> {
  await doubleRaf();
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

function getDataGridForTest(contentElement: HTMLElement): HTMLElement {
  return contentElement.querySelector('devtools-data-grid') as HTMLElement;
}

function getFilterInputForTest(contentElement: HTMLElement): HTMLElement {
  return contentElement.querySelector('devtools-toolbar-input') as HTMLElement;
}

function getClearAllButtonForTest(contentElement: HTMLElement): HTMLElement {
  return contentElement.querySelector('devtools-button') as HTMLElement;
}

function getFilterTypeComboboxForTest(contentElement: HTMLElement): HTMLSelectElement {
  return contentElement.querySelector('select') as HTMLSelectElement;
}
