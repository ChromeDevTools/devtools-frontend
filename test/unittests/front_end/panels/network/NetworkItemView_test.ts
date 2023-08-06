// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from '../../../../../front_end/panels/network/network.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

import type * as IconButton from '../../../../../front_end/ui/components/icon_button/icon_button.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import {deinitializeGlobalVars, describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import * as NetworkForward from '../../../../../front_end/panels/network/forward/forward.js';
import {setUpEnvironment} from '../../helpers/OverridesHelpers.js';
import type * as UI from '../../../../../front_end/ui/legacy/legacy.js';

function renderNetworkItemView(request?: SDK.NetworkRequest.NetworkRequest): Network.NetworkItemView.NetworkItemView {
  if (!request) {
    request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
  }
  const networkItemView =
      new Network.NetworkItemView.NetworkItemView(request, {} as Network.NetworkTimeCalculator.NetworkTimeCalculator);
  const div = document.createElement('div');
  renderElementIntoDOM(div);
  networkItemView.markAsRoot();
  networkItemView.show(div);
  return networkItemView;
}

function getIconDataInTab(tabs: UI.TabbedPane.TabbedPaneTab[], tabId: string) {
  const icon = tabs.find(tab => tab.id === tabId)?.['icon'] as IconButton.Icon.Icon | undefined;
  const iconData = icon?.data as IconButton.Icon.IconWithName;

  return iconData;
}

describeWithMockConnection('NetworkItemView', () => {
  beforeEach(() => {
    setUpEnvironment();
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('reveals header in legacy RequestHeadersView if header overrides experiment is not enabled', async () => {
    const networkItemView = renderNetworkItemView();
    const headersView = networkItemView.getHeadersView();
    const headersViewSpy = sinon.spy(headersView, 'revealHeader');
    const headersViewComponent = networkItemView.getHeadersViewComponent();
    const headersViewComponentSpy = sinon.spy(headersViewComponent, 'revealHeader');

    assert.isTrue(headersViewSpy.notCalled);
    assert.isTrue(headersViewComponentSpy.notCalled);

    networkItemView.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'headerName');

    assert.isTrue(headersViewSpy.calledWith(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'headerName'));
    assert.isTrue(headersViewComponentSpy.notCalled);
    networkItemView.detach();
  });

  it('reveals header in new RequestHeadersView if header overrides experiment is enabled', async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    const networkItemView = renderNetworkItemView();
    const headersView = networkItemView.getHeadersView();
    const headersViewSpy = sinon.spy(headersView, 'revealHeader');
    const headersViewComponent = networkItemView.getHeadersViewComponent();
    const headersViewComponentSpy = sinon.spy(headersViewComponent, 'revealHeader');

    assert.isTrue(headersViewSpy.notCalled);
    assert.isTrue(headersViewComponentSpy.notCalled);

    networkItemView.revealHeader(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'headerName');

    assert.isTrue(headersViewSpy.notCalled);
    assert.isTrue(
        headersViewComponentSpy.calledWith(NetworkForward.UIRequestLocation.UIHeaderSection.Response, 'headerName'));
    networkItemView.detach();
  });
});

describeWithEnvironment('NetworkItemView', () => {
  let request: SDK.NetworkRequest.NetworkRequest;
  const OVERRIDEN_ICON_NAME = 'small-status-dot';

  beforeEach(async () => {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;
  });

  afterEach(async () => {
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
  });

  it('shows indicator for overriden headers and responses', () => {
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const networkItemView = renderNetworkItemView(request);
    const headersIcon = getIconDataInTab(networkItemView['tabs'], 'headersComponent');
    const responseIcon = getIconDataInTab(networkItemView['tabs'], 'response');

    networkItemView.detach();

    assert(headersIcon.iconName, OVERRIDEN_ICON_NAME);
    assert(responseIcon.iconName, OVERRIDEN_ICON_NAME);
  });

  it('shows indicator for overriden headers', () => {
    request.setWasIntercepted(true);
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const networkItemView = renderNetworkItemView(request);
    const headersIcon = getIconDataInTab(networkItemView['tabs'], 'headersComponent');
    const responseIcon = getIconDataInTab(networkItemView['tabs'], 'response');

    networkItemView.detach();

    assert(headersIcon.iconName, OVERRIDEN_ICON_NAME);
    assert.isUndefined(responseIcon);
  });

  it('shows indicator for overriden content', () => {
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkItemView = renderNetworkItemView(request);
    const headersIcon = getIconDataInTab(networkItemView['tabs'], 'headersComponent');
    const responseIcon = getIconDataInTab(networkItemView['tabs'], 'response');

    networkItemView.detach();

    assert.isUndefined(headersIcon);
    assert(responseIcon, OVERRIDEN_ICON_NAME);
  });

  it('does not show indicator for unoverriden request', () => {
    const networkItemView = renderNetworkItemView(request);
    const headersIcon = getIconDataInTab(networkItemView['tabs'], 'headersComponent');
    const responseIcon = getIconDataInTab(networkItemView['tabs'], 'response');

    networkItemView.detach();

    assert.isUndefined(headersIcon);
    assert.isUndefined(responseIcon);
  });
});
