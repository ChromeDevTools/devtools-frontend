// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as EmulationModel from '../emulation/emulation.js';
import * as Geometry from '../geometry/geometry.js';

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

describe('DeviceModeModel', () => {
  setupLocaleHooks();

  let target: SDK.Target.Target;
  let universe: TestUniverse;
  let deviceModeModel: EmulationModel.DeviceModeModel.DeviceModeModel;

  beforeEach(() => {
    universe = new TestUniverse();
    deviceModeModel = universe.deviceModeModel;
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB});
    universe.createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = universe.createTarget({parentTarget: tabTarget});
  });

  it('shows hinge on main frame resize', () => {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    resourceTreeModel!.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameResized);
    sinon.assert.calledOnce(setShowHinge);
  });

  it('shows hinge on main frame navigation', () => {
    const setShowHinge = sinon.spy(target.overlayAgent(), 'invoke_setShowHinge');
    navigate(getMainFrame(target));
    sinon.assert.calledOnce(setShowHinge);
  });

  it('tracks screen orientation lock state from emulation model events', () => {
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
    const setUserAgentOverride = sinon.spy(universe.multitargetNetworkManager, 'setUserAgentOverride');

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
      mobileDevice.vertical = {width: 400, height: 800, hinge: null};

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
      desktopDevice.vertical = {width: 1920, height: 1080, hinge: null};

      const mode: EmulationModel.EmulatedDevices.Mode = {
        title: 'default',
        orientation: EmulationModel.EmulatedDevices.Vertical,
        insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
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

  describe('safe-area insets', () => {
    beforeEach(() => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: true},
      });
    });

    function createSafeAreaDevice(): EmulationModel.EmulatedDevices.EmulatedDevice {
      const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
      device.userAgent = 'test-ua';
      device.vertical = {width: 430, height: 932, hinge: null};
      device.horizontal = {width: 932, height: 430, hinge: null};
      device.modes = [
        {
          title: 'default',
          orientation: EmulationModel.EmulatedDevices.Vertical,
          insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

          safeAreaInsets: new EmulationModel.DeviceModeModel.Insets(0, 59, 0, 34),
        },
        {
          title: 'default',
          orientation: EmulationModel.EmulatedDevices.Horizontal,
          insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

          safeAreaInsets: new EmulationModel.DeviceModeModel.Insets(59, 0, 59, 21),
        },
      ];
      return device;
    }

    it('sends the active mode safe-area insets when emulating a device', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.emulationAgent(), 'invoke_setSafeAreaInsetsOverride');

      try {
        const device = createSafeAreaDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {insets: {top: 59, left: 0, bottom: 34, right: 0}});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('does not send safe-area insets when mobile safe area emulation is disabled', () => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: false},
      });
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.emulationAgent(), 'invoke_setSafeAreaInsetsOverride');

      try {
        const device = createSafeAreaDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {insets: {}});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('sends the landscape safe-area insets when emulating the horizontal mode', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.emulationAgent(), 'invoke_setSafeAreaInsetsOverride');

      try {
        const device = createSafeAreaDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[1]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {insets: {top: 0, left: 59, bottom: 21, right: 59}});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('clears the safe-area override for a device without safe-area data', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.emulationAgent(), 'invoke_setSafeAreaInsetsOverride');

      try {
        const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
        device.userAgent = 'test-ua';
        device.vertical = {width: 400, height: 800, hinge: null};
        const mode: EmulationModel.EmulatedDevices.Mode = {
          title: 'default',
          orientation: EmulationModel.EmulatedDevices.Vertical,
          insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, mode);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {insets: {}});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('does not change device metrics when safe-area insets are present', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const metricsSpy = sinon.stub(target.emulationAgent(), 'invoke_setDeviceMetricsOverride');

      try {
        const deviceWithoutSafeArea = createSafeAreaDevice();
        delete deviceWithoutSafeArea.modes[0].safeAreaInsets;
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, deviceWithoutSafeArea,
                                deviceWithoutSafeArea.modes[0]);
        sinon.assert.called(metricsSpy);
        const metricsWithoutSafeArea = structuredClone(metricsSpy.lastCall.args[0]);

        metricsSpy.resetHistory();

        const deviceWithSafeArea = createSafeAreaDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, deviceWithSafeArea,
                                deviceWithSafeArea.modes[0]);
        sinon.assert.called(metricsSpy);
        const metricsWithSafeArea = structuredClone(metricsSpy.lastCall.args[0]);

        assert.deepEqual(metricsWithSafeArea, metricsWithoutSafeArea);
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });
  });

  describe('display cutout overlay', () => {
    beforeEach(() => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: true},
      });
    });

    function createCutoutDevice(): EmulationModel.EmulatedDevices.EmulatedDevice {
      const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
      device.userAgent = 'test-ua';
      device.vertical = {width: 430, height: 932, hinge: null};
      device.horizontal = {width: 932, height: 430, hinge: null};
      device.modes = [
        {
          title: 'default',
          orientation: EmulationModel.EmulatedDevices.Vertical,
          insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

          cutout: {
            shape: EmulationModel.EmulatedDevices.CutoutShape.PILL,
            x: 153,
            y: 11,
            width: 125,
            height: 37,
            borderRadius: 19,
          },
        },
        {
          title: 'default',
          orientation: EmulationModel.EmulatedDevices.Horizontal,
          insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

        },
      ];
      return device;
    }

    it('sends display cutout geometry through the native overlay path', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 153, y: 11, width: 125, height: 37},
            shape: Protocol.Overlay.DisplayCutoutShape.Pill,
            borderRadius: 19,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('sends persisted custom device cutout geometry through the native overlay path', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1({
          title: 'Custom cutout phone',
          type: 'phone',
          order: 0,
          'show-by-default': false,
          'user-agent': 'test-ua',
          capabilities: ['touch', 'mobile'],
          screen: {
            'device-pixel-ratio': 3,
            vertical: {width: 390, height: 844},
            horizontal: {width: 844, height: 390},
          },
          modes: [
            {
              title: 'default',
              orientation: EmulationModel.EmulatedDevices.Vertical,
              insets: {left: 0, top: 0, right: 0, bottom: 0},
              cutout: {
                shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
                x: 114,
                y: 0,
                width: 162,
                height: 34,
                'upper-radius': 5,
                'lower-radius': 22,
              },
            },
            {
              title: 'default',
              orientation: EmulationModel.EmulatedDevices.Horizontal,
              insets: {left: 0, top: 0, right: 0, bottom: 0},
            },
          ],
        });
        assert.exists(device);
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 114, y: 0, width: 162, height: 34},
            shape: Protocol.Overlay.DisplayCutoutShape.Notch,
            upperRadius: 5,
            lowerRadius: 22,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('clears the display cutout overlay for a device without cutout geometry', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);
        sinon.assert.called(spy);

        const noCutoutDevice = createCutoutDevice();
        delete noCutoutDevice.modes[0].cutout;
        spy.resetHistory();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, noCutoutDevice, noCutoutDevice.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('clears display cutout overlay when mobile safe area emulation is disabled', () => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: false},
      });
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {});
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('shows display cutout overlay when hinge geometry is active', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const displayCutoutSpy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');
      const hingeSpy = sinon.stub(target.overlayAgent(), 'invoke_setShowHinge');

      try {
        const device = createCutoutDevice();
        device.vertical.hinge = {
          x: 210,
          y: 0,
          width: 10,
          height: 932,
          contentColor: {r: 38, g: 38, b: 38, a: 1},
          outlineColor: {r: 38, g: 38, b: 38, a: 1},
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(displayCutoutSpy);
        sinon.assert.called(hingeSpy);
        assert.deepEqual(displayCutoutSpy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 153, y: 11, width: 125, height: 37},
            shape: Protocol.Overlay.DisplayCutoutShape.Pill,
            borderRadius: 19,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
        assert.deepEqual(hingeSpy.lastCall.args[0], {
          hingeConfig: {
            rect: {x: 210, y: 0, width: 10, height: 932},
            contentColor: {r: 38, g: 38, b: 38, a: 1},
            outlineColor: {r: 38, g: 38, b: 38, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('rotates rectangle display cutout geometry in horizontal mode', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        device.modes[0].cutout = {
          shape: EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE,
          x: 126,
          y: 0,
          width: 141,
          height: 45,
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[1]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 887, y: 126, width: 45, height: 141},
            shape: Protocol.Overlay.DisplayCutoutShape.Rectangle,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('rotates pill display cutout geometry in horizontal mode', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[1]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 884, y: 153, width: 37, height: 125},
            shape: Protocol.Overlay.DisplayCutoutShape.Pill,
            borderRadius: 19,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('sends notch display cutout geometry through the native overlay path', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        device.modes[0].cutout = {
          shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
          x: 114,
          y: 0,
          width: 162,
          height: 34,
          upperRadius: 5,
          lowerRadius: 22,
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 114, y: 0, width: 162, height: 34},
            shape: Protocol.Overlay.DisplayCutoutShape.Notch,
            upperRadius: 5,
            lowerRadius: 22,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('rotates notch display cutout geometry in horizontal mode', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        device.modes[0].cutout = {
          shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
          x: 114,
          y: 0,
          width: 162,
          height: 34,
          upperRadius: 5,
          lowerRadius: 22,
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[1]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 898, y: 114, width: 34, height: 162},
            shape: Protocol.Overlay.DisplayCutoutShape.Notch,
            upperRadius: 5,
            lowerRadius: 22,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('sends circle display cutout geometry through the native overlay path', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        device.modes[0].cutout = {
          shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
          x: 162,
          y: 0,
          width: 37,
          height: 58,
          cx: 180,
          cy: 29,
          radius: 14,
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 162, y: 0, width: 37, height: 58},
            shape: Protocol.Overlay.DisplayCutoutShape.Circle,
            cx: 180,
            cy: 29,
            radius: 14,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });

    it('rotates circle display cutout geometry in horizontal mode', () => {
      const em = target.model(SDK.EmulationModel.EmulationModel);
      assert.exists(em);
      deviceModeModel.modelAdded(em);
      const spy = sinon.stub(target.overlayAgent(), 'invoke_setShowDisplayCutout');

      try {
        const device = createCutoutDevice();
        device.modes[0].cutout = {
          shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
          x: 162,
          y: 0,
          width: 37,
          height: 58,
          cx: 180,
          cy: 29,
          radius: 14,
        };
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[1]);

        sinon.assert.called(spy);
        assert.deepEqual(spy.lastCall.args[0], {
          displayCutoutConfig: {
            rect: {x: 874, y: 162, width: 58, height: 37},
            shape: Protocol.Overlay.DisplayCutoutShape.Circle,
            cx: 903,
            cy: 180,
            radius: 14,
            contentColor: {r: 0, g: 0, b: 0, a: 1},
          },
        });
      } finally {
        deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
      }
    });
  });

  it('uses modern default mobile user agent and metadata', () => {
    const setUserAgentOverride = sinon.stub(universe.multitargetNetworkManager, 'setUserAgentOverride');

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

      const modernCall = setUserAgentOverride.getCalls().find((call: sinon.SinonSpyCall) =>
                                                                  call.args[0].includes(`Pixel ${expectedPixelModel}`));
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

  it('behaves correctly when adjusting inputs in responsive mode', () => {
    try {
      const viewportSize = new Geometry.Size(320, 480);
      deviceModeModel.setAvailableSize(viewportSize, viewportSize);
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);

      function assertState(expectedScale: number, expectedAppliedDeviceSize: {width: number, height: number},
                           expectedScreenRect: {left: number, top: number, width: number, height: number},
                           expectedVisiblePageRect: {left: number, top: number, width: number, height: number}) {
        assert.strictEqual(deviceModeModel.scale(), expectedScale);
        assert.strictEqual(deviceModeModel.appliedDeviceSize().width, expectedAppliedDeviceSize.width);
        assert.strictEqual(deviceModeModel.appliedDeviceSize().height, expectedAppliedDeviceSize.height);
        assert.strictEqual(deviceModeModel.screenRect().left, expectedScreenRect.left);
        assert.strictEqual(deviceModeModel.screenRect().top, expectedScreenRect.top);
        assert.strictEqual(deviceModeModel.screenRect().width, expectedScreenRect.width);
        assert.strictEqual(deviceModeModel.screenRect().height, expectedScreenRect.height);
        assert.strictEqual(deviceModeModel.visiblePageRect().left, expectedVisiblePageRect.left);
        assert.strictEqual(deviceModeModel.visiblePageRect().top, expectedVisiblePageRect.top);
        assert.strictEqual(deviceModeModel.visiblePageRect().width, expectedVisiblePageRect.width);
        assert.strictEqual(deviceModeModel.visiblePageRect().height, expectedVisiblePageRect.height);
      }

      assertState(1, {width: 320, height: 480}, {left: 0, top: 0, width: 320, height: 480},
                  {left: 0, top: 0, width: 320, height: 480});

      let width = viewportSize.width - 1;
      deviceModeModel.setWidthAndScaleToFit(width);
      assertState(1, {width: 319, height: 480}, {left: 0.5, top: 0, width: 319, height: 480},
                  {left: 0, top: 0, width: 319, height: 480});

      width = viewportSize.width + 1;
      deviceModeModel.setWidthAndScaleToFit(width);
      assertState(0.99, {width: 321, height: 484},
                  {left: 1.1049999999999898, top: 0, width: 317.79, height: 479.15999999999997},
                  {left: 0, top: 0, width: 317.79, height: 479.15999999999997});

      deviceModeModel.setWidthAndScaleToFit(viewportSize.width);
      assertState(1, {width: 320, height: 480}, {left: 0, top: 0, width: 320, height: 480},
                  {left: 0, top: 0, width: 320, height: 480});

      let height = viewportSize.height - 1;
      deviceModeModel.setHeightAndScaleToFit(height);
      assertState(1, {width: 320, height: 479}, {left: 0, top: 0, width: 320, height: 479},
                  {left: 0, top: 0, width: 320, height: 479});

      height = viewportSize.height + 1;
      deviceModeModel.setHeightAndScaleToFit(height);
      assertState(0.99, {width: 320, height: 481}, {left: 1.5999999999999943, top: 0, width: 316.8, height: 476.19},
                  {left: 0, top: 0, width: 316.8, height: 476.19});

      deviceModeModel.setHeightAndScaleToFit(viewportSize.height);
      assertState(1, {width: 320, height: 480}, {left: 0, top: 0, width: 320, height: 480},
                  {left: 0, top: 0, width: 320, height: 480});

      deviceModeModel.scaleSetting().set(0.5);
      assertState(0.5, {width: 320, height: 480}, {left: 80, top: 0, width: 160, height: 240},
                  {left: 0, top: 0, width: 160, height: 240});

      deviceModeModel.scaleSetting().set(1);
      assertState(1, {width: 320, height: 480}, {left: 0, top: 0, width: 320, height: 480},
                  {left: 0, top: 0, width: 320, height: 480});

      deviceModeModel.scaleSetting().set(1.25);
      assertState(1.25, {width: 256, height: 384}, {left: 0, top: 0, width: 320, height: 480},
                  {left: 0, top: 0, width: 320, height: 480});
    } finally {
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    }
  });

  it('updates scale to fit when setAvailableSize is called after emulate with undefined scale', () => {
    const em = target.model(SDK.EmulationModel.EmulationModel);
    assert.exists(em);
    deviceModeModel.modelAdded(em);

    try {
      const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
      device.userAgent = 'test-ua';
      device.vertical = {width: 1000, height: 1000, hinge: null};
      const mode: EmulationModel.EmulatedDevices.Mode = {
        title: 'default',
        orientation: EmulationModel.EmulatedDevices.Vertical,
        insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

      };

      // Stale scale from previous session.
      deviceModeModel.scaleSetting().set(0.42);

      // Emulate before setAvailableSize is called (simulating DevTools startup).
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, mode, undefined);

      // setAvailableSize is called on layout with preferred size 500x500.
      deviceModeModel.setAvailableSize(new Geometry.Size(500, 500), new Geometry.Size(500, 500));

      // Fit scale for 1000x1000 in 500x500 is 0.5.
      assert.strictEqual(deviceModeModel.scaleSetting().get(), 0.5);
      assert.strictEqual(deviceModeModel.scale(), 0.5);
    } finally {
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    }
  });

  it('preserves explicitly specified scale when setAvailableSize is called after emulate', () => {
    const em = target.model(SDK.EmulationModel.EmulationModel);
    assert.exists(em);
    deviceModeModel.modelAdded(em);

    try {
      const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
      device.userAgent = 'test-ua';
      device.vertical = {width: 1000, height: 1000, hinge: null};
      const mode: EmulationModel.EmulatedDevices.Mode = {
        title: 'default',
        orientation: EmulationModel.EmulatedDevices.Vertical,
        insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

      };

      // Emulate with an explicit scale of 0.75 before setAvailableSize.
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, mode, 0.75);

      // setAvailableSize is called on layout with preferred size 500x500.
      deviceModeModel.setAvailableSize(new Geometry.Size(500, 500), new Geometry.Size(500, 500));

      // Explicit scale of 0.75 should be preserved, not overwritten with fit scale (0.5).
      assert.strictEqual(deviceModeModel.scaleSetting().get(), 0.75);
      assert.strictEqual(deviceModeModel.scale(), 0.75);
    } finally {
      deviceModeModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    }
  });

  describe('saveScreenshot', () => {
    const {urlString} = Platform.DevToolsPath;

    it('generates a correct and safe screenshot filename under 63 characters', async () => {
      const url =
          urlString`https://example.test/path/to/a/very/long/url/representing/some/products/coffee-machine-compact-espresso-maker-stainless-steel-model-77`;
      sinon.stub(deviceModeModel, 'inspectedURL').returns(url);
      sinon.stub(deviceModeModel, 'type').returns(EmulationModel.DeviceModeModel.Type.Device);
      sinon.stub(deviceModeModel, 'device').returns({
        title: 'Pixel 10',
      } as unknown as EmulationModel.EmulatedDevices.EmulatedDevice);

      const saveStub = sinon.stub(universe.fileManager, 'save').resolves({
        fileSystemPath: 'foo' as Platform.DevToolsPath.RawPathString,
      });
      sinon.stub(universe.fileManager, 'close');

      const canvas = new OffscreenCanvas(1, 1);
      canvas.getContext('2d');
      await (deviceModeModel as unknown as {
        saveScreenshot: (canvas: OffscreenCanvas) => Promise<void>,
      }).saveScreenshot(canvas);

      sinon.assert.calledOnce(saveStub);
      const filename = saveStub.firstCall.args[0];
      assert.isAtMost(filename.length, 63);
      assert.isTrue(filename.endsWith('(Pixel 10).png'));
      assert.isFalse(filename.includes('/'));
      assert.strictEqual(filename, 'example.test-path-to-a-very-long-url-representing(Pixel 10).png');
    });

    it('truncates the screenshot filename correctly when the device name is extremely long', async () => {
      const url =
          urlString`https://example.test/path/to/a/very/long/url/representing/some/products/coffee-machine-compact-espresso-maker-stainless-steel-model-77`;
      sinon.stub(deviceModeModel, 'inspectedURL').returns(url);
      sinon.stub(deviceModeModel, 'type').returns(EmulationModel.DeviceModeModel.Type.Device);
      const longDeviceName = 'A'.repeat(70);
      sinon.stub(deviceModeModel, 'device').returns({
        title: longDeviceName,
      } as unknown as EmulationModel.EmulatedDevices.EmulatedDevice);

      const saveStub = sinon.stub(universe.fileManager, 'save').resolves({
        fileSystemPath: 'foo' as Platform.DevToolsPath.RawPathString,
      });
      sinon.stub(universe.fileManager, 'close');

      const canvas = new OffscreenCanvas(1, 1);
      canvas.getContext('2d');
      await (deviceModeModel as unknown as {
        saveScreenshot: (canvas: OffscreenCanvas) => Promise<void>,
      }).saveScreenshot(canvas);

      sinon.assert.calledOnce(saveStub);
      const filename = saveStub.firstCall.args[0];
      assert.isAtMost(filename.length, 63);
      assert.isTrue(filename.endsWith('.png'));
      assert.isFalse(filename.includes('/'));
      const expectedName = `(${'A'.repeat(58)}.png`;
      assert.strictEqual(filename, expectedName);
    });
  });
});
