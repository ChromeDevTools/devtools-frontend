// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Common from '../common/common.js';

import * as SDK from './sdk.js';

describeWithMockConnection('EmulationModel', () => {
  it('should track screen orientation lock state from CDP events', () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    assert.isNotNull(emulationModel);

    // Initially not locked.
    assert.isFalse(emulationModel!.isScreenOrientationLocked());
    assert.isNull(emulationModel!.lockedOrientation());

    // Simulate lock event.
    const orientation = {type: 'portraitPrimary' as Protocol.Emulation.ScreenOrientationType, angle: 0};
    emulationModel!.screenOrientationLockChanged({locked: true, orientation});
    assert.isTrue(emulationModel!.isScreenOrientationLocked());
    assert.deepEqual(emulationModel!.lockedOrientation(), orientation);

    // Simulate unlock event.
    emulationModel!.screenOrientationLockChanged({locked: false});
    assert.isFalse(emulationModel!.isScreenOrientationLocked());
    assert.isNull(emulationModel!.lockedOrientation());
  });

  it('should dispatch SCREEN_ORIENTATION_LOCK_CHANGED event', () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    assert.isNotNull(emulationModel);

    const eventSpy = sinon.spy();
    emulationModel!.addEventListener(SDK.EmulationModel.EmulationModelEvents.SCREEN_ORIENTATION_LOCK_CHANGED, eventSpy);

    const orientation = {type: 'landscapePrimary' as Protocol.Emulation.ScreenOrientationType, angle: 90};
    emulationModel!.screenOrientationLockChanged({locked: true, orientation});
    sinon.assert.calledOnce(eventSpy);
    assert.deepEqual(eventSpy.firstCall.args[0].data, {locked: true, orientation});
  });

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

  it('updates disabled image types when JPEG XL format disabling is toggled', () => {
    const parentTarget = createTarget();
    const target = createTarget({parentTarget});
    const emulationAgent = target.emulationAgent();
    const spySetDisabledImageTypes = sinon.stub(emulationAgent, 'invoke_setDisabledImageTypes');

    const jpegXlFormatDisabledSetting = Common.Settings.Settings.instance().moduleSetting('jpeg-xl-format-disabled');
    jpegXlFormatDisabledSetting.set(true);

    sinon.assert.calledOnce(spySetDisabledImageTypes);
    sinon.assert.calledWith(spySetDisabledImageTypes, {imageTypes: [Protocol.Emulation.DisabledImageType.Jxl]});
  });
});
