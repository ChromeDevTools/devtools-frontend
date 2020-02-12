// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';

const WORKER1_SELECTORS = createSelectorsForFile('worker1.js');
const WORKER2_SELECTORS = createSelectorsForFile('worker2.js');

type NestedFileSelector = {
  rootSelector: string,
  domainSelector: string,
  folderSelector: string,
  fileSelector: string,
};

function createSelectorsForFile(fileName: string): NestedFileSelector {
  const rootSelector = `[aria-label="${fileName}, worker"]`;
  const domainSelector = `${rootSelector} + ol > [aria-label="localhost:8090, domain"]`;
  const folderSelector = `${domainSelector} + ol > [aria-label="test/e2e/resources/sources, nw-folder"]`;
  const fileSelector = `${folderSelector} + ol > [aria-label="${fileName}, file"]`;

  return {
    rootSelector,
    domainSelector,
    folderSelector,
    fileSelector,
  };
}

async function doubleClickSourceTreeItem(selector: string) {
  await waitFor(selector);
  await click(selector, {clickOptions: {clickCount: 2}});
}

async function openNestedWorkerFile(selectors: NestedFileSelector) {
  await doubleClickSourceTreeItem(selectors.rootSelector);
  await doubleClickSourceTreeItem(selectors.domainSelector);
  await doubleClickSourceTreeItem(selectors.folderSelector);
  await waitFor(selectors.fileSelector);
  const workerFile = await $(selectors.fileSelector);

  return workerFile.asElement()!.evaluate(node => node.textContent);
}

describe('The Sources Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can show multiple dedicated workers with different scripts', async () => {
    const {target} = getBrowserAndPages();

    // Have the target load the page.
    await target.goto(`${resourcesPath}/sources/different-workers.html`);

    // Locate the button for switching to the sources tab.
    await click('#tab-sources');

    // Wait for the navigation panel to show up
    await waitFor('.navigator-file-tree-item');

    const worker1FileName = await openNestedWorkerFile(WORKER1_SELECTORS);
    assert.equal(worker1FileName, 'worker1.js');

    const worker2FileName = await openNestedWorkerFile(WORKER2_SELECTORS);
    assert.equal(worker2FileName, 'worker2.js');
  });
});
