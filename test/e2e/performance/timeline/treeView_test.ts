// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  click,
  getBrowserAndPages,
  step,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
} from '../../../shared/helper.js';
import {describe, it} from '../../../shared/mocha-extensions.js';
import {
  navigateToBottomUpTab,
  navigateToPerformanceTab,
  setFilter,
  toggleCaseSensitive,
  toggleMatchWholeWordButtonBottomUp,
  toggleRegExButtonBottomUp,
} from '../../helpers/performance-helpers.js';

async function checkActivityTree(
    frontend: puppeteer.Page, expectedActivities: string[], expandSubTree: boolean = false) {
  let index = 0;
  let parentItem: puppeteer.ElementHandle<Element>|undefined = undefined;
  let result = false;
  do {
    result = await waitForFunction(async () => {
      if (parentItem) {
        parentItem.evaluate(e => e.scrollIntoView());
      }
      const treeItem = await $<HTMLElement>('.data-grid-data-grid-node.selected.revealed .activity-name');
      if (!treeItem) {
        return false;
      }
      const treeItemText = await treeItem.evaluate(el => el.innerText);
      if (expectedActivities[index] === treeItemText) {
        parentItem = treeItem;
        return true;
      }
      return false;
    });
    index++;

    if (expandSubTree) {
      await frontend.keyboard.press('ArrowRight');
    }

    await frontend.keyboard.press('ArrowDown');
  } while (index < expectedActivities.length);

  return result;
}

async function validateTreeParentActivities(expectedActivities: string[]) {
  return await waitForFunction(async () => {
    let result = true;
    const treeItems = await $$<HTMLElement>('.data-grid-data-grid-node.parent.revealed .activity-name');
    if (!treeItems || expectedActivities.length !== treeItems.length) {
      return false;
    }

    for (let i = 0; i < treeItems.length; i++) {
      const treeItem = treeItems[i];
      const treeItemText = await treeItem.evaluate(el => el.innerText);
      if (expectedActivities.filter(el => el === treeItemText).length === 0) {
        result = false;
        break;
      }
    }

    return result;
  });
}

describe('The Performance tool, Bottom-up panel', async function() {
  // These tests have lots of waiting which might take more time to execute
  if (this.timeout() !== 0) {
    this.timeout(20000);
  }

  beforeEach(async () => {
    await step('navigate to the Performance tab and upload performance profile', async () => {
      await navigateToPerformanceTab('empty');

      const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
      assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
      await uploadProfileHandle.uploadFile('test/e2e/resources/performance/timeline/treeView-test-trace.json');
    });
  });

  it('match case button is working as expected', async () => {
    const expectedActivities = ['h2', 'H2', 'h2_with_suffix'];

    await step('navigate to the Bottom Up tab', async () => {
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
      assert.isTrue(await validateTreeParentActivities(['H2']), 'Tree does not contain expected activities');
    });
  });

  it('regex button is working as expected', async () => {
    const expectedActivities = ['h2', 'H2', 'h2_with_suffix'];

    await step('navigate to the Bottom Up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('click on the "Regex Button" and validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await toggleRegExButtonBottomUp();
      await setFilter('h2$');
      assert.isTrue(await validateTreeParentActivities(['h2', 'H2']), 'Tree does not contain expected activities');
    });
  });

  it('match whole word is working as expected', async () => {
    const expectedActivities = ['h2', 'H2'];

    await step('navigate to the Bottom Up tab', async () => {
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
      assert.isTrue(await validateTreeParentActivities(['Function Call']), 'Tree does not contain expected activities');
    });
  });

  it('simple filter is working as expected', async () => {
    const expectedActivities = ['h2', 'H2', 'h2_with_suffix'];

    await step('navigate to the Bottom Up tab', async () => {
      await navigateToBottomUpTab();
    });

    await step('validate activities', async () => {
      const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
      const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
      if (!rootActivity) {
        assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
      }
      await setFilter('h2');
      assert.isTrue(
          await validateTreeParentActivities(expectedActivities), 'Tree does not contain expected activities');
    });
  });

  it('filtered results keep context', async () => {
    const {frontend} = getBrowserAndPages();
    const expectedActivities = ['h2_with_suffix', 'container2', 'Function Call', 'Timer Fired'];

    await step('navigate to the Bottom Up tab', async () => {
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
      await rootActivity.click();
      assert.isTrue(
          await checkActivityTree(frontend, expectedActivities, true), 'Tree does not contain expected activities');
    });
  });

  it('sorting "Title" column is working as expected', async () => {
    const {frontend} = getBrowserAndPages();
    const expectedActivities = ['Commit', 'Function Call', 'h2_with_suffix', 'h2', 'H2', 'Layerize', 'Layout'];

    await step('navigate to the Bottom Up tab', async () => {
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
      await rootActivity.click();

      assert.isTrue(
          await checkActivityTree(frontend, expectedActivities),
          'Tree does not contain activities in the expected order');
    });
  });
});
