// Copyright 2021 The Chromium Authors
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
} from '../helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../helpers/style-property-editor-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Flexbox Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/flexbox-editor.html');
    await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'flex', undefined);
  }

  it('can be opened and flexbox styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);

    await clickStylePropertyEditorButton(devToolsPage, 'Open flexbox editor', 'devtools-flexbox-editor');

    // Clicking once sets the value.
    await clickPropertyButton(devToolsPage, '[title="Add flex-direction: column"]');
    await waitForCSSPropertyValue(devToolsPage, '#target', 'flex-direction', 'column', undefined);

    // Clicking again removes the value.
    await clickPropertyButton(devToolsPage, '[title="Remove flex-direction: column"]');
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await devToolsPage.waitFor('[title="Add flex-direction: column"]');
    const property = await getCSSPropertyInRule(devToolsPage, '#target', 'flex-direction', undefined);
    assert.isUndefined(property);
  });

  it('can be opened for flexbox styles with !important', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);
    await editCSSProperty(devToolsPage, '#target', 'display', 'flex !important');
    await devToolsPage.drainTaskQueue();
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'flex !important', undefined);
    await clickStylePropertyEditorButton(devToolsPage, 'Open flexbox editor', 'devtools-flexbox-editor');
  });
});
