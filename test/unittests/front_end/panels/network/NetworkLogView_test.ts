// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('NetworkLogView', () => {
  it('can create curl command parameters for headers without value', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'https://www.example.com/file.html' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
        null, null, null);
    request.requestMethod = 'GET';
    request.setRequestHeaders([
      {name: 'header-with-value', value: 'some value'},
      {name: 'no-value-header', value: ''},
    ]);
    const actual = await Network.NetworkLogView.NetworkLogView.generateCurlCommand(request, 'unix');
    const expected =
        'curl \'https://www.example.com/file.html\' \\\n  -H \'header-with-value: some value\' \\\n  -H \'no-value-header;\' \\\n  --compressed';
    assert.strictEqual(actual, expected);
  });

  function createNetworkLogView(): Network.NetworkLogView.NetworkLogView {
    return new Network.NetworkLogView.NetworkLogView(
        {addFilter: () => {}, filterButton: () => ({addEventListener: () => {}})} as unknown as UI.FilterBar.FilterBar,
        document.createElement('div'), Common.Settings.Settings.instance().createSetting('networkLogLargeRows', false));
  }

  it('adds dividers on main frame load events', async () => {
    stubNoopSettings();
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);

    const networkLogView = createNetworkLogView();
    const addEventDividers = sinon.spy(networkLogView.columns(), 'addEventDividers');
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameUnderTabTarget = createTarget({parentTarget: tabTarget});
    const mainFrameWithoutTabTarget = createTarget();
    const subframeTarget = createTarget({parentTarget: mainFrameWithoutTabTarget});

    const sendLoadEvents = (target: SDK.Target.Target, loadTime: number, domContentLoadTime: number) => {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assertNotNullOrUndefined(resourceTreeModel);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, {resourceTreeModel, loadTime});
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, domContentLoadTime);
    };
    networkLogView.setRecording(true);

    sendLoadEvents(subframeTarget, 1, 2);
    assert.isTrue(addEventDividers.notCalled);

    sendLoadEvents(mainFrameUnderTabTarget, 5, 6);
    assert.isTrue(addEventDividers.calledTwice);
    assert.isTrue(addEventDividers.getCall(0).calledWith([5], 'network-load-divider'));
    assert.isTrue(addEventDividers.getCall(1).calledWith([6], 'network-dcl-divider'));

    addEventDividers.resetHistory();
    sendLoadEvents(mainFrameWithoutTabTarget, 3, 4);
    assert.isTrue(addEventDividers.calledTwice);
    assert.isTrue(addEventDividers.getCall(0).calledWith([3], 'network-load-divider'));
    assert.isTrue(addEventDividers.getCall(1).calledWith([4], 'network-dcl-divider'));
  });
});
