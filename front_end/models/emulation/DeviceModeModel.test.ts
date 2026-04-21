// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as EmulationModel from '../emulation/emulation.js';

describe('Insets', () => {
  it('can be instantiated without issues', () => {
    const insets = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    assert.strictEqual(insets.left, 1, 'left value was not set correctly');
    assert.strictEqual(insets.top, 2, 'top value was not set correctly');
    assert.strictEqual(insets.right, 3, 'right value was not set correctly');
    assert.strictEqual(insets.bottom, 4, 'bottom value was not set correctly');
  });

  it('is able to check if it is equal to another Insets', () => {
    const insets1 = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    const insets2 = new EmulationModel.DeviceModeModel.Insets(5, 6, 7, 7);
    const insets3 = new EmulationModel.DeviceModeModel.Insets(1, 2, 3, 4);
    const result1 = insets1.isEqual(insets2);
    const result2 = insets1.isEqual(insets3);
    assert.isFalse(result1, 'insets2 was considered equal');
    assert.isTrue(result2, 'insets3 was not considered equal');
  });
});

describe('Rect', () => {
  it('can be instantiated without issues', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    assert.strictEqual(rect.left, 1, 'left value was not set correctly');
    assert.strictEqual(rect.top, 2, 'top value was not set correctly');
    assert.strictEqual(rect.width, 3, 'width value was not set correctly');
    assert.strictEqual(rect.height, 4, 'height value was not set correctly');
  });

  it('is able to check if it is equal to another Rect', () => {
    const rect1 = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const rect2 = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 7);
    const rect3 = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result1 = rect1.isEqual(rect2);
    const result2 = rect1.isEqual(rect3);
    assert.isFalse(result1, 'rect2 was considered equal');
    assert.isTrue(result2, 'rect3 was not considered equal');
  });

  it('is able to be scaled to a certain value', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const resultRect = rect.scale(2);
    assert.strictEqual(resultRect.left, 2, 'left value was not set correctly');
    assert.strictEqual(resultRect.top, 4, 'top value was not set correctly');
    assert.strictEqual(resultRect.width, 6, 'width value was not set correctly');
    assert.strictEqual(resultRect.height, 8, 'height value was not set correctly');
  });

  it('is able to return a rectangle relative to an origin', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 8);
    const origin = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result = rect.relativeTo(origin);
    assert.strictEqual(result.left, 4, 'left value was not set correctly');
    assert.strictEqual(result.top, 4, 'top value was not set correctly');
    assert.strictEqual(result.width, 7, 'width value was not set correctly');
    assert.strictEqual(result.height, 8, 'height value was not set correctly');
  });

  it('is able to return a rectangle rebased to an origin', () => {
    const rect = new EmulationModel.DeviceModeModel.Rect(5, 6, 7, 8);
    const origin = new EmulationModel.DeviceModeModel.Rect(1, 2, 3, 4);
    const result = rect.rebaseTo(origin);
    assert.strictEqual(result.left, 6, 'left value was not set correctly');
    assert.strictEqual(result.top, 8, 'top value was not set correctly');
    assert.strictEqual(result.width, 7, 'width value was not set correctly');
    assert.strictEqual(result.height, 8, 'height value was not set correctly');
  });
});

describeWithMockConnection('DeviceModeModel', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    stubNoopSettings();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('shows hinge on main frame resize', () => {
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    resourceTreeModel!.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameResized);
    sinon.assert.calledOnce(setShowHinge);
  });

  it('shows hinge on main frame navigation', () => {
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    navigate(getMainFrame(target));
    sinon.assert.calledOnce(setShowHinge);
  });

  it('tracks screen orientation lock state from emulation model events', () => {
    const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    assert.isNotNull(emulationModel);

    // Initially not locked.
    assert.isFalse(deviceModeModel.isScreenOrientationLocked());

    // Simulate a screenOrientationLockChanged event (lock).
    emulationModel!.screenOrientationLockChanged({
      locked: true,
      orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
    });
    assert.isTrue(deviceModeModel.isScreenOrientationLocked());

    // Simulate an unlock event.
    emulationModel!.screenOrientationLockChanged({locked: false});
    assert.isFalse(deviceModeModel.isScreenOrientationLocked());
  });

  it('dispatches UPDATED event when screen orientation lock changes', () => {
    const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    assert.isNotNull(emulationModel);

    const updatedSpy = sinon.spy();
    deviceModeModel.addEventListener(EmulationModel.DeviceModeModel.Events.UPDATED, updatedSpy);

    emulationModel!.screenOrientationLockChanged({
      locked: true,
      orientation: {type: Protocol.Emulation.ScreenOrientationType.LandscapePrimary, angle: 90},
    });
    sinon.assert.calledOnce(updatedSpy);

    emulationModel!.screenOrientationLockChanged({locked: false});
    sinon.assert.calledTwice(updatedSpy);
  });

  it('resets screen orientation lock state when emulation model is removed', () => {
    const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const emulationModel = target.model(SDK.EmulationModel.EmulationModel);
    assert.isNotNull(emulationModel);

    // Lock orientation.
    emulationModel!.screenOrientationLockChanged({
      locked: true,
      orientation: {type: Protocol.Emulation.ScreenOrientationType.PortraitPrimary, angle: 0},
    });
    assert.isTrue(deviceModeModel.isScreenOrientationLocked());

    // Simulate model removal.
    deviceModeModel.modelRemoved(emulationModel!);
    assert.isFalse(deviceModeModel.isScreenOrientationLocked());
  });

  it('clears user agent and metadata when switching to a device with empty UA', () => {
    const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const setUserAgentOverride =
        sinon.spy(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'setUserAgentOverride');

    try {
      const mobileDevice = new EmulationModel.EmulatedDevices.EmulatedDevice();
      mobileDevice.userAgent = 'test-mobile-ua';
      mobileDevice.userAgentMetadata = {
        brands: [{brand: 'TestBrand', version: '1.0'}],
        fullVersionList: [],
        platform: 'Android',
        platformVersion: '12',
        architecture: 'arm',
        model: 'Pixel',
        mobile: true,
      } as Protocol.Emulation.UserAgentMetadata;
      mobileDevice.capabilities = [
        EmulationModel.EmulatedDevices.Capability.TOUCH,
        EmulationModel.EmulatedDevices.Capability.MOBILE,
      ];
      mobileDevice.vertical = {width: 400, height: 800, outlineInsets: null, outlineImage: null, hinge: null};

      // Custom desktop device with empty UA but non-null metadata (as
      // created through the DevTools UI when only filling in some CH fields).
      const desktopDevice = new EmulationModel.EmulatedDevices.EmulatedDevice();
      desktopDevice.userAgent = '';
      desktopDevice.userAgentMetadata = {
        brands: [],
        fullVersionList: [],
        platform: '',
        platformVersion: '',
        architecture: '',
        model: '',
        mobile: false,
      } as Protocol.Emulation.UserAgentMetadata;
      desktopDevice.capabilities = [];
      desktopDevice.vertical = {width: 1920, height: 1080, outlineInsets: null, outlineImage: null, hinge: null};

      const mode: EmulationModel.EmulatedDevices.Mode = {
        title: 'default',
        orientation: EmulationModel.EmulatedDevices.Vertical,
        insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
        image: null,
      };

      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, mobileDevice, mode);
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, desktopDevice, mode);

      // The UA must be an empty string (clears the override on the backend,
      // letting the target use its real User-Agent). The metadata must be
      // null: the backend rejects setUserAgentOverride calls that provide
      // metadata without a UA string ("Empty userAgent invalid with
      // userAgentMetadata provided").
      assert.strictEqual(setUserAgentOverride.lastCall.args[0], '');
      assert.isNull(setUserAgentOverride.lastCall.args[1]);
    } finally {
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    }
  });

  it('uses modern default mobile user agent and metadata', () => {
    const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
    const setUserAgentOverride =
        sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'setUserAgentOverride');

    try {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);

      // stub isMobile to bypass settings issues in this test environment
      sinon.stub(deviceModeModel, 'isMobile').returns(true);

      deviceModeModel.emulate('Responsive' as EmulationModel.DeviceModeModel.Type, null, null);

      const now = new Date();
      const year = now.getFullYear();
      const isLateInYear = now.getMonth() >= 9;
      const expectedAndroidVersion = isLateInYear ? (year - 2010) : (year - 2011);
      const expectedPixelModel = isLateInYear ? (year - 2016) : (year - 2017);

      const modernCall =
          setUserAgentOverride.getCalls().find(call => call.args[0].includes(`Pixel ${expectedPixelModel}`));
      assert.exists(modernCall, 'Modern User Agent was not applied');

      const userAgent = modernCall?.args[0];
      const metadata = modernCall?.args[1];

      assert.include(userAgent, `Android ${expectedAndroidVersion}; Pixel ${expectedPixelModel}`);
      assert.isNotNull(metadata);
      assert.strictEqual(metadata?.platform, 'Android');
      assert.strictEqual(metadata?.platformVersion, expectedAndroidVersion.toString());
      assert.strictEqual(metadata?.model, `Pixel ${expectedPixelModel}`);
    } finally {
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      setUserAgentOverride.restore();
    }
  });

  it('updates the default mobile UA based on the calendar year and month (Oct bump)', () => {
    const clock = sinon.useFakeTimers();
    try {
      // Early 2026: Should be Android 15 (N-1)
      clock.tick(new Date(2026, 0, 1).getTime());
      const earlyUA = EmulationModel.DeviceModeModel.DeviceModeModel.getDynamicMobileUA();
      assert.strictEqual(earlyUA.metadata.platformVersion, '15');
      assert.strictEqual(earlyUA.metadata.model, 'Pixel 9');

      // September 2026: Still Android 15
      clock.tick(new Date(2026, 8, 1).getTime() - new Date(2026, 0, 1).getTime());
      const septUA = EmulationModel.DeviceModeModel.DeviceModeModel.getDynamicMobileUA();
      assert.strictEqual(septUA.metadata.platformVersion, '15');

      // October 2026: Bump to Android 16
      clock.tick(new Date(2026, 9, 1).getTime() - new Date(2026, 8, 1).getTime());
      const octUA = EmulationModel.DeviceModeModel.DeviceModeModel.getDynamicMobileUA();
      assert.strictEqual(octUA.metadata.platformVersion, '16');
      assert.strictEqual(octUA.metadata.model, 'Pixel 10');

      // January 2030: Future proof check
      clock.tick(new Date(2030, 0, 1).getTime() - new Date(2026, 9, 1).getTime());
      const futureUA = EmulationModel.DeviceModeModel.DeviceModeModel.getDynamicMobileUA();
      assert.strictEqual(futureUA.metadata.platformVersion, '19');
      assert.strictEqual(futureUA.metadata.model, 'Pixel 13');
    } finally {
      clock.restore();
    }
  });
});
