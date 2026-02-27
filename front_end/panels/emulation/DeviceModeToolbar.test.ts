// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as Emulation from './emulation.js';

function createFakeSetting<T>(defaultValue: T): Common.Settings.Setting<T> {
  let value = defaultValue;
  return {
    get: () => value,
    set: (v: T) => {
      value = v;
    },
    addChangeListener: () => {},
    removeChangeListener: () => {},
    setDisabled: () => {},
    setTitle: () => {},
    title: () => '',
    asRegExp: () => null,
    type: () => Common.Settings.SettingType.BOOLEAN,
    getAsArray: () => [],
    name: 'fake',
  } as unknown as Common.Settings.Setting<T>;
}

describeWithMockConnection('DeviceModeToolbar', () => {
  let target: SDK.Target.Target;
  let deviceModeModel: EmulationModel.DeviceModeModel.DeviceModeModel;
  let toolbar: Emulation.DeviceModeToolbar.DeviceModeToolbar;

  beforeEach(() => {
    sinon.stub(Common.Settings.Settings, 'instance').returns({
      createSetting: <T>(_name: string, defaultValue: T) => createFakeSetting(defaultValue),
      moduleSetting: <T>(_name: string) => createFakeSetting(false as T),
      createLocalSetting: <T>(_name: string, defaultValue: T) => createFakeSetting(defaultValue),
    } as unknown as Common.Settings.Settings);

    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});

    // Stub ThrottlingManager to avoid dependency on network condition settings.
    const fakeMenuButton = new UI.Toolbar.ToolbarMenuButton(() => {}, undefined, undefined, 'throttle-menu');
    sinon.stub(MobileThrottling.ThrottlingManager.ThrottlingManager, 'instance').returns({
      createMobileThrottlingButton: () => fakeMenuButton,
      createSaveDataOverrideSelector: () => fakeMenuButton,
    } as unknown as MobileThrottling.ThrottlingManager.ThrottlingManager);

    toolbar = new Emulation.DeviceModeToolbar.DeviceModeToolbar(
        deviceModeModel,
        createFakeSetting(false),
        createFakeSetting(false),
    );
  });

  /**
   * Finds the rotate/screen-rotation toolbar button inside the toolbar element.
   * The button is a devtools-button with jslogContext 'screen-rotation'.
   */
  function findRotateButton(): Buttons.Button.Button {
    const buttons = toolbar.element().querySelectorAll<Buttons.Button.Button>('devtools-button.toolbar-button');
    const button = [...buttons].find(b => b.jslogContext === 'screen-rotation');
    assert.exists(button, 'Could not find rotate button');
    return button;
  }

  describe('screen orientation lock', () => {
    it('disables the rotate button when screen orientation is locked', () => {
      // Set up responsive mode so the rotate button is initially enabled.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.update();

      const modeButton = findRotateButton();
      assert.isFalse(modeButton.disabled, 'rotate button should initially be enabled');

      // Lock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.update();

      assert.isTrue(modeButton.disabled, 'rotate button should be disabled when orientation is locked');
      assert.include(modeButton.title, 'locked');
    });

    it('re-enables the rotate button when screen orientation is unlocked', () => {
      // Set up responsive mode.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.update();

      const modeButton = findRotateButton();

      // Lock, then unlock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.update();
      assert.isTrue(modeButton.disabled, 'rotate button should be disabled when locked');

      emulationModel.screenOrientationLockChanged({locked: false});
      toolbar.update();

      assert.isFalse(modeButton.disabled, 'rotate button should be re-enabled after unlock');
      assert.include(modeButton.title, 'Rotate');
    });

    it('does not rotate when screen orientation is locked and rotate button is clicked', () => {
      // Set up responsive mode.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.update();

      // Lock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.update();

      // Spy on setWidth/setHeight to ensure no rotation happens.
      const setWidthSpy = sinon.spy(deviceModeModel, 'setWidth');
      const setHeightSpy = sinon.spy(deviceModeModel, 'setHeight');

      // Click the rotate button.
      const modeButton = findRotateButton();
      modeButton.click();

      sinon.assert.notCalled(setWidthSpy);
      sinon.assert.notCalled(setHeightSpy);
    });
  });
});
