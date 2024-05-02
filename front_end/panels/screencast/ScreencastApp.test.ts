// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Screencast from './screencast.js';

describeWithMockConnection('ScreencastApp', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    it('can start casting', async () => {
      const screencastApp = new Screencast.ScreencastApp.ScreencastApp();
      screencastApp.presentUI(document);
      const target = targetFactory();
      const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
      assertNotNullOrUndefined(screenCaptureModel);
      await new Promise<void>(
          resolve => sinon.stub(screenCaptureModel, 'startScreencast').callsFake((..._args: unknown[]) => {
            resolve();
          }));
      screencastApp.rootView?.detach();
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
