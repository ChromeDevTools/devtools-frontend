// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource, waitFor} from '../../shared/helper.js';

import {
  clickNthChildOfSelectedElementNode,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../helpers/style-property-editor-helpers.js';

describe('Grid Editor', function() {
  beforeEach(async function() {
    await goToResource('elements/grid-editor.html');
    await waitForContentOfSelectedElementsNode('<body>\u200B');
    await focusElementsTree();
    await clickNthChildOfSelectedElementNode(1);
    await waitForCSSPropertyValue('#target', 'display', 'grid');
  });

  it('can be opened and grid styles can be edited', async () => {
    await clickStylePropertyEditorButton('Open grid editor', 'devtools-grid-editor');

    // Clicking once sets the value.
    await clickPropertyButton('[title="Add align-items: start"]');
    await waitForCSSPropertyValue('#target', 'align-items', 'start');

    // Clicking again removes the value.
    await clickPropertyButton('[title="Remove align-items: start"]');
    // Wait for the button's title to be updated so that we know the change
    // was made.
    await waitFor('[title="Add align-items: start"]');
    const property = await getCSSPropertyInRule('#target', 'align-items');
    assert.isUndefined(property);
  });
});
