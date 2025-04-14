// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('EmulationModel', () => {
  it('should `emulateTouch` enable touch emulation', async () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    const emulationAgent = target.emulationAgent();
    const spySetTouchEmulationEnabled = sinon.stub(emulationAgent, 'invoke_setTouchEmulationEnabled');
    const spySetEmitTouchEventsForMouse = sinon.stub(emulationAgent, 'invoke_setEmitTouchEventsForMouse');
    sinon.assert.notCalled(spySetTouchEmulationEnabled);
    sinon.assert.notCalled(spySetEmitTouchEventsForMouse);

    await emulationModel!.emulateTouch(true, true);

    sinon.assert.calledOnce(spySetTouchEmulationEnabled);
    sinon.assert.calledOnce(spySetEmitTouchEventsForMouse);
    sinon.assert.calledWith(spySetTouchEmulationEnabled, {enabled: true, maxTouchPoints: 1});
  });

  it('should `emulateTouch` not enable touch emulation when `setTouchEmulationAllowed` is called with false',
     async () => {
       const parentTarget = createTarget();
       const target = createTarget({parentTarget});
       const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
       const emulationAgent = target.emulationAgent();
       const spySetTouchEmulationEnabled = sinon.stub(emulationAgent, 'invoke_setTouchEmulationEnabled');
       const spySetEmitTouchEventsForMouse = sinon.stub(emulationAgent, 'invoke_setEmitTouchEventsForMouse');
       sinon.assert.notCalled(spySetTouchEmulationEnabled);
       sinon.assert.notCalled(spySetEmitTouchEventsForMouse);

       emulationModel!.setTouchEmulationAllowed(false);
       await emulationModel!.emulateTouch(true, true);

       sinon.assert.notCalled(spySetTouchEmulationEnabled);
       sinon.assert.notCalled(spySetEmitTouchEventsForMouse);
     });
});
