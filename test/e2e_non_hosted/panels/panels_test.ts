// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {runCommandWithQuickOpen} from '../../e2e/helpers/quick_open-helpers.js';

// Ideally we want to have all panels within this list,
// but introducing shadow doms for all panels currently leads
// to unwanted visual side effects.
const PANEL_NAMES = [
  'Lighthouse',
];

describe('DevTools panels', () => {
  PANEL_NAMES.forEach(panel => {
    it(`${panel} doesn't increase number of adopted style sheets on the document`, async ({devToolsPage}) => {
      const previousNumStyleSheets = await devToolsPage.evaluate(() => document.adoptedStyleSheets.length);
      await runCommandWithQuickOpen(`Show ${panel}`, devToolsPage);
      await devToolsPage.waitFor(`[aria-label="${panel}"]`);
      const nextNumStyleSheets = await devToolsPage.evaluate(() => document.adoptedStyleSheets.length);
      assert.strictEqual(previousNumStyleSheets, nextNumStyleSheets);
    });
  });
});
