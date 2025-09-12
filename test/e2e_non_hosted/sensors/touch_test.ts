// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('Sensors panel', () => {
  it('includes UI for emulating touch', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    const select = await devToolsPage.waitFor('.touch-section select');
    const actual = await select.evaluate(node => node.textContent);

    const expected = [
      'Device-based',
      'Force enabled',
    ].join('');
    assert.deepEqual(actual, expected);
  });
});
