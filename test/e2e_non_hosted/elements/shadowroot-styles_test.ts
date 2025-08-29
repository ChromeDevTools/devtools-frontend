// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Elements Tab', () => {
  it('can show styles in shadow roots', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/shadow-roots.html');

    // Wait for the file to be loaded and selectors to be shown
    await devToolsPage.waitFor('.styles-selector');

    // Check to make sure we have the correct node selected after opening a file
    await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"host">\u200B…\u200B</div>\u200B', devToolsPage);

    // Open the div (shows new nodes, but does not alter the selected node)
    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"host">\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('#shadow-root (open)', devToolsPage);

    // Open the shadow root (shows new nodes, but does not alter the selected node)
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await waitForContentOfSelectedElementsNode('#shadow-root (open)', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<style>\u200B .red { color: red; } \u200B</style>\u200B', devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"inner" class=\u200B"red">\u200Bhi!\u200B</div>\u200B', devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const styleSections = await devToolsPage.$$('.styles-section');
      const numFound = styleSections.length;

      return numFound === 3;
    });

    const styleSections = await devToolsPage.$$('.styles-section');
    const selectorTexts =
        await Promise.all(styleSections.map(n => n.evaluate(node => (node as HTMLElement).innerText)));

    assert.deepEqual(selectorTexts, [
      'element.style {\n}',
      '<style>\n.red {\n}',
      'user agent stylesheet\ndiv {\n}',
    ]);
  });
});
