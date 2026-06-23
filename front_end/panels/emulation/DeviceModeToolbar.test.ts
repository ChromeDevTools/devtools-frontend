// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as Emulation from './emulation.js';

function createFakeSetting<T>(defaultValue: T): Common.Settings.Setting<T> {
  let value = defaultValue;
  const listeners: Array<{listener: (_: Common.EventTarget.EventTargetEvent<T>) => void, thisObject?: object}> = [];
  return {
    get: () => value,
    set: (v: T) => {
      const isChanged = JSON.stringify(value) !== JSON.stringify(v);
      value = v;
      if (isChanged) {
        for (const {listener, thisObject} of listeners) {
          listener.call(thisObject, {data: v} as Common.EventTarget.EventTargetEvent<T>);
        }
      }
    },
    addChangeListener: (listener: (_: Common.EventTarget.EventTargetEvent<T>) => void, thisObject?: object) => {
      listeners.push({listener, thisObject});
      return {listener, thisObject};
    },
    removeChangeListener: (listener: (_: Common.EventTarget.EventTargetEvent<T>) => void, thisObject?: object) => {
      const index = listeners.findIndex(l => l.listener === listener && l.thisObject === thisObject);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
    setDisabled: () => {},
    setTitle: () => {},
    title: () => '',
    asRegExp: () => null,
    type: () => Common.Settings.SettingType.BOOLEAN,
    getAsArray: () => [],
    name: 'fake',
  } as unknown as Common.Settings.Setting<T>;
}

describeWithEnvironment('DeviceModeToolbar', () => {
  setupLocaleHooks();

  let tabTarget: SDK.Target.Target|undefined;
  let prerenderTarget: SDK.Target.Target|undefined;
  let target: SDK.Target.Target;
  let deviceModeModel: EmulationModel.DeviceModeModel.DeviceModeModel;
  let toolbar: Emulation.DeviceModeToolbar.DeviceModeToolbar;

  beforeEach(() => {
    i18n.DevToolsLocale.DevToolsLocale.instance({
      create: true,
      data: {
        navigatorLanguage: 'en-US',
        settingLanguage: 'en-US',
        lookupClosestDevToolsLocale: () => 'en-US',
      },
    });
    sinon.stub(Common.Settings.Settings, 'instance').returns({
      createSetting: <T>(_name: string, defaultValue: T) => createFakeSetting(defaultValue),
      moduleSetting: <T>(name: string) => {
        if (name === 'custom-network-conditions') {
          return createFakeSetting([] as T);
        }
        return createFakeSetting(false as T);
      },
      createLocalSetting: <T>(_name: string, defaultValue: T) => createFakeSetting(defaultValue),
    } as unknown as Common.Settings.Settings);

    tabTarget = createTarget({type: SDK.Target.Type.TAB});
    prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});

    // Stub ThrottlingManager to avoid dependency on network condition settings.
    const fakeMenuButton = new UI.Toolbar.ToolbarMenuButton(() => {}, undefined, undefined, 'throttle-menu');
    const fakeSelectElement = document.createElement('select');
    sinon.stub(MobileThrottling.ThrottlingManager.ThrottlingManager, 'instance').returns({
      createMobileThrottlingButton: () => fakeMenuButton,
      createSaveDataOverrideSelector: () => fakeSelectElement,
    } as unknown as MobileThrottling.ThrottlingManager.ThrottlingManager);

    toolbar = new Emulation.DeviceModeToolbar.DeviceModeToolbar(
        deviceModeModel,
        createFakeSetting(false),
        createFakeSetting(false),
    );
  });

  afterEach(async () => {
    await UI.Widget.Widget.allUpdatesComplete;
    toolbar?.detach();
    deviceModeModel?.dispose();
    target?.dispose('test');
    prerenderTarget?.dispose('test');
    tabTarget?.dispose('test');
  });

  /**
   * Finds the rotate/screen-rotation toolbar button inside the toolbar element.
   * The button is a devtools-button with jslogContext 'screen-rotation'.
   */
  function findRotateButton(): Buttons.Button.Button {
    const buttons = toolbar.element.querySelectorAll<Buttons.Button.Button>('devtools-button.toolbar-button');
    const button = [...buttons].find(b => b.getAttribute('jslog')?.includes('screen-rotation'));
    assert.exists(button, 'Could not find rotate button');
    return button;
  }

  describe('UI updates on model changes', () => {
    let renderSpy: sinon.SinonSpy;

    beforeEach(() => {
      renderSpy = sinon.spy(Emulation.DeviceModeToolbar.DeviceModeToolbar.prototype, 'performUpdate');
      // Re-create toolbar so that it registers the spied update method.
      toolbar = new Emulation.DeviceModeToolbar.DeviceModeToolbar(
          deviceModeModel,
          createFakeSetting(false),
          createFakeSetting(false),
      );
      renderSpy.resetHistory();
    });

    afterEach(() => {
      renderSpy.restore();
    });

    it('updates UI when scale changes', async () => {
      deviceModeModel.scaleSetting().set(1.5);
      await toolbar.updateComplete;
      sinon.assert.called(renderSpy);
    });

    it('updates UI when User Agent changes', async () => {
      deviceModeModel.uaSetting().set(EmulationModel.DeviceModeModel.UA.DESKTOP);
      await toolbar.updateComplete;
      sinon.assert.called(renderSpy);
    });

    it('updates UI when Device Pixel Ratio changes', async () => {
      deviceModeModel.deviceScaleFactorSetting().set(2);
      await toolbar.updateComplete;
      sinon.assert.called(renderSpy);
    });

    it('updates UI on generic model update events', async () => {
      deviceModeModel.dispatchEventToListeners(EmulationModel.DeviceModeModel.Events.UPDATED);
      await toolbar.updateComplete;
      sinon.assert.called(renderSpy);
    });
  });

  describe('screen orientation lock', () => {
    it('disables the rotate button when screen orientation is locked', async () => {
      // Set up responsive mode so the rotate button is initially enabled.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      const modeButton = findRotateButton();
      assert.isFalse(modeButton.disabled, 'rotate button should initially be enabled');

      // Lock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      const updatedModeButton = findRotateButton();
      assert.isTrue(updatedModeButton.disabled, 'rotate button should be disabled when orientation is locked');
      assert.include(updatedModeButton.title, 'locked');
    });

    it('re-enables the rotate button when screen orientation is unlocked', async () => {
      // Set up responsive mode.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      // Lock, then unlock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      const modeButton = findRotateButton();
      assert.isTrue(modeButton.disabled, 'rotate button should be disabled when locked');

      emulationModel.screenOrientationLockChanged({locked: false});
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      const updatedModeButton = findRotateButton();
      assert.isFalse(updatedModeButton.disabled, 'rotate button should be re-enabled after unlock');
      assert.include(updatedModeButton.title, 'Rotate');
    });

    it('does not rotate when screen orientation is locked and rotate button is clicked', async () => {
      // Set up responsive mode.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      toolbar.requestUpdate();
      await toolbar.updateComplete;

      // Lock orientation.
      const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
      assert.isNotNull(emulationModel);
      emulationModel.screenOrientationLockChanged({
        locked: true,
        orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
      });
      toolbar.requestUpdate();
      await toolbar.updateComplete;

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

  it('resets the device dropdown to the current device when "Edit" is selected', async () => {
    deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
    toolbar.requestUpdate();
    await toolbar.updateComplete;

    const select = toolbar.element.querySelector('select') as HTMLSelectElement;
    assert.strictEqual(select.value, 'Responsive');

    // Simulate selecting "Edit"
    select.value = 'Edit';
    select.dispatchEvent(new Event('change'));

    await toolbar.updateComplete;

    // It should have reverted to "Responsive"
    assert.strictEqual(select.value, 'Responsive');
  });
});
