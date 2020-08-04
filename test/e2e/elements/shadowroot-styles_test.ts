// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, waitForChildrenOfSelectedElementNode} from '../helpers/elements-helpers.js';

describe('The Elements Tab', async () => {
  it('can show styles in shadow roots', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/shadow-roots.html');

    // Wait for the file to be loaded and selectors to be shown
    await waitFor('.styles-selector');

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"host">\u200B…\u200B</div>\u200B');

    // Open the div (shows new nodes, but does not alter the selected node)
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"host">\u200B');

    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('#shadow-root (open)');

    // Open the shadow root (shows new nodes, but does not alter the selected node)
    await frontend.keyboard.press('ArrowRight');
    await waitForChildrenOfSelectedElementNode();
    await assertContentOfSelectedElementsNode('#shadow-root (open)');

    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<style>\u200B .red { color: red; } \u200B</style>\u200B');

    await frontend.keyboard.press('ArrowDown');
    await assertContentOfSelectedElementsNode('<div id=\u200B"inner" class=\u200B"red">\u200Bhi!\u200B</div>\u200B');

    await waitForFunction(async () => {
      const styleSections = await $$('.styles-section');
      const numFound = styleSections.length;

      return numFound === 3;
    });

    const styleSections = await $$('.styles-section');
    const selectorTexts = await Promise.all(styleSections.map(n => n.evaluate(node => node.textContent)));

    assert.deepEqual(selectorTexts, [
      'element.style {}',
      '<style>.red {}',
      'user agent stylesheetdiv {}',
    ]);
  });
});
