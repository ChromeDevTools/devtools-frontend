// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {enableExperiment, goToResource, step} from '../../shared/helper.js';
import {assertActiveAdorners, assertInactiveAdorners, expandSelectedNodeRecursively, openLayoutPane, toggleElementCheckboxInLayoutPane, waitForContentOfSelectedElementsNode, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

describe('Layout Pane in the Elements Tab', async function() {
  it('displays Layout pane', async () => {
    await enableExperiment('cssGridFeatures');
    await goToResource('elements/css-grid.html');
    await step('Prepare elements tab', async () => {
      await waitForElementsStyleSection();
      await waitForContentOfSelectedElementsNode('<body>\u200B');
      await expandSelectedNodeRecursively();
    });
    await assertInactiveAdorners([
      'grid',
    ]);
    await assertActiveAdorners([]);
    await openLayoutPane();
    await toggleElementCheckboxInLayoutPane();
    await assertInactiveAdorners([]);
    await assertActiveAdorners([
      'grid',
    ]);
  });
});
