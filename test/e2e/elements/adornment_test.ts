// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, click, enableExperiment, getBrowserAndPages, resourcesPath} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, expandSelectedNodeRecursively, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

const INACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Enable grid mode"]';
const ACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Disable grid mode"]';

const prepareElementsTab = async () => {
  await waitForElementsStyleSection();
  await assertContentOfSelectedElementsNode('<body>\u200B');
  await expandSelectedNodeRecursively();
};

describe('Adornment in the Elements Tab', async () => {
  beforeEach(async function() {
    const {target} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/elements/adornment.html`);
    await prepareElementsTab();
  });

  it('displays Grid adorners and they can be toggled', async () => {
    await enableExperiment('cssGridFeatures');
    await prepareElementsTab();

    const inactiveGridAdorners = await $$(INACTIVE_GRID_ADORNER_SELECTOR);
    const getNodesContent = (nodes: HTMLElement[]) => nodes.map((node: HTMLElement) => node.textContent);
    const inactiveContent = await inactiveGridAdorners.evaluate(getNodesContent);
    assert.deepEqual(
        inactiveContent,
        [
          'grid',
          'grid',
        ],
        'did not have exactly 2 Grid adorners in the inactive state');

    // Toggle both grid adorners on and try to select them with the active selector
    await click(INACTIVE_GRID_ADORNER_SELECTOR);
    await click(INACTIVE_GRID_ADORNER_SELECTOR);
    const activeGridAdorners = await $$(ACTIVE_GRID_ADORNER_SELECTOR);
    const activeContent = await activeGridAdorners.evaluate(getNodesContent);
    assert.deepEqual(
        activeContent,
        [
          'grid',
          'grid',
        ],
        'did not have exactly 2 Grid adorners in the active state');
  });
});
