// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, getElementPosition, resetPages, resourcesPath, $} from '../../shared/helper.js';

describe('Multi-Workers', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('loads scripts exactly once', async () => {
    const {target, frontend} = getBrowserAndPages();

    // Have the target load the page.
    await target.goto(`${resourcesPath}/pages/multi-workers.html`);

    // Locate the button for switching to the sources tab.
    const sourcesTabButtonLocation = await getElementPosition('#tab-sources');
    if (!sourcesTabButtonLocation) {
      assert.fail('Unable to locate sources tab button.');
    }

    // Click on the button and wait for the sources to load. The reason we use this method
    // rather than elementHandle.click() is because the frontend attaches the behavior to
    // a 'mousedown' event (not the 'click' event). To avoid attaching the test behavior
    // to a specific event we instead locate the button in question and ask Puppeteer to
    // click on it instead.
    await frontend.mouse.click(sourcesTabButtonLocation.x, sourcesTabButtonLocation.y);

    const expectedWorkers = new Array(10).fill('multi-workers.js');
    {
      const pane = await frontend.waitForSelector('.navigator-tabbed-pane div[aria-label="Page panel"] div.vbox');
      const tree = (await $('.tree-outline', pane)).asElement();
      // Check that all 10 workers have appeared
      const workers = await tree.$$eval('.navigator-worker-tree-item span.tree-element-title', nodes => nodes.map(n => n.innerHTML));
      assert.deepEqual(workers, expectedWorkers);

      // Navigate down to one of the workers
      await tree.press('ArrowDown');
      await tree.press('ArrowDown');
      await tree.press('ArrowDown');
      await tree.press('ArrowDown');
      await tree.press('ArrowDown');
      // Expand worker
      await tree.press('ArrowRight');
      await tree.press('ArrowDown');
      // Expand domain
      await tree.press('ArrowRight');
      await tree.press('ArrowDown');
      // Expand folder
      await tree.press('ArrowRight');
      await tree.press('ArrowDown');
      // Open script
      await tree.press('Enter');

      // Look at source tabs
      const sourceTabPane = await frontend.waitForSelector('#sources-panel-sources-view .tabbed-pane');
      const sourceTabs = (await $('.tabbed-pane-header-tabs', sourceTabPane)).asElement();
      const openSources = await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
      assert.deepEqual(openSources, ['multi-workers.js']);
    }
    // Reload page
    await target.goto(`${resourcesPath}/pages/multi-workers.html`);

    {
      // Check workers again
      const pane = await frontend.waitForSelector('.navigator-tabbed-pane div[aria-label="Page panel"] div.vbox');
      const tree = (await $('.tree-outline', pane)).asElement();
      const workers = await tree.$$eval('.navigator-worker-tree-item span.tree-element-title', nodes => nodes.map(n => n.innerHTML));
      assert.deepEqual(workers, expectedWorkers);

      // Look at source tabs again
      const sourceTabPane = await frontend.waitForSelector('#sources-panel-sources-view .tabbed-pane');
      const sourceTabs = (await $('.tabbed-pane-header-tabs', sourceTabPane)).asElement();
      const openSources = await sourceTabs.$$eval('.tabbed-pane-header-tab', nodes => nodes.map(n => n.getAttribute('aria-label')));
      assert.deepEqual(openSources, ['multi-workers.js']);
    }
  });
});
