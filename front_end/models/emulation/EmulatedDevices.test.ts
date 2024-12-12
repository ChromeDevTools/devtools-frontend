// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
});
