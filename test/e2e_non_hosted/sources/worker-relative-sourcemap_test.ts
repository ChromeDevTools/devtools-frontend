// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  createSelectorsForWorkerFile,
  expandFileTree,
  type NestedFileSelector
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';

function createSelectorsForEvalWorker(fileName: string, inspectedPage: InspectedPage) {
  const EVAL_WORKER_NAME = '#1';
  return createSelectorsForWorkerFile(EVAL_WORKER_NAME, 'test/e2e/resources/sources', fileName, 1, inspectedPage);
}

async function openNestedWorkerFile(selectors: NestedFileSelector, devToolsPage: DevToolsPage) {
  const workerFile = await expandFileTree(selectors, devToolsPage);

  return await workerFile.evaluate(node => node.textContent);
}

describe('The Sources Tab', function() {
  it('shows sources from worker\'s source maps', async ({devToolsPage, inspectedPage}) => {
    const workerSelectors = createSelectorsForEvalWorker('worker-relative-sourcemap.ts', inspectedPage);
    // Have the target load the page.
    await inspectedPage.goToResource('sources/worker-relative-sourcemap.html');

    // Locate the button for switching to the sources tab.
    await devToolsPage.click('#tab-sources');

    // Wait for the navigation panel to show up
    await devToolsPage.waitFor('.navigator-file-tree-item');

    // Check that we can expand the file tree up to the file name node.
    const worker1FileName = await openNestedWorkerFile(workerSelectors, devToolsPage);
    assert.strictEqual(worker1FileName, 'worker-relative-sourcemap.ts');
  });
});
