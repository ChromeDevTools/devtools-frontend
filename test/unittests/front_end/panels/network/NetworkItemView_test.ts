// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from '../../../../../front_end/panels/network/network.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import {createTarget, deinitializeGlobalVars} from '../../helpers/EnvironmentHelpers.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as NetworkForward from '../../../../../front_end/panels/network/forward/forward.js';

function setUpEnvironment() {
  createTarget();
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const targetManager = SDK.TargetManager.TargetManager.instance();
  const debuggerWorkspaceBinding =
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({forceNew: true, targetManager, workspace});
  const breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance(
      {forceNew: true, targetManager, workspace, debuggerWorkspaceBinding});
  Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
  Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
}

function renderNetworkItemView(): Network.NetworkItemView.NetworkItemView {
  const request = SDK.NetworkRequest.NetworkRequest.create(
      'requestId' as Protocol.Network.RequestId, 'https://www.example.com/foo.html' as Platform.DevToolsPath.UrlString,
      '' as Platform.DevToolsPath.UrlString, null, null, null);
  const networkItemView =
      new Network.NetworkItemView.NetworkItemView(request, {} as Network.NetworkTimeCalculator.NetworkTimeCalculator);
  const div = document.createElement('div');
  renderElementIntoDOM(div);
  networkItemView.markAsRoot();
  networkItemView.show(div);
  return networkItemView;
}

describeWithMockConnection('NetworkItemView', () => {
  beforeEach(async () => {
    Root.Runtime.experiments.register(Root.Runtime.ExperimentName.HEADER_OVERRIDES, '');
    await setUpEnvironment();
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
