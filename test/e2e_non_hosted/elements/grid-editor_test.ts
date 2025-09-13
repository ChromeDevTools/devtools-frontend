// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickNthChildOfSelectedElementNode,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../../e2e/helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../../e2e/helpers/style-property-editor-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Grid Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/grid-editor.html');
    await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(1, devToolsPage);
    await waitForCSSPropertyValue('#target', 'display', 'grid', undefined, devToolsPage);
  }

  it('can be opened and grid styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);

    await clickStylePropertyEditorButton('Open grid editor', 'devtools-grid-editor', devToolsPage);

    // Clicking once sets the value.
    await clickPropertyButton('[title="Add align-items: start"]', devToolsPage);
    await waitForCSSPropertyValue('#target', 'align-items', 'start', undefined, devToolsPage);

    // Clicking again removes the value.
    await clickPropertyButton('[title="Remove align-items: start"]', devToolsPage);
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await devToolsPage.waitFor('[title="Add align-items: start"]');
    const property = await getCSSPropertyInRule('#target', 'align-items', undefined, devToolsPage);
    assert.isUndefined(property);
  });
});
