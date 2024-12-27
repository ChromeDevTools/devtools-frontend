// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createFakeSetting} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Security from './security.js';

describeWithMockConnection('CookieControlsView', () => {
  let mockView: sinon.SinonStub;

  beforeEach(() => {
    mockView = sinon.stub();
  });

  it('should update setting', async () => {
    const testSetting = createFakeSetting('test-control', true);
    const view = new Security.CookieControlsView.CookieControlsView(undefined, mockView);
    const reloadRequiredInfobarSpy =
        sinon.spy(UI.InspectorView.InspectorView.instance(), 'displayDebuggedTabReloadRequiredWarning');
    assert.isTrue(testSetting.get());

    view.inputChanged(false, testSetting);
    assert.isFalse(testSetting.get());
    assert.isTrue(reloadRequiredInfobarSpy.calledOnce);
  });
});
