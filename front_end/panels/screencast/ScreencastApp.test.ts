// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Screencast from './screencast.js';

describeWithMockConnection('ScreencastApp', () => {
  it('can start casting', async () => {
    const screencastApp = new Screencast.ScreencastApp.ScreencastApp();
    screencastApp.presentUI(document);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const target = createTarget({parentTarget: tabTarget});
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(screenCaptureModel);
    await expectCall(sinon.stub(screenCaptureModel, 'startScreencast'));
    screencastApp.rootView?.detach();
  });
});
