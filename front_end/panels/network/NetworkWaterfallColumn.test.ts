// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

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
    Common.Settings.maybeRemoveSettingExtension('network-color-code-resource-types');
    Common.Settings.registerSettingExtension({
      settingName: 'network-color-code-resource-types',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
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
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`, urlString``, null, null, null);
    if (timingInfo) {
      request.timing = timingInfo;
    }
    if (routerInfo) {
      request.serviceWorkerRouterInfo = routerInfo;
    }
    return new Network.NetworkDataGridNode.NetworkRequestNode({} as Network.NetworkDataGridNode.NetworkLogViewInterface,
                                                              request);
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
});
