// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, getTestServerPort, goToResource, waitFor} from '../../shared/helper.js';

import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Location emulation on Sensors panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Sensors');
  });

  it('includes UI for emulating a location', async () => {
    const select = await waitFor('.geo-fields select');
    const actual = await select.evaluate(node => node.textContent);
    const expected = [
      'No override',
      'Berlin',
      'London',
      'Moscow',
      'Mountain View',
      'Mumbai',
      'San Francisco',
      'Shanghai',
      'São Paulo',
      'Tokyo',
      'Other…',
      'Location unavailable',
    ].join('');
    assert.deepEqual(actual, expected);
  });

  it('unavailable location', async () => {
    const {browser, target} = getBrowserAndPages();
    await goToResource('sensors/geolocation.html');
    // Grant geolocation permissions.
    await browser.defaultBrowserContext().overridePermissions(
        `https://localhost:${getTestServerPort()}`, ['geolocation']);
    await target.bringToFront();

    // Select "Unavailable location" and test the geolocation API.
    const select = await waitFor('.geo-fields select');
    await select.select('unavailable');
    const unavailableResult = await target.evaluate('testGeolocationAPI()');
    assert.strictEqual(unavailableResult, 'fail');

    // Select "Other" and test the geolocation API.
    await select.select('custom');
    const customResult = await target.evaluate('testGeolocationAPI()');
    assert.strictEqual(customResult, 'success');

    await select.select('noOverride');
  });
});
