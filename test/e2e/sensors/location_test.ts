// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
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
});
