// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

const SNIPPETS_TAB_SELECTOR = '[aria-label="Snippets"]';

describe('Snippets', function() {
  it('with special characters in their name can be deleted', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const sourcePanel = await openSourcesPanel(devToolsPage);
    await devToolsPage.clickMoreTabsButton(sourcePanel);
    await devToolsPage.click(SNIPPETS_TAB_SELECTOR);

    await devToolsPage.click('[aria-label="New snippet"]');
    // The tree item for the new snippet shows up before the rename prompt is
    // activated, so wait for the prompt to be in editing mode before typing.
    await devToolsPage.waitFor('[aria-label^="Script snippet"] devtools-prompt[editing]');
    await devToolsPage.typeText('file@name\n');

    // Committing the rename and re-rendering the tree item happen asynchronously.
    await devToolsPage.waitFor('[aria-label="file@name, file"]');
    const treeItemNames = await devToolsPage.waitForFunction(async () => {
      const treeItems = await devToolsPage.$$('.navigator-file-tree-item');
      const names = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
      return names.length === 1 && names[0] === 'file@name' ? names : undefined;
    });
    assert.deepEqual(treeItemNames, ['file@name']);

    await openSoftContextMenuAndClickOnItem(devToolsPage, '[aria-label="file@name, file"]', 'Remove');

    await devToolsPage.waitForNone('.navigator-file-tree-item');
  });
});
