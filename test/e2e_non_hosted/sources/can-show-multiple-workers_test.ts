// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  createSelectorsForWorkerFile,
  expandFileTree,
  type NestedFileSelector,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

function createSelectorsForFile(fileName: string, inspectedPage: InspectedPage) {
  return createSelectorsForWorkerFile(fileName, 'test/e2e/resources/sources', fileName, 1, inspectedPage);
}

async function openNestedWorkerFile(selectors: NestedFileSelector, devToolsPage: DevToolsPage) {
  const workerFile = await expandFileTree(selectors, devToolsPage);

  return await workerFile.evaluate(node => node.textContent);
}

describe('The Sources Tab', function() {
  it('can show multiple dedicated workers with different scripts', async ({devToolsPage, inspectedPage}: {
                                                                     devToolsPage: DevToolsPage,
                                                                     inspectedPage: InspectedPage,
                                                                   }) => {
    const worker1Selectors = createSelectorsForFile('worker1.js', inspectedPage);
    const worker2Selectors = createSelectorsForFile('worker2.js', inspectedPage);
    // Have the target load the page.
    await inspectedPage.goToResource('sources/different-workers.html');

    // Locate the button for switching to the sources tab.
    await devToolsPage.click('#tab-sources');

    // Wait for the navigation panel to show up
    await devToolsPage.waitFor('.navigator-file-tree-item');

    const worker1FileName = await openNestedWorkerFile(worker1Selectors, devToolsPage);
    assert.strictEqual(worker1FileName, 'worker1.js');

    const worker2FileName = await openNestedWorkerFile(worker2Selectors, devToolsPage);
    assert.strictEqual(worker2FileName, 'worker2.js');
  });
});
