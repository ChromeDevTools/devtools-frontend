// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  goToResource,
  step,
  waitFor,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  createSelectorsForWorkerFile,
  expandFileTree,
  expandSourceTreeItem,
  openSourcesPanel,
  readSourcesTreeView,
} from '../helpers/sources-helpers.js';

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

describe('Source Panel grouping', async function() {
  const targetPage = 'sources/multi-workers-sourcemap.html';
  const scriptFile = 'multi-workers.min.js';
  function workerFileSelectors(workerIndex: number) {
    return createSelectorsForWorkerFile(scriptFile, 'test/e2e/resources/sources', scriptFile, workerIndex);
  }
  async function validateNavigationTree() {
    await step('Ensure 10 workers exist', async () => {
      await waitFor(workerFileSelectors(10).rootSelector);
    });
  }

  async function validateNavigationTreeNoSourcemaps() {
    await waitFor(createSelectorsForWorkerFile('multi-workers.js', 'test/e2e/resources/sources', 'multi-workers.js', 10)
                      .rootSelector);
  }
  const authoredMenuText = 'Group by Authored/Deployed';
  const folderMenuText = 'Group by folder';

  async function enableGroupByAuthored(noAuthored?: boolean) {
    await click('[aria-label="More options"]');
    await click(`[aria-label="${authoredMenuText}, unchecked"]`);
    await waitForNone('.soft-context-menu');
    await waitFor('.navigator-deployed-tree-item');
    if (noAuthored) {
      // This happens when loading the non-sourcemapped version
      await validateNavigationTreeNoSourcemaps();
    } else {
      await waitFor('.navigator-authored-tree-item');
      await validateNavigationTree();
    }
  }

  async function disableGroupByAuthored() {
    await click('[aria-label="More options"]');
    await click(`[aria-label="${authoredMenuText}, checked"]`);
    await waitForNone('.soft-context-menu');
    await waitForNone('.navigator-deployed-tree-item');
    await waitForNone('.navigator-authored-tree-item');
    await validateNavigationTree();
  }

  async function enableGroupByFolder() {
    await click('[aria-label="More options"]');
    await click(`[aria-label="${folderMenuText}, unchecked"]`);
    await waitForNone('.soft-context-menu');
    await waitFor('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await validateNavigationTree();
  }

  async function disableGroupByFolder() {
    await click('[aria-label="More options"]');
    await click(`[aria-label="${folderMenuText}, checked"]`);
    await waitForNone('.soft-context-menu');
    await waitForNone('[aria-label="test/e2e/resources/sources, nw-folder"]:not(.is-from-source-map)');
    await validateNavigationTree();
  }

  it('can enable and disable group by authored/deployed', async () => {
    // Have the target load the page.
    await goToResource(targetPage);
    await openSourcesPanel();

    // Switch to grouped
    await enableGroupByAuthored();
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await expandFileTree(workerFileSelectors(6));
    assert.deepEqual(await readSourcesTreeView(), groupedExpectedTree);

    // Switch back
    await disableGroupByAuthored();
    await expandFileTree(workerFileSelectors(6));
    assert.deepEqual(await readSourcesTreeView(), defaultExpectedTree);

    // And switch to grouped again...
    await enableGroupByAuthored();
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await expandFileTree(workerFileSelectors(6));
    assert.deepEqual(await readSourcesTreeView(), groupedExpectedTree);
  });

  it('can handle authored script in page and worker', async () => {
    // Have the target load the page.
    await goToResource('sources/redundant-worker-sourcemap.html');
    await openSourcesPanel();

    // Switch to grouped
    await enableGroupByAuthored();
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await expandFileTree(workerFileSelectors(6));
    assert.deepEqual(await readSourcesTreeView(), groupedRedundantExpectedTree);
  });

  // The localhost domain is getting renamed, which breaks this test.
  // TODO(crbug.com/1327683): Enable this once the domain displays correctly.
  it.skip('[crbug.com/1327683] can load new page with group by authored/deployed', async () => {
    // Have the target load the non-sourcemapped page.
    await goToResource('sources/multi-workers.html');
    await openSourcesPanel();

    await validateNavigationTreeNoSourcemaps();
    // Switch to grouped
    await enableGroupByAuthored(true);
    // Reload the page.
    await goToResource(targetPage);
    // Validate source tree
    await validateNavigationTree();
    await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
    await expandFileTree(workerFileSelectors(6));

    assert.deepEqual(await readSourcesTreeView(), groupedExpectedTree);
  });

  // Flaky on Mac
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/1481690] can mix group by authored/deployed and group by folder', async () => {
        // Have the target load the page.
        await goToResource(targetPage);
        await openSourcesPanel();

        // Switch to folderless
        await disableGroupByFolder();
        await expandSourceTreeItem(workerFileSelectors(6).rootSelector);
        await expandSourceTreeItem(
            workerFileSelectors(6).rootSelector + ' + ol > [aria-label="test/e2e/resources/sources, nw-folder"]');
        assert.deepEqual(await readSourcesTreeView(), folderlessExpectedTree);

        // Switch to group by authored, folderless
        await enableGroupByAuthored();
        await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
        await expandSourceTreeItem(workerFileSelectors(6).rootSelector);
        assert.deepEqual(await readSourcesTreeView(), folderlessGroupedExpectedTree);

        // Reenable folders
        await enableGroupByFolder();
        await expandSourceTreeItem('[aria-label="test/e2e/resources/sources, nw-folder"]');
        await expandFileTree(workerFileSelectors(6));
        assert.deepEqual(await readSourcesTreeView(), groupedExpectedTree);
      });
});
