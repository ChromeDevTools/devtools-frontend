// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {click, getBrowserAndPages, resourcesPath, waitForElementWithTextContent} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, assertSelectedElementsNodeTextIncludes, expandSelectedNodeRecursively, getBreadcrumbsTextContent, getSelectedBreadcrumbTextContent, waitForElementsStyleSection, waitForSelectedTreeElementSelectorWithTextcontent} from '../helpers/elements-helpers.js';

const EXPECTED_TEXT_CONTENT = `<div class=\u200B"div2">\u200B
          last child
        \u200B</div>\u200B`;

describe('Element breadcrumbs', async () => {
  beforeEach(async function() {
    const {target} = getBrowserAndPages();
    await target.goto(`${resourcesPath}/elements/element-breadcrumbs.html`);
    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // expand the tree and then navigate down to the target node
    await expandSelectedNodeRecursively();
    const targetChildNode = await waitForElementWithTextContent(EXPECTED_TEXT_CONTENT);
    await click(targetChildNode);

    // double check we got to the node we expect
    await waitForSelectedTreeElementSelectorWithTextcontent(EXPECTED_TEXT_CONTENT);
    await assertSelectedElementsNodeTextIncludes('last child');
  });

  it('lists all the elements in the tree', async () => {
    const actualCrumbsText = await getBreadcrumbsTextContent();
    const expectedCrumbsText = [
      'html',
      'body',
      'div#div1',
      'span#span1',
      'div.div2',
    ];
    assert.deepEqual(actualCrumbsText, expectedCrumbsText);
  });

  it('correctly highlights the active node', async () => {
    const selectedCrumbText = await getSelectedBreadcrumbTextContent();
    assert.strictEqual(selectedCrumbText, 'div.div2');
  });
});
