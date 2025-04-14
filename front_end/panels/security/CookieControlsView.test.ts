// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createFakeSetting, createTarget, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Security from './security.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('CookieControlsView', () => {
  let mockView: ViewFunctionStub<typeof Security.CookieControlsView.CookieControlsView>;
  let target: SDK.Target.Target;

  beforeEach(() => {
    mockView = createViewFunctionStub(Security.CookieControlsView.CookieControlsView);
  });

  it('should update setting', async () => {
    const testSetting = createFakeSetting('test-control', true);
    const view = new Security.CookieControlsView.CookieControlsView(undefined, mockView);
    const reloadRequiredInfobarSpy =
        sinon.spy(UI.InspectorView.InspectorView.instance(), 'displayDebuggedTabReloadRequiredWarning');
    assert.isTrue(testSetting.get());

    view.inputChanged(false, testSetting);
    assert.isFalse(testSetting.get());
    sinon.assert.calledOnce(reloadRequiredInfobarSpy);
  });

  it('should invoke getAffectedUrlsForThirdPartyCookieMetadata upon construction', async () => {
    updateHostConfig({thirdPartyCookieControls: {thirdPartyCookieMetadataEnabled: true}});

    target = createTarget();
    const getAffectedUrlsSpy = sinon.spy(target.storageAgent(), 'invoke_getAffectedUrlsForThirdPartyCookieMetadata');
    new Security.CookieControlsView.CookieControlsView(undefined, mockView);

    sinon.assert.calledOnce(getAffectedUrlsSpy);
  });

  it('should invoke getAffectedUrlsForThirdPartyCookieMetadata when a resource is added', async () => {
    updateHostConfig({thirdPartyCookieControls: {thirdPartyCookieMetadataEnabled: true}});
    new Security.CookieControlsView.CookieControlsView(undefined, mockView);

    target = createTarget();
    const getAffectedUrlsSpy = sinon.spy(target.storageAgent(), 'invoke_getAffectedUrlsForThirdPartyCookieMetadata');

    const model = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(model);

    const resourceSite = urlString`https://test.com/`;
    const r = new SDK.Resource.Resource(
        model, null, resourceSite, resourceSite, null, null, Common.ResourceType.resourceTypes.Document, '', null,
        null);
    model.dispatchEventToListeners(SDK.ResourceTreeModel.Events.ResourceAdded, r);

    sinon.assert.calledOnceWithExactly(getAffectedUrlsSpy, {firstPartyUrl: '', thirdPartyUrls: [resourceSite]});
  });
});
