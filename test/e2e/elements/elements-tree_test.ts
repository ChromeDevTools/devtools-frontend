// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource, waitForAria, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandSelectedNodeRecursively,
  getContentOfSelectedNode,
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements tab', async function() {
  it('is able to update shadow dom tree structure upon typing', async () => {
    await goToResource('elements/shadow-dom-modify-chardata.html');
    const {target} = getBrowserAndPages();
    await togglePreferenceInSettingsTab('Show user agent shadow DOM');
    await expandSelectedNodeRecursively();
    const tree = await waitForAria('Page DOM');
    assert.include(await tree.evaluate(e => e.textContent), '<div>​</div>​');
    const input = await target.$('#input1');
    await input?.type('Bar');
    await waitForElementWithTextContent('Bar', tree);
    assert.include(await tree.evaluate(e => e.textContent), '<div>​Bar​</div>​');
  });

  it('shows the documentURL for <iframe> documents', async () => {
    await goToResource('elements/iframe-documenturl.html');
    const {frontend} = getBrowserAndPages();

    // Check to make sure we have the correct node selected after opening a file
    await waitForContentOfSelectedElementsNode('<body>\u200B');

    // Navigate to the <iframe> child node.
    await frontend.keyboard.press('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<iframe src=\u200B"shadow-dom-modify-chardata.html">\u200B…\u200B</iframe>\u200B');

    // Open the iframe (shows new nodes, but does not alter the selected node)
    await frontend.keyboard.press('ArrowRight');
    await waitForChildrenOfSelectedElementNode();
    await waitForContentOfSelectedElementsNode('<iframe src=\u200B"shadow-dom-modify-chardata.html">\u200B');

    // Check that the #document tree node properly reflects the document URL.
    await frontend.keyboard.press('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('#document');
    assert.match(
        await getContentOfSelectedNode(),
        /#document \(https?:\/\/.*\/test\/e2e\/resources\/elements\/shadow-dom-modify-chardata.html\)/);
  });
});
