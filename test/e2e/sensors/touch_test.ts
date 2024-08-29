// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitFor} from '../../shared/helper.js';

import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Sensors panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Sensors');
  });

  it('includes UI for emulating touch', async () => {
    const select = await waitFor('.touch-section select');
    const actual = await select.evaluate(node => node.textContent);

    const expected = [
      'Device-based',
      'Force enabled',
    ].join('');
    assert.deepEqual(actual, expected);
  });
});
