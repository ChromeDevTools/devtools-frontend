// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {waitFor} from '../../shared/helper.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Sensors panel', () => {
  beforeEach(async () => {
    await openPanelViaMoreTools('Sensors');
  });

  it('includes UI for emulating an idle state', async () => {
    const select = await waitFor('.idle-section select');
    const actual = await select.evaluate(node => node.textContent);

    const expected = [
      'No idle emulation',
      'User active, screen unlocked',
      'User active, screen locked',
      'User idle, screen unlocked',
      'User idle, screen locked',
    ].join('');
    assert.deepEqual(actual, expected);
  });
});
