// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickNthChildOfSelectedElementNode,
  editCSSProperty,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../../e2e/helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../../e2e/helpers/style-property-editor-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Flexbox Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/flexbox-editor.html');
    await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(1, devToolsPage);
    await waitForCSSPropertyValue('#target', 'display', 'flex', undefined, devToolsPage);
  }

  it('can be opened and flexbox styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);

    await clickStylePropertyEditorButton('Open flexbox editor', 'devtools-flexbox-editor', devToolsPage);

    // Clicking once sets the value.
    await clickPropertyButton('[title="Add flex-direction: column"]', devToolsPage);
    await waitForCSSPropertyValue('#target', 'flex-direction', 'column', undefined, devToolsPage);

    // Clicking again removes the value.
    await clickPropertyButton('[title="Remove flex-direction: column"]', devToolsPage);
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await devToolsPage.waitFor('[title="Add flex-direction: column"]');
    const property = await getCSSPropertyInRule('#target', 'flex-direction', undefined, devToolsPage);
    assert.isUndefined(property);
  });

  it('can be opened for flexbox styles with !important', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);
    await editCSSProperty('#target', 'display', 'flex !important', devToolsPage);
    await devToolsPage.drainTaskQueue();
    await waitForCSSPropertyValue('#target', 'display', 'flex !important', undefined, devToolsPage);
    await clickStylePropertyEditorButton('Open flexbox editor', 'devtools-flexbox-editor', devToolsPage);
  });
});
