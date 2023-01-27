// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource, waitFor, waitForElementWithTextContent, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {findSubMenuEntryItem} from '../helpers/context-menu-helpers.js';
import {
  expandSelectedNodeRecursively,
  navigateToElementsTab,
} from '../helpers/elements-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

describe('The Elements tab', async function() {
  it('does not break when switching panels while editing as HTML', async () => {
    await goToResource('elements/switch-panels-while-editing-as-html.html');
    await expandSelectedNodeRecursively();
    const elementsContentPanel = await waitFor('#elements-content');
    const selectedNode = await waitForElementWithTextContent('Inspected Node', elementsContentPanel);
    await selectedNode.click({button: 'right'});
    const editAsHTMLOption = await findSubMenuEntryItem('Edit as HTML', false);
    await editAsHTMLOption.click();
    await waitFor('.elements-disclosure devtools-text-editor');
    await openSourcesPanel();
    await navigateToElementsTab();
    await waitForNone('.elements-disclosure devtools-text-editor');
  });
});
