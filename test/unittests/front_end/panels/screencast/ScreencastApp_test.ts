// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Screencast from '../../../../../front_end/panels/screencast/screencast.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

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
