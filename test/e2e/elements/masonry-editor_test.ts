// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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

describe('Masonry Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToHtml(`
      <style>
        #target {
          display: masonry;
        }
      </style>
      <div id="target"></div>
    `);
    await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(1, devToolsPage);
    await waitForCSSPropertyValue('#target', 'display', 'masonry', undefined, devToolsPage);
  }

  // `display: masonry` changed to `display: grid-lanes`. Skipping this test to let `CfT` roll
  // and in a subsequent CL, I'm going to update the implementation to look for `grid-lanes`.
  it.skip(
      '[crbug.com/462642478] can be opened and masonry styles can be edited', async ({devToolsPage, inspectedPage}) => {
        await setupStyles(devToolsPage, inspectedPage);
        await clickStylePropertyEditorButton('Open masonry editor', 'devtools-masonry-editor', devToolsPage);

        await clickPropertyButton('[title="Add justify-items: start"]', devToolsPage);
        await waitForCSSPropertyValue('#target', 'justify-items', 'start', undefined, devToolsPage);
        await clickPropertyButton('[title="Remove justify-items: start"]', devToolsPage);
        await devToolsPage.waitFor('[title="Add justify-items: start"]');
        const property = await getCSSPropertyInRule('#target', 'justify-items', undefined, devToolsPage);
        assert.isUndefined(property);
      });
});
