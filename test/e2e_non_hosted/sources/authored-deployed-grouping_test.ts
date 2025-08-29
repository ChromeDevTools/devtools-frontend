// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  createSelectorsForWorkerFile,
  expandFileTree,
  expandSourceTreeItem,
  openSourcesPanel,
  readSourcesTreeView,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const groupedExpectedTree = [
  'Authored',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.js',
  'Deployed',
  'top',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers-sourcemap.html',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
];

const groupedRedundantExpectedTree = [
  'Authored',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.js',
  'Deployed',
  'top',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'redundant-worker-sourcemap.html',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
];

const defaultExpectedTree = [
  'top',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers-sourcemap.html',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'localhost:XXXX',
  'test/e2e/resources/sources',
];

const folderlessExpectedTree = [
  'top',
  'multi-workers-sourcemap.html',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'test/e2e/resources/sources',
  'multi-workers.min.js',
];

const folderlessGroupedExpectedTree = [
  'Authored',
  'test/e2e/resources/sources',
  'multi-workers.js',
  'Deployed',
  'top',
  'multi-workers-sourcemap.html',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
  'multi-workers.min.js',
];

describe('Source Panel grouping', function() {
  const targetPage = 'sources/multi-workers-sourcemap.html';
  const scriptFile = 'multi-workers.min.js';

  function workerFileSelectors(workerIndex: number, inspectedPage: InspectedPage) {
    return createSelectorsForWorkerFile(
        scriptFile, 'test/e2e/resources/sources', scriptFile, workerIndex, inspectedPage);
  }

  async function validateNavigationTree(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.waitFor(workerFileSelectors(10, inspectedPage).rootSelector);
  }

  async function validateNavigationTreeNoSourcemaps(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.waitFor(
        createSelectorsForWorkerFile(
            'multi-workers.js', 'test/e2e/resources/sources', 'multi-workers.js', 10, inspectedPage)
            .rootSelector);
  }
  const authoredMenuText = 'Group by Authored/Deployed';
  const folderMenuText = 'Group by folder';

  async function enableGroupByAuthored(devToolsPage: DevToolsPage, inspectedPage: InspectedPage, noAuthored?: boolean) {
    await devToolsPage.click('[title="More options"]');
    await devToolsPage.click(`[aria-label="${authoredMenuText}, unchecked"]`);
    await devToolsPage.waitForNone('.soft-context-menu');
    await devToolsPage.waitFor('.navigator-deployed-tree-item');
    if (noAuthored) {
      // This happens when loading the non-sourcemapped version
      await validateNavigationTreeNoSourcemaps(devToolsPage, inspectedPage);
    } else {
      await devToolsPage.waitFor('.navigator-authored-tree-item');
      await validateNavigationTree(devToolsPage, inspectedPage);
    }
  }

  async function disableGroupByAuthored(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.click('[title="More options"]');
    await devToolsPage.click(`[aria-label="${authoredMenuText}, checked"]`);
    await devToolsPage.waitForNone('.soft-context-menu');
    await devToolsPage.waitForNone('.navigator-deployed-tree-item');
    await devToolsPage.waitForNone('.navigator-authored-tree-item');
    await validateNavigationTree(devToolsPage, inspectedPage);
  }

  async function enableGroupByFolder(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.click('[title="More options"]');
    await devToolsPage.click(`[aria-label="${folderMenuText}, unchecked"]`);
    await devToolsPage.waitForNone('.soft-context-menu');
    await devToolsPage.waitFor('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await validateNavigationTree(devToolsPage, inspectedPage);
  }

  async function disableGroupByFolder(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.click('[title="More options"]');
    await devToolsPage.click(`[aria-label="${folderMenuText}, checked"]`);
    await devToolsPage.waitForNone('.soft-context-menu');
    await devToolsPage.waitForNone('[aria-label="test/e2e/resources/sources, nw-folder"]:not(.is-from-source-map)');
    await validateNavigationTree(devToolsPage, inspectedPage);
  }

  it('can enable and disable group by authored/deployed', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the page.
    await inspectedPage.goToResource(targetPage);
    await openSourcesPanel(devToolsPage);

    // Switch to grouped
    await enableGroupByAuthored(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), groupedExpectedTree);

    // Switch back
    await disableGroupByAuthored(devToolsPage, inspectedPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), defaultExpectedTree);

    // And switch to grouped again...
    await enableGroupByAuthored(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), groupedExpectedTree);
  });

  it('can handle authored script in page and worker', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the page.
    await inspectedPage.goToResource('sources/redundant-worker-sourcemap.html');
    await openSourcesPanel(devToolsPage);

    // Switch to grouped
    await enableGroupByAuthored(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), groupedRedundantExpectedTree);
  });

  it('can load new page with group by authored/deployed', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the non-sourcemapped page.
    await inspectedPage.goToResource('sources/multi-workers.html');
    await openSourcesPanel(devToolsPage);

    await validateNavigationTreeNoSourcemaps(devToolsPage, inspectedPage);
    // Switch to grouped
    await enableGroupByAuthored(devToolsPage, inspectedPage, true);
    // Reload the page.
    await inspectedPage.goToResource(targetPage);
    // Validate source tree
    await validateNavigationTree(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);

    assert.deepEqual(await readSourcesTreeView(devToolsPage), groupedExpectedTree);
  });

  it('can mix group by authored/deployed and group by folder', async ({devToolsPage, inspectedPage}) => {
    // Have the target load the page.
    await inspectedPage.goToResource(targetPage);
    await openSourcesPanel(devToolsPage);

    // Switch to folderless
    await disableGroupByFolder(devToolsPage, inspectedPage);
    await expandSourceTreeItem(workerFileSelectors(6, inspectedPage).rootSelector, devToolsPage);
    await expandSourceTreeItem(
        workerFileSelectors(6, inspectedPage).rootSelector +
            ' + ol > [aria-label="test/e2e/resources/sources, nw-folder"]',
        devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), folderlessExpectedTree);

    // Switch to group by authored, folderless
    await enableGroupByAuthored(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandSourceTreeItem(workerFileSelectors(6, inspectedPage).rootSelector, devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), folderlessGroupedExpectedTree);

    // Reenable folders
    await enableGroupByFolder(devToolsPage, inspectedPage);
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]', devToolsPage);
    await expandFileTree(workerFileSelectors(6, inspectedPage), devToolsPage);
    assert.deepEqual(await readSourcesTreeView(devToolsPage), groupedExpectedTree);
  });
});
