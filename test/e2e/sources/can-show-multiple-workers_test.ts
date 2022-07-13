// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';

import {createSelectorsForWorkerFile, expandFileTree, type NestedFileSelector} from '../helpers/sources-helpers.js';

let WORKER1_SELECTORS: NestedFileSelector;
let WORKER2_SELECTORS: NestedFileSelector;

function createSelectorsForFile(fileName: string) {
  return createSelectorsForWorkerFile(fileName, 'test/e2e/resources/sources', fileName);
}

async function openNestedWorkerFile(selectors: NestedFileSelector) {
  const workerFile = await expandFileTree(selectors);

  return workerFile.evaluate(node => node.textContent);
}

describe('The Sources Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  before(() => {
    WORKER1_SELECTORS = createSelectorsForFile('worker1.js');
    WORKER2_SELECTORS = createSelectorsForFile('worker2.js');
  });

  it('can show multiple dedicated workers with different scripts', async () => {
    // Have the target load the page.
    await goToResource('sources/different-workers.html');

    // Locate the button for switching to the sources tab.
    await click('#tab-sources');

    // Wait for the navigation panel to show up
    await waitFor('.navigator-file-tree-item');

    const worker1FileName = await openNestedWorkerFile(WORKER1_SELECTORS);
    assert.strictEqual(worker1FileName, 'worker1.js');

    const worker2FileName = await openNestedWorkerFile(WORKER2_SELECTORS);
    assert.strictEqual(worker2FileName, 'worker2.js');
  });
});
