// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

const SNIPPETS_TAB_SELECTOR = '[aria-label="Snippets"]';

describe('Snippets', function() {
  it('with special characters in their name can be deleted', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    const sourcePanel = await openSourcesPanel(devToolsPage);
    await devToolsPage.clickMoreTabsButton(sourcePanel);
    await devToolsPage.click(SNIPPETS_TAB_SELECTOR);

    await devToolsPage.click('[aria-label="New snippet"]');
    await devToolsPage.typeText('file@name\n');

    let treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    const treeItemNames = await Promise.all(treeItems.map(x => x.evaluate(y => y.textContent)));
    assert.deepEqual(treeItemNames, ['file@name']);

    await openSoftContextMenuAndClickOnItem('[aria-label="file@name, file"]', 'Remove', devToolsPage);

    treeItems = await devToolsPage.$$('.navigator-file-tree-item');
    assert.lengthOf(treeItems, 0);
  });
});
