// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../../conductor/paths.js';
import {
  increaseTimeoutForPerfPanel,
  navigateToBottomUpTab,
  navigateToPerformanceTab,
  setFilter,
  toggleCaseSensitive,
  toggleMatchWholeWordButtonBottomUp,
  toggleRegExButtonBottomUp,
} from '../../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../../shared/frontend-helper.js';
import type {InspectedPage} from '../../shared/target-helper.js';

async function expandNodeRecursively(rootActivity: puppeteer.ElementHandle, devtoolsPage: DevToolsPage) {
  // Trigger an alt-click on the disclosure triangle. Requires getting the event.pageX correctly placed.
  await devtoolsPage.page.keyboard.down('Alt');
  const DISTANCE_BETWEEN_DISCLOSURE_TRIANGLE_AND_ACTIVITY_NAME_PX = 35;
  await rootActivity.click({offset: {x: -DISTANCE_BETWEEN_DISCLOSURE_TRIANGLE_AND_ACTIVITY_NAME_PX, y: 0}});
  await devtoolsPage.page.keyboard.up('Alt');
}

async function enumerateTreeItems(devtoolsPage: DevToolsPage) {
  await devtoolsPage.waitFor('.data-grid-data-grid-node');

  const els = await devtoolsPage.$$<HTMLElement>('.data-grid-data-grid-node.revealed .activity-name');
  const elTexts = await Promise.all(els.map(e => e.evaluate(e => e.innerText)));
  return elTexts;
}

describe('The Performance tool, Bottom-up panel', function() {
  increaseTimeoutForPerfPanel(this);

  setup({dockingMode: 'undocked'});
  // navigate to the Performance tab and upload performance profile
  async function setupPerformancePanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToPerformanceTab('empty', devToolsPage, inspectedPage);

    const uploadProfileHandle = await devToolsPage.waitFor('input[type=file]');
    assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
    await uploadProfileHandle.uploadFile(
        path.join(GEN_DIR, 'test/e2e/resources/performance/timeline/treeView-test-trace.json'));
  }

  it('match case button is working as expected', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['h2', 'H2', 'h2_with_suffix'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
    await toggleCaseSensitive(devToolsPage);
    await setFilter('H2', devToolsPage);
    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, ['H2']);
  });

  it('regex button is working as expected', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const allActivities = ['H2', 'h2_with_suffix', 'h2'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    // click on the "Regex Button" and validate activities
    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    await devToolsPage.waitForElementWithTextContent(allActivities[0], timelineTree);
    await toggleRegExButtonBottomUp(devToolsPage);
    await setFilter('h2$', devToolsPage);
    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, ['H2', 'h2']);
  });

  it('match whole word is working as expected', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['h2', 'H2'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    // click on the "Match whole word" and validate activities
    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
    await toggleMatchWholeWordButtonBottomUp(devToolsPage);
    await setFilter('function', devToolsPage);

    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, ['Function call']);
  });

  it('simple filter is working as expected', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['H2', 'h2_with_suffix', 'h2'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
    await setFilter('h2', devToolsPage);
    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, expectedActivities);
  });

  it('group by', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['Scripting', 'System', 'Rendering', 'Painting', 'Loading'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    // use group-by drop down and validate activities
    const timelineTree = await devToolsPage.$('.timeline-tree-view');
    await devToolsPage.waitForElementWithTextContent('h2_with_suffix', timelineTree);
    const dropdown = await devToolsPage.waitFor('select[aria-label="No grouping"]');
    await dropdown.evaluate(el => {
      (el as HTMLSelectElement).selectedIndex = 2;
      el.dispatchEvent(new Event('change'));
    });

    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, expectedActivities);
  });

  it('filtered results keep context', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['h2_with_suffix', 'container2', 'Function call', 'Timer fired', 'Profiling overhead'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    await toggleRegExButtonBottomUp(devToolsPage);
    await toggleCaseSensitive(devToolsPage);
    await setFilter('h2_', devToolsPage);
    const rootActivity = await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
    assert.isOk(rootActivity, `Could not find ${expectedActivities[0]} in DevTools.`);

    const initialActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(initialActivities, [expectedActivities.at(0)]);

    await expandNodeRecursively(rootActivity, devToolsPage);
    // Wait for all nodes
    await devToolsPage.waitForMany('td.activity-column', 5);

    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, expectedActivities);
  });

  it('sorting "Title" column is working as expected', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const expectedActivities = ['Commit', 'Function call', 'h2_with_suffix', 'h2', 'H2', 'Layerize', 'Layout'];
    await navigateToBottomUpTab(devToolsPage, 'url');

    // validate activities
    await devToolsPage.waitFor('th.activity-column');
    await devToolsPage.click('th.activity-column');
    await devToolsPage.waitFor('th.activity-column.sortable.sort-ascending');

    const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
    const rootActivity = await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
    assert.isOk(rootActivity, `Could not find ${expectedActivities[0]} in DevTools.`);
    await expandNodeRecursively(rootActivity, devToolsPage);
    // Wait for all nodes
    await devToolsPage.waitForMany('td.activity-column', 7);
    const foundActivities = await enumerateTreeItems(devToolsPage);
    assert.deepEqual(foundActivities, expectedActivities);
  });
});
