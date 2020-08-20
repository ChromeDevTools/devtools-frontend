// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, enableExperiment, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertActiveAdorners, assertInactiveAdorners, expandSelectedNodeRecursively, INACTIVE_GRID_ADORNER_SELECTOR, waitForContentOfSelectedElementsNode, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

const prepareElementsTab = async () => {
  await waitForElementsStyleSection();
  await waitForContentOfSelectedElementsNode('<body>\u200B');
  await expandSelectedNodeRecursively();
};

describe('Adornment in the Elements Tab', async () => {
  it('displays Grid adorners and they can be toggled', async () => {
    await goToResource('elements/adornment.html');
    await enableExperiment('cssGridFeatures');
    await prepareElementsTab();

    await assertInactiveAdorners([
      'grid',
      'grid',
    ]);
    await assertActiveAdorners([]);

    // Toggle both grid adorners on and try to select them with the active selector
    await click(INACTIVE_GRID_ADORNER_SELECTOR);
    await click(INACTIVE_GRID_ADORNER_SELECTOR);

    await assertInactiveAdorners([]);
    await assertActiveAdorners([
      'grid',
      'grid',
    ]);
  });
});
