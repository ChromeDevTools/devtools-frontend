// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickNthChildOfSelectedElementNode,
  editCSSProperty,
  focusElementsTree,
  getCSSPropertyInRule,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';
import {clickPropertyButton, clickStylePropertyEditorButton} from '../helpers/style-property-editor-helpers.js';

describe('Flexbox Editor', async function() {
  beforeEach(async function() {
    await goToResource('elements/flexbox-editor.html');
    await waitForContentOfSelectedElementsNode('<body>\u200B');
    await focusElementsTree();
    await clickNthChildOfSelectedElementNode(1);
    await waitForCSSPropertyValue('#target', 'display', 'flex');
  });

  it(
      'can be opened and flexbox styles can be edited', async () => {
        await clickStylePropertyEditorButton('Open flexbox editor', 'devtools-flexbox-editor');

        // Clicking once sets the value.
        await clickPropertyButton('[title="Add flex-direction: column"]');
        await waitForCSSPropertyValue('#target', 'flex-direction', 'column');

        // Clicking again removes the value.
        await clickPropertyButton('[title="Remove flex-direction: column"]');
        // Wait for the button's title to be updated so that we know the change
        // was made.
        await waitFor('[title="Add flex-direction: column"]');
        const property = await getCSSPropertyInRule('#target', 'flex-direction');
        assert.isUndefined(property);
      });

  it('can be opened for flexbox styles with !important', async () => {
    await editCSSProperty('#target', 'display', 'flex !important');
    await waitForCSSPropertyValue('#target', 'display', 'flex !important');
    await clickStylePropertyEditorButton('Open flexbox editor', 'devtools-flexbox-editor');
  });
});
