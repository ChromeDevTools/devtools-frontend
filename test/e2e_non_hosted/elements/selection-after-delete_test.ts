// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  getContentOfSelectedNode,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
  waitForSelectedNodeChange,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('can delete elements in the tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/selection-after-delete.html');

    // Wait for the file to be loaded and selectors to be shown.
    await waitForElementsStyleSection(undefined, devToolsPage);
    await expandSelectedNodeRecursively(devToolsPage);

    // Wait for the expansion and select the final child in the tree.
    const child = await waitForElementWithPartialText('child2', devToolsPage);
    await child.click();

    const expected = [
      '<div class=\u200B"child3">\u200B</div>\u200B',
      '<div class=\u200B"child1">\u200B</div>\u200B',
      '<div class=\u200B"left">\u200B</div>\u200B',
      '<div id=\u200B"testTreeContainer">\u200B</div>\u200B',
      '<body>\u200B</body>\u200B',
    ];

    // Start deleting and ensure that the selected child is the one expected.
    do {
      const nextVal = expected.shift() || '';

      const initialValue = await getContentOfSelectedNode(devToolsPage);
      await devToolsPage.page.keyboard.press('Backspace');
      await waitForSelectedNodeChange(initialValue, devToolsPage);

      await waitForContentOfSelectedElementsNode(nextVal, devToolsPage);
    } while (expected.length);
  });
});
