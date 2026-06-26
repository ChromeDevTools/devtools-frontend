// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as EmulationModel from '../emulation/emulation.js';

const BASE_URL = new URL('../../../front_end/emulated_devices/', import.meta.url).toString();

describe('EmulatedDevices can compute CSS image URLs', () => {
  it('as regular string', () => {
    const regularString = 'no url here';
    assert.strictEqual(regularString, EmulationModel.EmulatedDevices.computeRelativeImageURL(regularString));
  });

  it('with empty @url', () => {
    assert.strictEqual(BASE_URL, EmulationModel.EmulatedDevices.computeRelativeImageURL('@url()'));
  });

  it('with single file', () => {
    assert.strictEqual(`${BASE_URL}file.js`, EmulationModel.EmulatedDevices.computeRelativeImageURL('@url(file.js)'));
  });

  it('with surrounding text', () => {
    assert.strictEqual(
        `before ${BASE_URL}long/path/to/the/file.png after`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL('before @url(long/path/to/the/file.png) after'));
  });

  it('with multiple URLs', () => {
    assert.strictEqual(
        `${BASE_URL}first.png ${BASE_URL}second.gif`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL('@url(first.png) @url(second.gif)'));
  });

  it('with multiple URLs with text around', () => {
    assert.strictEqual(
        `a lot of ${BASE_URL}stuff in a ${BASE_URL}singleline and more url() @@url (not/a/resource.gif)`,
        EmulationModel.EmulatedDevices.computeRelativeImageURL(
            'a lot of @url(stuff) in a @url(single)line and more url() @@url (not/a/resource.gif)'));
  });
});

describeWithEnvironment('emulatedDevices', () => {
  it('before parsing, all Chrome UAs all have %s placeholder for major version patching', () => {
    const devices = EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest();
    const chromeRawDevices = devices.filter(d => d['user-agent'].includes(' Chrome/'));
    assert.isAtLeast(chromeRawDevices.length, 20);
    // We should not add any new UAs without the %s that gets patched via `patchUserAgentWithChromeVersion`
    assert.isTrue(chromeRawDevices.every(d => d['user-agent'].includes('Chrome/%s')));
  });

  it('after parsing, all Chrome UAs all have %s placeholder for major version patching', () => {
    const edList = new EmulationModel.EmulatedDevices.EmulatedDevicesList();
    const parsedDevices = edList.standard();
    const chromeDevices = parsedDevices.filter(d => d.userAgent.includes(' Chrome/'));
    assert.isAtLeast(chromeDevices.length, 20);
    // They are patched while parsed, so there should be none remaining
    assert.lengthOf(chromeDevices.filter(d => d.userAgent.includes('Chrome/%s')), 0);
  });

  it('drops user agent metadata when the user agent string is empty', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['user-agent'] = '';
    rawDevice['user-agent-metadata'] = {mobile: false};

    const parsedDevice = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(parsedDevice);
    assert.isNull(parsedDevice?.userAgentMetadata);
  });

  it('does not serialize user agent metadata when the user agent string is empty', () => {
    const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
    device.userAgent = '';
    device.userAgentMetadata = {mobile: false} as NonNullable<typeof device.userAgentMetadata>;

    const json = device.toJSON();
    assert.isUndefined(json['user-agent-metadata']);
  });

  it('parses safe-area-insets on a mode into safeAreaInsets', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      'safe-area-insets': {left: 0, top: 59, right: 0, bottom: 34},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    const safeAreaInsets = device?.modes[0].safeAreaInsets;
    assert.exists(safeAreaInsets);
    assert.strictEqual(safeAreaInsets?.left, 0);
    assert.strictEqual(safeAreaInsets?.top, 59);
    assert.strictEqual(safeAreaInsets?.right, 0);
    assert.strictEqual(safeAreaInsets?.bottom, 34);
  });

  it('leaves safeAreaInsets undefined when a mode has no safe-area data and does not throw', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.isUndefined(device?.modes[0].safeAreaInsets);
  });

  it('round-trips safe-area-insets through toJSON and omits the key when absent', () => {
    const withSafeArea: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    withSafeArea['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      'safe-area-insets': {left: 1, top: 2, right: 3, bottom: 4},
    }];
    const parsed = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(withSafeArea);
    assert.exists(parsed);
    const json = parsed?.toJSON();
    assert.deepEqual(json.modes[0]['safe-area-insets'], {left: 1, top: 2, right: 3, bottom: 4});

    const withoutSafeArea: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    withoutSafeArea['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
    }];
    const parsedPlain = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(withoutSafeArea);
    assert.exists(parsedPlain);
    assert.notProperty(parsedPlain?.toJSON().modes[0], 'safe-area-insets');
  });

  it('does not throw when a safe-area block carries additional unknown keys', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      'safe-area-insets': {left: 0, top: 59, right: 0, bottom: 34, topMax: 59, bottomMax: 34},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.strictEqual(device?.modes[0].safeAreaInsets?.top, 59);
  });

  it('round-trips pill cutout geometry through parse and toJSON', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      cutout: {shape: 'pill', x: 153, y: 11, width: 125, height: 37, 'border-radius': 19},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.deepEqual(device?.modes[0].cutout, {
      shape: EmulationModel.EmulatedDevices.CutoutShape.PILL,
      x: 153,
      y: 11,
      width: 125,
      height: 37,
      borderRadius: 19,
    });

    const json = device?.toJSON();
    assert.deepEqual(json.modes[0].cutout, {shape: 'pill', x: 153, y: 11, width: 125, height: 37, 'border-radius': 19});
  });

  it('round-trips notch cutout geometry through parse and toJSON', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      cutout: {shape: 'notch', x: 114, y: 0, width: 162, height: 34, 'upper-radius': 5, 'lower-radius': 22},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.deepEqual(device?.modes[0].cutout, {
      shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
      x: 114,
      y: 0,
      width: 162,
      height: 34,
      upperRadius: 5,
      lowerRadius: 22,
    });

    const json = device?.toJSON();
    assert.deepEqual(json.modes[0].cutout,
                     {shape: 'notch', x: 114, y: 0, width: 162, height: 34, 'upper-radius': 5, 'lower-radius': 22});
  });

  it('round-trips circle cutout geometry through parse and toJSON', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      cutout: {shape: 'circle', x: 162, y: 0, width: 37, height: 58, cx: 180, cy: 29, radius: 14},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.deepEqual(device?.modes[0].cutout, {
      shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
      x: 162,
      y: 0,
      width: 37,
      height: 58,
      cx: 180,
      cy: 29,
      radius: 14,
    });

    const json = device?.toJSON();
    assert.deepEqual(json.modes[0].cutout,
                     {shape: 'circle', x: 162, y: 0, width: 37, height: 58, cx: 180, cy: 29, radius: 14});
  });

  it('round-trips rectangle cutout geometry through parse and toJSON', () => {
    const rawDevice: Record<string, unknown> =
        structuredClone(EmulationModel.EmulatedDevices.EmulatedDevicesList.rawEmulatedDevicesForTest()[0]);
    rawDevice['modes'] = [{
      title: 'default',
      orientation: 'vertical',
      insets: {left: 0, top: 0, right: 0, bottom: 0},
      cutout: {shape: 'rectangle', x: 126, y: 0, width: 141, height: 45},
    }];

    const device = EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(rawDevice);
    assert.exists(device);
    assert.deepEqual(device?.modes[0].cutout, {
      shape: EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE,
      x: 126,
      y: 0,
      width: 141,
      height: 45,
    });

    const json = device?.toJSON();
    assert.deepEqual(json.modes[0].cutout, {shape: 'rectangle', x: 126, y: 0, width: 141, height: 45});
  });
});
