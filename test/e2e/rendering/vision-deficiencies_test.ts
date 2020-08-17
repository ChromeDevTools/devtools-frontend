// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Rendering pane', () => {
  it('includes UI for simulating vision deficiencies', async () => {
    await openPanelViaMoreTools('Rendering');

    const option = await waitFor('option[value="achromatopsia"]');
    const actual = await option.evaluate(node => {
      const select = node.closest('select');
      return select ? select.textContent : '';
    });
    const expected = [
      'No emulation',
      'Blurred vision',
      'Protanopia',
      'Deuteranopia',
      'Tritanopia',
      'Achromatopsia',
    ].join('');
    assert.deepEqual(actual, expected);
  });
});
