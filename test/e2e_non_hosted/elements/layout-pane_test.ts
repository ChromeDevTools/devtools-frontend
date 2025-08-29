// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  expandSelectedNodeRecursively,
  getGridsInLayoutPane,
  openLayoutPane,
  toggleElementCheckboxInLayoutPane,
  waitForAdorners,
  waitForElementsStyleSection,
  waitForSomeGridsInLayoutPane,
} from '../../e2e/helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../../e2e/helpers/settings-helpers.js';

describe('Layout Pane in the Elements Tab', function() {
  // FIXME: lower parts of the panel are not visible in docked mode.
  setup({dockingMode: 'undocked'});

  it('displays Layout pane', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/css-grid.html');
    await waitForElementsStyleSection(undefined, devToolsPage);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForAdorners(
        [
          {textContent: 'grid', isActive: false},
        ],
        devToolsPage);
    await openLayoutPane(devToolsPage);
    await toggleElementCheckboxInLayoutPane(devToolsPage);
    await waitForAdorners(
        [
          {textContent: 'grid', isActive: true},
        ],
        devToolsPage);
  });

  it('Lists grids in UA shadow DOM only when needed', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/css-grid-ua-shadow.html');
    await openLayoutPane(devToolsPage);

    const grids = await getGridsInLayoutPane(devToolsPage);
    assert.lengthOf(grids, 1, 'Without UA shadow DOM, there is only one grid');

    await togglePreferenceInSettingsTab('Show user agent shadow DOM', true, devToolsPage);

    // We only wait for at least 2 grids, the <video> element may generate more grids, but we're not interested
    // in testing how many exactly.
    await waitForSomeGridsInLayoutPane(2, devToolsPage);
  });
});
