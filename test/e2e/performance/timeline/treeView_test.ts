// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../../conductor/paths.js';
import {
  $,
  $$,
  click,
  getBrowserAndPages,
  step,
  waitFor,
  waitForElementWithTextContent,
} from '../../../shared/helper.js';
import {
  navigateToBottomUpTab,
  navigateToPerformanceTab,
  setFilter,
  toggleCaseSensitive,
  toggleMatchWholeWordButtonBottomUp,
  toggleRegExButtonBottomUp,
} from '../../helpers/performance-helpers.js';

async function expandNodeRecursively(rootActivity: puppeteer.ElementHandle) {
  const {frontend} = getBrowserAndPages();

  // Trigger an alt-click on the disclosure triangle. Requires getting the event.pageX correctly placed.
  await frontend.keyboard.down('Alt');
  const DISTANCE_BETWEEN_DISCLOSURE_TRIANGLE_AND_ACTIVITY_NAME_PX = 35;
  await rootActivity.click({offset: {x: -DISTANCE_BETWEEN_DISCLOSURE_TRIANGLE_AND_ACTIVITY_NAME_PX, y: 0}});
  await frontend.keyboard.up('Alt');
}

async function enumerateTreeItems() {
  const {frontend} = getBrowserAndPages();
  await frontend.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

  const els = await $$<HTMLElement>('.data-grid-data-grid-node.revealed .activity-name');
  const elTexts = await Promise.all(els.map(e => e.evaluate(e => e.innerText)));
  return elTexts;
}

describe('The Performance tool, Bottom-up panel', function() {
  // These tests have lots of waiting which might take more time to execute
  if (this.timeout() !== 0) {
    this.timeout(20000);
  }

  beforeEach(async () => {
    await step('navigate to the Performance tab and upload performance profile', async () => {
      await navigateToPerformanceTab('empty');

      const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
      assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
      await uploadProfileHandle.uploadFile(
          path.join(GEN_DIR, 'test/e2e/resources/performance/timeline/treeView-test-trace.json'));
    });
  });

  it('match case button is working as expected', async () => {
    const expectedActivities = ['h2', 'H2', 'h2_with_suffix'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('click on the "Match Case" button and validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await toggleCaseSensitive();
      await setFilter('H2');
      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, ['H2']);
    });
  });

  it('regex button is working as expected', async () => {
    const allActivities = ['H2', 'h2_with_suffix', 'h2'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('click on the "Regex Button" and validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(allActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${allActivities[0]} in frontend.`);
      }
      await toggleRegExButtonBottomUp();
      await setFilter('h2$');
      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, ['H2', 'h2']);
    });
  });

  it('match whole word is working as expected', async () => {
    const expectedActivities = ['h2', 'H2'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('click on the "Match whole word" and validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await toggleMatchWholeWordButtonBottomUp();
      await setFilter('function');

      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, ['Function call']);
    });
  });

  it('simple filter is working as expected', async () => {
    const expectedActivities = ['H2', 'h2_with_suffix', 'h2'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await setFilter('h2');
      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, expectedActivities);
    });
  });

  it('group by', async () => {
    const expectedActivities = ['Scripting', 'System', 'Rendering', 'Painting', 'Loading'];
    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('use group-by drop down and validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle;
      const rootActivity = await waitForElementWithTextContent('h2_with_suffix', timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      const dropdown = await waitFor('select[aria-label="Group by"]');
      await dropdown.evaluate(el => {
        (el as HTMLSelectElement).selectedIndex = 2;
        el.dispatchEvent(new Event('change'));
      });

      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, expectedActivities);
    });
  });

  it('filtered results keep context', async () => {
    const expectedActivities = ['h2_with_suffix', 'container2', 'Function call', 'Timer fired', 'Profiling overhead'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('validate that top level activities have the right context', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      await toggleRegExButtonBottomUp();
      await toggleCaseSensitive();
      await setFilter('h2_');
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }

      const initialActivities = await enumerateTreeItems();
      assert.deepStrictEqual(initialActivities, [expectedActivities.at(0)]);

      await expandNodeRecursively(rootActivity);

      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, expectedActivities);
    });
  });

  it('sorting "Title" column is working as expected', async () => {
    const expectedActivities = ['Commit', 'Function call', 'h2_with_suffix', 'h2', 'H2', 'Layerize', 'Layout'];

    await step('navigate to the Bottom-up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('validate activities', async () => {
      await waitFor('th.activity-column');
      await click('th.activity-column');
      await waitFor('th.activity-column.sortable.sort-ascending');

      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await expandNodeRecursively(rootActivity);
      const foundActivities = await enumerateTreeItems();
      assert.deepStrictEqual(foundActivities, expectedActivities);
    });
  });
});
