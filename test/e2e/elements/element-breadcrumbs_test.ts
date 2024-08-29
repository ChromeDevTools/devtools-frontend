// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {clickElement, goToResource, waitForElementWithTextContent} from '../../shared/helper.js';

import {
  assertSelectedElementsNodeTextIncludes,
  expandSelectedNodeRecursively,
  getBreadcrumbsTextContent,
  getSelectedBreadcrumbTextContent,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForSelectedTreeElementSelectorWithTextcontent,
} from '../helpers/elements-helpers.js';

const EXPECTED_TEXT_CONTENT = '<div class=\u200B"div2">\u200B last child \u200B</div>\u200B';

describe('Element breadcrumbs', () => {
  beforeEach(async function() {
    await goToResource('elements/element-breadcrumbs.html');
    await waitForElementsStyleSection();

    // Check to make sure we have the correct node selected after opening a file
    await waitForContentOfSelectedElementsNode('<body>\u200B');

    // expand the tree and then navigate down to the target node
    await expandSelectedNodeRecursively();
    const targetChildNode = await waitForElementWithTextContent(EXPECTED_TEXT_CONTENT);
    await clickElement(targetChildNode);

    // double check we got to the node we expect
    await waitForSelectedTreeElementSelectorWithTextcontent(EXPECTED_TEXT_CONTENT);
    await assertSelectedElementsNodeTextIncludes('last child');
  });

  it('lists all the elements in the tree', async () => {
    const expectedCrumbsText = [
      'html',
      'body',
      'div#div1',
      'span#span1',
      'div.div2',
    ];
    const actualCrumbsText = await getBreadcrumbsTextContent({expectedNodeCount: expectedCrumbsText.length});
    assert.deepEqual(actualCrumbsText, expectedCrumbsText);
  });

  it('correctly highlights the active node', async () => {
    // Wait for the crumbs to render with all the elements we expect.
    await getBreadcrumbsTextContent({expectedNodeCount: 5});
    const selectedCrumbText = await getSelectedBreadcrumbTextContent();
    assert.strictEqual(selectedCrumbText, 'div.div2');
  });
});
