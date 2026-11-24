// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {setUpEnvironment} from '../../testing/OverridesHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as NetworkForward from './forward/forward.js';
import * as Network from './network.js';

function createNetworkItemView(request?: SDK.NetworkRequest.NetworkRequest) {
  if (!request) {
    request = createNetworkRequest({url: 'https://www.example.com/foo.html', finished: true});
  }
  const view = createViewFunctionStub(Network.NetworkItemView.NetworkItemView);
  const networkItemView = new Network.NetworkItemView.NetworkItemView(
      request, new NetworkTimeCalculator.NetworkTimeCalculator(true), undefined, view);
  renderElementIntoDOM(networkItemView);
  return {networkItemView, view};
}

describeWithEnvironment('NetworkItemView', () => {
  beforeEach(() => {
    setUpEnvironment();
  });

  it('reveals header in RequestHeadersView', async () => {
    const revealHeader = sinon.stub();
    const view = createViewFunctionStub(Network.NetworkItemView.NetworkItemView, {revealHeader});
    const request = createNetworkRequest({url: 'https://www.example.com/foo.html', finished: true});
    const networkItemView = new Network.NetworkItemView.NetworkItemView(
        request, new NetworkTimeCalculator.NetworkTimeCalculator(true), undefined, view);

    networkItemView.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE, 'headerName');

    assert.strictEqual(view.input.selectedTab, NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
    sinon.assert.calledOnceWithExactly(revealHeader, NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE,
                                       'headerName');
  });
});

describeWithEnvironment('NetworkItemView', () => {
  let request: SDK.NetworkRequest.NetworkRequest;

  beforeEach(async () => {
    setUpEnvironment();
    request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      finished: true,
    });
  });

  it('shows indicator for overridden headers and responses', async () => {
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isTrue(input.hasOverriddenHeaders);
    assert.isTrue(input.hasOverriddenContent);
  });

  it('shows indicator for overridden headers', async () => {
    request.setWasIntercepted(true);
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isTrue(input.hasOverriddenHeaders);
    assert.isFalse(input.hasOverriddenContent);
  });

  it('shows indicator for overridden content', async () => {
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isFalse(input.hasOverriddenHeaders);
    assert.isTrue(input.hasOverriddenContent);
  });

  it('does not show indicator for unoverriden request', async () => {
    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isFalse(input.hasOverriddenHeaders);
    assert.isFalse(input.hasOverriddenContent);
  });

  it('shows the Response and EventSource tab for text/event-stream requests', async () => {
    request.mimeType = 'text/event-stream';
    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isTrue(input.isEventStream);
  });

  it('shows the ConnectionInfo tab for DirectSocket requests', async () => {
    request.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
    request.directSocketInfo = {
      type: SDK.NetworkRequest.DirectSocketType.TCP,
      status: SDK.NetworkRequest.DirectSocketStatus.OPENING,
      createOptions: {
        remoteAddr: '127.0.0.1',
        remotePort: 2545,
        noDelay: false,
        keepAliveDelay: 1000,
        sendBufferSize: 1002,
        receiveBufferSize: 1003,
        dnsQueryType: undefined,
      },
    };

    const {view} = createNetworkItemView(request);
    const input = await view.nextInput;

    assert.isTrue(input.isDirectSocket);
    assert.strictEqual(input.selectedTab, NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION);
  });

  it('removes its element from the DOM when detached', () => {
    const {networkItemView} = createNetworkItemView(request);
    const parentElement = networkItemView.element.parentElement;
    assert.isNotNull(parentElement);
    assert.isTrue(parentElement.contains(networkItemView.element));

    networkItemView.detach();

    assert.isFalse(parentElement.contains(networkItemView.element));
  });

  it('does not duplicate RequestPayloadView when switching away from and back to the Payload tab', async () => {
    const requestWithPayload = createNetworkRequest({
      url: 'https://www.example.com/foo.html?a=1',
      statusCode: 200,
      finished: true,
    });
    const networkItemView = new Network.NetworkItemView.NetworkItemView(
        requestWithPayload, new NetworkTimeCalculator.NetworkTimeCalculator(true),
        NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD);
    renderElementIntoDOM(networkItemView);
    await UI.Widget.Widget.allUpdatesComplete;

    const payloadTab = networkItemView.element.querySelector<HTMLElement>('#payload');
    assert.isNotNull(payloadTab);
    const payloadTabWidget = UI.Widget.Widget.get(payloadTab);
    assert.isDefined(payloadTabWidget);

    const tabbedPane = networkItemView.element.querySelector('devtools-tabbed-pane');
    assert.isNotNull(tabbedPane);

    tabbedPane.dispatchEvent(new CustomEvent('select', {
      detail: {
        tabId: NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
        isUserGesture: true,
      },
    }));
    await UI.Widget.Widget.allUpdatesComplete;
    await raf();

    tabbedPane.dispatchEvent(new CustomEvent('select', {
      detail: {
        tabId: NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD,
        isUserGesture: true,
      },
    }));
    await UI.Widget.Widget.allUpdatesComplete;

    assert.lengthOf(payloadTabWidget.children(), 1);
    const payloadWidgetElement = payloadTab.querySelector<HTMLElement>('devtools-widget');
    assert.isNotNull(payloadWidgetElement);
    assert.instanceOf(UI.Widget.Widget.get(payloadWidgetElement), Network.RequestPayloadView.RequestPayloadView);
  });
});
