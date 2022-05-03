// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandSelectedNodeRecursively,
  getGridsInLayoutPane,
  openLayoutPane,
  toggleElementCheckboxInLayoutPane,
  waitForAdorners,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForSomeGridsInLayoutPane,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('Layout Pane in the Elements Tab', async function() {
  it('displays Layout pane', async () => {
    await goToResource('elements/css-grid.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await expandSelectedNodeRecursively();
    });
    await waitForAdorners([
      {textContent: 'grid', isActive: false},
    ]);
    await openLayoutPane();
    await toggleElementCheckboxInLayoutPane();
    await waitForAdorners([
      {textContent: 'grid', isActive: true},
    ]);
  });

  it('Lists grids in UA shadow DOM only when needed', async () => {
    await goToResource('elements/css-grid-ua-shadow.html');
    await openLayoutPane();

    const grids = await getGridsInLayoutPane();
    assert.strictEqual(grids.length, 1, 'Without UA shadow DOM, there is only one grid');

    await togglePreferenceInSettingsTab('Show user agent shadow DOM');

    // We only wait for at least 2 grids, the <video> element may generate more grids, but we're not interested
    // in testing how many exactly.
    await waitForSomeGridsInLayoutPane(2);
  });
});
