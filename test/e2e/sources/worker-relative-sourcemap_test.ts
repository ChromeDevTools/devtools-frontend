// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, goToResource, waitFor} from '../../shared/helper.js';

import {createSelectorsForWorkerFile, expandFileTree, type NestedFileSelector} from '../helpers/sources-helpers.js';

function createSelectorsForEvalWorker(fileName: string) {
  const EVAL_WORKER_NAME = '#1';
  return createSelectorsForWorkerFile(EVAL_WORKER_NAME, 'test/e2e/resources/sources', fileName);
}

async function openNestedWorkerFile(selectors: NestedFileSelector) {
  const workerFile = await expandFileTree(selectors);

  return workerFile.evaluate(node => node.textContent);
}

describe('The Sources Tab', function() {
  let workerSelectors: NestedFileSelector;

  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  before(() => {
    workerSelectors = createSelectorsForEvalWorker('worker-relative-sourcemap.ts');
  });

  it('shows sources from worker\'s source maps', async () => {
    // Have the target load the page.
    await goToResource('sources/worker-relative-sourcemap.html');

    // Locate the button for switching to the sources tab.
    await click('#tab-sources');

    // Wait for the navigation panel to show up
    await waitFor('.navigator-file-tree-item');

    // Check that we can expand the file tree up to the file name node.
    const worker1FileName = await openNestedWorkerFile(workerSelectors);
    assert.strictEqual(worker1FileName, 'worker-relative-sourcemap.ts');
  });
});
