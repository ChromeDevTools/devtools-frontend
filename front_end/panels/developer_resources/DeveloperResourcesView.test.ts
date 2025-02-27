// Copyright (c) 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as DeveloperResourcesView from './DeveloperResourcesView.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('DeveloperResourcesView', () => {
  it('allows selecting resources', async () => {
    const extensionId = 'extensionId';
    const initiator = {target: null, frameId: null, extensionId, initiatorUrl: urlString`${extensionId}`};

    const commonInfo = {success: true, initiator, size: 10, duration: 20};
    const resource1 = {url: urlString`http://www.test.com/test.js`, ...commonInfo};
    const resource2 = {url: urlString`http://www.test.com/test2.js`, ...commonInfo};
    const resource3 = {url: urlString`http://www.test.com/test3.js`, ...commonInfo};

    const loader = SDK.PageResourceLoader.PageResourceLoader.instance();
    loader.resourceLoadedThroughExtension(resource1);
    loader.resourceLoadedThroughExtension(resource2);

    const developerResourcesView = new DeveloperResourcesView.DeveloperResourcesView();

    // This is required, as otherwise the view is not updated.
    sinon.stub(developerResourcesView, 'isShowing').callsFake(() => {
      return true;
    });

    assert.isNull(await developerResourcesView.selectedItem());
    developerResourcesView.update();

    await developerResourcesView.select(resource2);
    assert.deepEqual(await developerResourcesView.selectedItem(), resource2);

    loader.resourceLoadedThroughExtension(resource3);
    assert.deepEqual(await developerResourcesView.selectedItem(), resource2);
  });
});
