// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';

import * as Network from './network.js';

// Fails compilation if a RequestTimeRangeNames enum value is missing.
const ALL_REQUEST_TIME_RANGE_NAMES: Record<NetworkTimeCalculator.RequestTimeRangeNames, true> = {
  [NetworkTimeCalculator.RequestTimeRangeNames.PUSH]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.DNS]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.PROXY]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING_PUSH]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SENDING]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_ROUTER_EVALUATION]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_CACHE_LOOKUP]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.SSL]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.TOTAL]: true,
  [NetworkTimeCalculator.RequestTimeRangeNames.WAITING]: true,
};

const ALL_RANGE_NAMES = Object.keys(ALL_REQUEST_TIME_RANGE_NAMES) as NetworkTimeCalculator.RequestTimeRangeNames[];

describeWithEnvironment('NetworkWaterfallColumn', () => {
  beforeEach(() => {
    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      console: Common.Console.Console.instance(),
    });
  });
  function createColumn(): Network.NetworkWaterfallColumn.NetworkWaterfallColumn {
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    calculator.setWindow(new NetworkTimeCalculator.NetworkTimeBoundary(0, 100));
    calculator.setDisplayWidth(500);
    const column = new Network.NetworkWaterfallColumn.NetworkWaterfallColumn(calculator);
    column.setRowHeight(20);
    column.setHeaderHeight(20);
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    column.markAsRoot();
    column.show(div);
    return column;
  }

  function createRequestNode(
      timingInfo?: Protocol.Network.ResourceTiming,
      routerInfo?: Protocol.Network.ServiceWorkerRouterInfo): Network.NetworkDataGridNode.NetworkRequestNode {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      timing: timingInfo,
      serviceWorkerRouterInfo: routerInfo,
    });
    const parentView = sinon.createStubInstance(Network.NetworkLogView.NetworkLogView);
    return new Network.NetworkDataGridNode.NetworkRequestNode(parentView, request);
  }

  it('renders requests with service worker router evaluation and cache lookup without throwing', () => {
    const column = createColumn();
    const timingInfo: Protocol.Network.ResourceTiming = {
      requestTime: 500,
      proxyStart: 0,
      proxyEnd: 0,
      dnsStart: 0,
      dnsEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      sslStart: 0,
      sslEnd: 0,
      workerReady: 400,
      workerStart: 500,
      workerRouterEvaluationStart: -200,
      workerCacheLookupStart: -100,
      workerFetchStart: 600,
      workerRespondWithSettled: 700,
      sendStart: 800,
      sendEnd: 900,
      pushStart: 0,
      pushEnd: 0,
      receiveHeadersStart: 1000,
      receiveHeadersEnd: 0,
    };
    const routerInfo: Protocol.Network.ServiceWorkerRouterInfo = {
      ruleIdMatched: 1,
      matchedSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
      actualSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
    };
    const node = createRequestNode(timingInfo, routerInfo);

    assert.doesNotThrow(() => {
      column.update(0, new Map(), [node]);
    });

    column.detach();
  });

  it('declares a color for all RequestTimeRangeNames in RequestTimeRangeNameToColor', () => {
    for (const rangeName of ALL_RANGE_NAMES) {
      assert.exists(Network.NetworkOverview.RequestTimeRangeNameToColor[rangeName],
                    `Missing color in RequestTimeRangeNameToColor for RequestTimeRangeNames.${rangeName}`);
    }
  });

  it('has style entries for all timing bar range names', () => {
    const styleMap = Network.NetworkWaterfallColumn.NetworkWaterfallColumn.buildRequestTimeRangeStyle();
    for (const rangeName of ALL_RANGE_NAMES) {
      if (rangeName === NetworkTimeCalculator.RequestTimeRangeNames.TOTAL ||
          rangeName === NetworkTimeCalculator.RequestTimeRangeNames.SENDING) {
        continue;
      }
      assert.exists(styleMap.get(rangeName), `Missing style in styleMap for ${rangeName}`);
    }
  });

  it('renders requests with all timing ranges without throwing', () => {
    const column = createColumn();
    const timingInfo: Protocol.Network.ResourceTiming = {
      requestTime: 100,
      proxyStart: 10,
      proxyEnd: 20,
      dnsStart: 30,
      dnsEnd: 40,
      connectStart: 50,
      sslStart: 60,
      sslEnd: 70,
      connectEnd: 80,
      workerRouterEvaluationStart: -100,
      workerCacheLookupStart: -50,
      workerStart: 90,
      workerReady: 95,
      workerFetchStart: 100,
      workerRespondWithSettled: 110,
      sendStart: 120,
      sendEnd: 130,
      pushStart: 135,
      pushEnd: 140,
      receiveHeadersStart: 150,
      receiveHeadersEnd: 160,
    };
    const routerInfo: Protocol.Network.ServiceWorkerRouterInfo = {
      ruleIdMatched: 1,
      matchedSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
      actualSourceType: Protocol.Network.ServiceWorkerRouterSource.Cache,
    };
    const node = createRequestNode(timingInfo, routerInfo);
    const request = node.request();
    assert.exists(request);
    request.responseReceivedTime = 100.160;
    request.endTime = 100.170;

    const ranges = NetworkTimeCalculator.calculateRequestTimeRanges(request, 0);
    assert.isAbove(ranges.length, 0);

    assert.doesNotThrow(() => {
      column.update(0, new Map(), [node]);
    });

    column.detach();
  });

  describe('presenter', () => {
    interface ColumnOptions {
      width?: number;
      height?: number;
      headerHeight?: number;
      rowHeight?: number;
    }

    function createColumnWithViewStub(options: ColumnOptions = {}): {
      column: Network.NetworkWaterfallColumn.NetworkWaterfallColumn,
      view: ViewFunctionStub<typeof Network.NetworkWaterfallColumn.NetworkWaterfallColumn>,
      canvas: HTMLCanvasElement,
    } {
      const {width = 300, height = 200, headerHeight = 20, rowHeight = 20} = options;
      const canvas = document.createElement('canvas');
      const view = createViewFunctionStub(Network.NetworkWaterfallColumn.NetworkWaterfallColumn, {canvas});
      const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
      calculator.setWindow(new NetworkTimeCalculator.NetworkTimeBoundary(0, 100));
      const column = new Network.NetworkWaterfallColumn.NetworkWaterfallColumn(calculator, view);
      column.setRowHeight(rowHeight);
      column.setHeaderHeight(headerHeight);
      column.contentElement.style.width = `${width}px`;
      column.contentElement.style.height = `${height}px`;
      renderElementIntoDOM(column);
      return {column, view, canvas};
    }

    function createSelectableRequestNode(): {
      node: Network.NetworkDataGridNode.NetworkRequestNode,
      dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<Network.NetworkDataGridNode.NetworkNode>,
    } {
      const parentView = sinon.createStubInstance(Network.NetworkLogView.NetworkLogView);
      parentView.rowHeight.returns(20);
      const node = new Network.NetworkDataGridNode.NetworkRequestNode(
          parentView, createNetworkRequest({url: 'https://www.example.com'}));
      const dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid<Network.NetworkDataGridNode.NetworkNode>({
        displayName: 'Network Log',
        columns: [],
      });
      dataGrid.rootNode().appendChild(node);
      return {node, dataGrid};
    }

    it('passes the canvas size to the view', () => {
      const {column, view} = createColumnWithViewStub({width: 300, height: 200});

      column.setRightPadding(20);
      column.update(0, new Map(), []);

      assert.strictEqual(view.input.width, 280);
      assert.strictEqual(view.input.height, 200);
      assert.strictEqual(view.input.pixelRatio, window.devicePixelRatio);
    });

    it('clears the canvas on every redraw', () => {
      const {column, canvas} = createColumnWithViewStub();
      const context = canvas.getContext('2d');
      assert.isOk(context);
      const reset = sinon.spy(context, 'reset');

      column.update(0, new Map(), []);
      column.update(10);

      sinon.assert.calledTwice(reset);
    });

    it('does not handle clicks on the header', () => {
      const {column, view} = createColumnWithViewStub({headerHeight: 20, rowHeight: 20});
      const {node} = createSelectableRequestNode();
      column.update(0, new Map(), [node]);

      assert.isFalse(view.input.onClick(10));
      assert.isFalse(node.selected);
    });

    it('selects the row when clicking on it', () => {
      const {column, view} = createColumnWithViewStub({headerHeight: 20, rowHeight: 20});
      const {node, dataGrid} = createSelectableRequestNode();
      const focus = sinon.spy(dataGrid.element, 'focus');
      column.update(0, new Map(), [node]);

      assert.isTrue(view.input.onClick(30));
      assert.isTrue(node.selected);
      sinon.assert.calledOnce(focus);
    });
  });

  describe('view', () => {
    function createViewInput(overrides: Partial<Network.NetworkWaterfallColumn.ViewInput> = {}):
        Network.NetworkWaterfallColumn.ViewInput {
      return {
        width: 300,
        height: 200,
        pixelRatio: 2,
        onMouseMove: () => {},
        onMouseLeave: () => {},
        onClick: () => false,
        ...overrides,
      };
    }

    function renderView(input: Network.NetworkWaterfallColumn.ViewInput): {
      target: HTMLElement,
      output: Network.NetworkWaterfallColumn.ViewOutput,
    } {
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      const output: Network.NetworkWaterfallColumn.ViewOutput = {};
      Network.NetworkWaterfallColumn.DEFAULT_VIEW(input, output, target);
      return {target, output};
    }

    it('sizes the canvas using the pixel ratio', () => {
      const {target, output} = renderView(createViewInput({width: 300, height: 200, pixelRatio: 2}));

      const canvas = target.querySelector('canvas');
      assert.isOk(canvas);
      assert.strictEqual(output.canvas, canvas);
      assert.strictEqual(canvas.width, 600);
      assert.strictEqual(canvas.height, 400);
      assert.strictEqual(canvas.style.width, '300px');
      assert.strictEqual(canvas.style.height, '200px');
    });

    it('updates the canvas size on re-render', () => {
      const {target, output} = renderView(createViewInput({width: 300, height: 200, pixelRatio: 2}));

      Network.NetworkWaterfallColumn.DEFAULT_VIEW(createViewInput({width: 100, height: 50, pixelRatio: 1}), output,
                                                  target);

      const canvas = target.querySelector('canvas');
      assert.isOk(canvas);
      assert.strictEqual(canvas.width, 100);
      assert.strictEqual(canvas.height, 50);
      assert.strictEqual(canvas.style.width, '100px');
      assert.strictEqual(canvas.style.height, '50px');
    });

    it('clamps negative dimensions to zero', () => {
      const {output} = renderView(createViewInput({width: -20, height: -10, pixelRatio: 2}));

      assert.isOk(output.canvas);
      assert.strictEqual(output.canvas.width, 0);
      assert.strictEqual(output.canvas.height, 0);
      assert.strictEqual(output.canvas.style.width, '0px');
      assert.strictEqual(output.canvas.style.height, '0px');
    });

    it('rounds backing store dimensions for fractional pixel ratios', () => {
      const {target, output} = renderView(createViewInput({width: 101, height: 51, pixelRatio: 1.25}));
      assert.isOk(output.canvas);
      assert.strictEqual(output.canvas.width, 126);
      assert.strictEqual(output.canvas.height, 64);

      const setAttribute = sinon.spy(output.canvas, 'setAttribute');
      Network.NetworkWaterfallColumn.DEFAULT_VIEW(createViewInput({width: 101, height: 51, pixelRatio: 1.251}), output,
                                                  target);

      sinon.assert.notCalled(setAttribute);
    });

    it('forwards mouse events to the presenter', () => {
      const onMouseMove = sinon.stub<[number, boolean], void>();
      const onMouseLeave = sinon.stub<[], void>();
      const {output} = renderView(createViewInput({width: 300, height: 200, onMouseMove, onMouseLeave}));
      assert.isOk(output.canvas);
      const rect = output.canvas.getBoundingClientRect();

      output.canvas.dispatchEvent(
          new MouseEvent('mousemove', {clientX: rect.left + 10, clientY: rect.top + 42, shiftKey: true}));
      sinon.assert.calledOnceWithExactly(onMouseMove, 42, true);

      output.canvas.dispatchEvent(new MouseEvent('mouseleave'));
      sinon.assert.calledOnce(onMouseLeave);
    });

    it('consumes the click only when the presenter handles it', () => {
      const onClick = sinon.stub<[number], boolean>().returns(false);
      const {output} = renderView(createViewInput({width: 300, height: 200, onClick}));
      assert.isOk(output.canvas);
      const rect = output.canvas.getBoundingClientRect();

      const unhandledClick =
          new MouseEvent('click', {clientX: rect.left + 10, clientY: rect.top + 35, cancelable: true});
      output.canvas.dispatchEvent(unhandledClick);
      sinon.assert.calledOnceWithExactly(onClick, 35);
      assert.isFalse(unhandledClick.defaultPrevented);

      onClick.returns(true);
      const handledClick = new MouseEvent('click', {clientX: rect.left + 10, clientY: rect.top + 50, cancelable: true});
      output.canvas.dispatchEvent(handledClick);
      sinon.assert.calledWithExactly(onClick.secondCall, 50);
      assert.isTrue(handledClick.defaultPrevented);
    });
  });
});
