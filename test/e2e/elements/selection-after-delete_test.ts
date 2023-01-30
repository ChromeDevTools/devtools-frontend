// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  clickElement,
  getBrowserAndPages,
  goToResource,
  waitForElementWithTextContent,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandSelectedNodeRecursively,
  getContentOfSelectedNode,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForSelectedNodeChange,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', async () => {
  it('can delete elements in the tree', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/selection-after-delete.html');

    // Wait for the file to be loaded and selectors to be shown.
    await waitForElementsStyleSection();

    // Check to make sure we have the correct node selected after opening a file.
    await waitForContentOfSelectedElementsNode('<body>\u200B');
    await expandSelectedNodeRecursively();

    // Wait for the expansion and select the final child in the tree.
    const child = await waitForElementWithTextContent('child2');
    await clickElement(child);

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

      const initialValue = await getContentOfSelectedNode();
      await frontend.keyboard.press('Backspace');
      await waitForSelectedNodeChange(initialValue);

      await waitForContentOfSelectedElementsNode(nextVal);
    } while (expected.length);
  });
});
