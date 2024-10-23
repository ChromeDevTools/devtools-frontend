// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  waitFor,
} from '../../shared/helper.js';

// Ideally we want to have all panels within this list,
// but introducing shadow doms for all panels currently leads
// to unwanted visual side effects.
const PANEL_NAMES = [
  'Lighthouse',
];

import {runCommandWithQuickOpen} from '../helpers/quick_open-helpers.js';

describe('DevTools panels', function() {
  PANEL_NAMES.forEach(panel => {
    it(`${panel} doesn't increase number of adopted style sheets on the document`, async () => {
      const {frontend} = getBrowserAndPages();
      const previousNumStyleSheets = await frontend.evaluate(() => document.adoptedStyleSheets.length);
      await runCommandWithQuickOpen(`Show ${panel}`);
      await waitFor(`[aria-label="${panel}"]`);
      const nextNumStyleSheets = await frontend.evaluate(() => document.adoptedStyleSheets.length);
      assert.strictEqual(previousNumStyleSheets, nextNumStyleSheets);
    });
  });
});
