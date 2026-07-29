// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertSelectedElementsNodeTextIncludes,
  expandSelectedNodeRecursively,
  getBreadcrumbsTextContent,
  getSelectedBreadcrumbTextContent,
  waitForElementsStyleSection,
  waitForSelectedTreeElementSelectorWithTextcontent,
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const EXPECTED_TEXT_CONTENT = '<div class=\u200B"div2">\u200B last child \u200B</div>\u200B';

describe('Element breadcrumbs', () => {
  async function expandToTargetNode(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/element-breadcrumbs.html');
    await waitForElementsStyleSection(devToolsPage, null);

    // expand the tree and then navigate down to the target node
    await expandSelectedNodeRecursively(devToolsPage);
    const targetChildNode = await devToolsPage.waitForElementWithTextContent(EXPECTED_TEXT_CONTENT);
    await devToolsPage.clickElement(targetChildNode);

    // double check we got to the node we expect
    await waitForSelectedTreeElementSelectorWithTextcontent(devToolsPage, EXPECTED_TEXT_CONTENT);
    await assertSelectedElementsNodeTextIncludes(devToolsPage, 'last child');
  }

  it('lists all the elements in the tree', async ({devToolsPage, inspectedPage}) => {
    await expandToTargetNode(devToolsPage, inspectedPage);
    const expectedCrumbsText = [
      'html',
      'body',
      'div#div1',
      'span#span1',
      'div.div2',
    ];
    const actualCrumbsText =
        await getBreadcrumbsTextContent(devToolsPage, {expectedNodeCount: expectedCrumbsText.length});
    assert.deepEqual(actualCrumbsText, expectedCrumbsText);
  });

  it('correctly highlights the active node', async ({devToolsPage, inspectedPage}) => {
    await expandToTargetNode(devToolsPage, inspectedPage);
    // Wait for the crumbs to render with all the elements we expect.
    await getBreadcrumbsTextContent(devToolsPage, {expectedNodeCount: 5});
    const selectedCrumbText = await getSelectedBreadcrumbTextContent(devToolsPage);
    assert.strictEqual(selectedCrumbText, 'div.div2');
  });
});
