// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('Location emulation on Sensors panel', () => {
  it('includes UI for emulating a location', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    const select = await devToolsPage.waitFor('.geo-fields select');
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

  it('unavailable location', async ({devToolsPage, inspectedPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    await inspectedPage.goToResource('sensors/geolocation.html');
    // Grant geolocation permissions.
    await inspectedPage.page.browserContext().overridePermissions(
        `https://localhost:${inspectedPage.serverPort}`, ['geolocation']);
    await inspectedPage.bringToFront();

    // Select "Unavailable location" and test the geolocation API.
    const select = await devToolsPage.waitFor('.geo-fields select');
    await select.select('unavailable');
    const unavailableResult = await inspectedPage.evaluate('testGeolocationAPI()');
    assert.strictEqual(unavailableResult, 'fail');

    // Select "Other" and test the geolocation API.
    await select.select('custom');
    const customResult = await inspectedPage.evaluate('testGeolocationAPI()');
    assert.strictEqual(customResult, 'success');

    await select.select('noOverride');
  });
});
