// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  clickNthChildOfSelectedElementNode,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../helpers/style-property-editor-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Grid Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/grid-editor.html');
    await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'grid', undefined);
  }

  it('can be opened and grid styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);

    await clickStylePropertyEditorButton(devToolsPage, 'Open grid editor', 'devtools-grid-editor');

    // Clicking once sets the value.
    await clickPropertyButton(devToolsPage, '[title="Add align-items: start"]');
    await waitForCSSPropertyValue(devToolsPage, '#target', 'align-items', 'start', undefined);

    // Clicking again removes the value.
    await clickPropertyButton(devToolsPage, '[title="Remove align-items: start"]');
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await devToolsPage.waitFor('[title="Add align-items: start"]');
    await devToolsPage.waitForFunction(async () => {
      const property = await getCSSPropertyInRule(devToolsPage, '#target', 'align-items', undefined);
      return property === undefined;
    });
  });
});
