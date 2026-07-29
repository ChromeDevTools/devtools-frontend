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

describe('Grid Lanes Editor', function() {
  async function setupStyles(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToHtml(`
      <style>
        #target {
          display: grid-lanes;
        }
      </style>
      <div id="target"></div>
    `);
    await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');
    await focusElementsTree(devToolsPage);
    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForCSSPropertyValue(devToolsPage, '#target', 'display', 'grid-lanes', undefined);
  }

  it('can be opened and grid-lanes styles can be edited', async ({devToolsPage, inspectedPage}) => {
    await setupStyles(devToolsPage, inspectedPage);
    await clickStylePropertyEditorButton(devToolsPage, 'Open grid-lanes editor', 'devtools-grid-lanes-editor');
    await clickPropertyButton(devToolsPage, '[title="Add justify-items: start"]');
    await waitForCSSPropertyValue(devToolsPage, '#target', 'justify-items', 'start', undefined);
    await clickPropertyButton(devToolsPage, '[title="Remove justify-items: start"]');
    await devToolsPage.waitFor('[title="Add justify-items: start"]');
    const property = await getCSSPropertyInRule(devToolsPage, '#target', 'justify-items', undefined);
    assert.isUndefined(property);
  });
});
