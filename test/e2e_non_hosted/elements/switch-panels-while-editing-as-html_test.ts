// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {findSubMenuEntryItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  expandSelectedNodeRecursively,
  navigateToElementsTab,
} from '../../e2e/helpers/elements-helpers.js';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

describe('The Elements tab', function() {
  // Flaking repeatedly on CI
  it.skip(
      '[crbug.com/431949936]: does not break when switching panels while editing as HTML',
      async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.goToResource('elements/switch-panels-while-editing-as-html.html');
        await expandSelectedNodeRecursively(devToolsPage);
        const elementsContentPanel = await devToolsPage.waitFor('#elements-content');
        const selectedNode = await devToolsPage.waitForElementWithTextContent('Inspected Node', elementsContentPanel);
        await selectedNode.click({button: 'right'});
        const editAsHTMLOption = await findSubMenuEntryItem('Edit as HTML', devToolsPage);
        await editAsHTMLOption.click();
        await devToolsPage.waitFor('.elements-disclosure devtools-text-editor');
        await openSourcesPanel(devToolsPage);
        await navigateToElementsTab(devToolsPage);
        await devToolsPage.waitForNone('.elements-disclosure devtools-text-editor');
      });
});
