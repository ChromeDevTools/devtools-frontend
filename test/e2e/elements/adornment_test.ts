// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, enableExperiment, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandSelectedNodeRecursively, INACTIVE_GRID_ADORNER_SELECTOR, waitForAdorners, waitForContentOfSelectedElementsNode, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

const prepareElementsTab = async () => {
  await waitForElementsStyleSection();
  await waitForContentOfSelectedElementsNode('<body>\u200B');
  await expandSelectedNodeRecursively();
};

describe('Adornment in the Elements Tab', async function() {
  // This test relies on the context menu which takes a while to appear, so we bump the timeout a bit.
  this.timeout(10000);

  it('displays grid and flex adorners', async () => {
    await goToResource('elements/adornment.html');
    await enableExperiment('cssGridFeatures');
    await enableExperiment('cssFlexboxFeatures');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  // Flaky test
  it.skip('[crbug.com/1134593] can toggle adorners', async () => {
    await goToResource('elements/adornment.html');
    await enableExperiment('cssGridFeatures');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'grid', isActive: false},
    ]);

    // Toggle both grid adorners on and try to select them with the active selector
    await click(INACTIVE_GRID_ADORNER_SELECTOR);
    await click(INACTIVE_GRID_ADORNER_SELECTOR);

    await waitForAdorners([
      {textContent: 'grid', isActive: true},
      {textContent: 'grid', isActive: true},
    ]);
  });

  it('does not display adorners on shadow roots when their parents are grid or flex containers', async () => {
    await goToResource('elements/adornment-shadow.html');
    await enableExperiment('cssGridFeatures');
    await enableExperiment('cssFlexboxFeatures');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });
});
