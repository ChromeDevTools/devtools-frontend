// Copyright 2024 The Chromium Authors
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
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('Layout Pane in the Elements Tab', function() {
  // FIXME: lower parts of the panel are not visible in docked mode.
  setup({dockingMode: 'undocked'});

  it('displays Layout pane', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/css-grid.html');
    await waitForElementsStyleSection(devToolsPage, undefined);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid', isActive: false},
    ]);
    await openLayoutPane(devToolsPage);
    await toggleElementCheckboxInLayoutPane(devToolsPage);
    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid', isActive: true},
    ]);
  });

  it('Lists grids in UA shadow DOM only when needed', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/css-grid-ua-shadow.html');
    await openLayoutPane(devToolsPage);

    const grids = await getGridsInLayoutPane(devToolsPage);
    assert.lengthOf(grids, 1, 'Without UA shadow DOM, there is only one grid');

    await togglePreferenceInSettingsTab(devToolsPage, 'User agent shadow DOM', true);

    // We only wait for at least 2 grids, the <video> element may generate more grids, but we're not interested
    // in testing how many exactly.
    await waitForSomeGridsInLayoutPane(devToolsPage, 2);
  });
});
