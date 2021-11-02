// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, enableExperiment, getBrowserAndPages, goToResource, waitForAria} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {toggleAccessibilityPane, toggleAccessibilityTree} from '../helpers/elements-helpers.js';

describe('Accessibility Tree in the Elements Tab', async function() {
  beforeEach(async () => {
    await enableExperiment('fullAccessibilityTree');
  });

  it('displays the fuller accessibility tree', async () => {
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane();
    await toggleAccessibilityTree();
    await waitForAria('heading\xa0"Title" [role="treeitem"]');
    await waitForAria('link\xa0"cats" [role="treeitem"]');
  });

  // Test disabled to unblock chromium roll.
  it.skip('[crbug.com/1265818] allows navigating iframes', async () => {
    await goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityPane();
    await toggleAccessibilityTree();
    const iframeDoc = await waitForAria('RootWebArea\xa0"Simple page with aria labeled element" [role="treeitem"]');
    await click('.arrow-icon', {root: iframeDoc});
    await waitForAria('link\xa0"cats" [role="treeitem"]');
  });

  // Test disabled to unblock chromium roll.
  it.skip('[crbug.com/1265818] listens for text changes to DOM and redraws the tree', async () => {
    const {target} = getBrowserAndPages();
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane();
    await toggleAccessibilityTree();
    await waitForAria('heading\xa0"Title" [role="treeitem"]');
    await waitForAria('link\xa0"cats" [role="treeitem"]');
    const link = await target.$('aria/cats [role="link"]');
    link?.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    await waitForAria('link\xa0"dogs" [role="treeitem"]');
    link?.evaluate(node => node.setAttribute('aria-label', 'birds'));
    await waitForAria('link\xa0"birds" [role="treeitem"]');
  });
});
