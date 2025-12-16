// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Screencast from './screencast.js';

describeWithMockConnection('ScreencastApp', () => {
  let screencastApp: Screencast.ScreencastApp.ScreencastApp|undefined;

  afterEach(() => {
    screencastApp?.rootView?.detach();
  });
  // Blocks the CfT roll since https://crrev.com/c/7253957
  it.skip('[crbug.com/469344861]can start casting', async () => {
    screencastApp = new Screencast.ScreencastApp.ScreencastApp();
    screencastApp.presentUI(document);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const target = createTarget({parentTarget: tabTarget});
    const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
    assert.exists(screenCaptureModel);
    await expectCall(sinon.stub(screenCaptureModel, 'startScreencast'));
  });
});
