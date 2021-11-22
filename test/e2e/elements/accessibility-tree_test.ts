// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, click, enableExperiment, getBrowserAndPages, goToResource, waitForAria, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {toggleAccessibilityTree} from '../helpers/elements-helpers.js';

describe('Accessibility Tree in the Elements Tab', async function() {
  it('displays the fuller accessibility tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    await waitForAria('heading\xa0"Title" [role="treeitem"]');
    await waitForAria('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]');
  });

  it('allows navigating iframes', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityTree();
    waitForAria('RootWebArea\xa0"Page with nested iframe" [role="treeitem"]');
    const iframeDoc = await waitForAria(
        'RootWebArea\xa0"Simple page with aria labeled element"\xa0focusable:\xa0true [role="treeitem"]');
    assertNotNullOrUndefined(iframeDoc);
    await click('.arrow-icon', {root: iframeDoc});
    await waitForAria('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]');
  });

  it('listens for text changes to DOM and redraws the tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    await waitForAria('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]');
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await link.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    await waitForAria('link\xa0"dogs"\xa0focusable:\xa0true[role="treeitem"]');
  });

  it('listen for changes to properties and redraws tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await waitForAria('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]');
    await link.evaluate(node => node.setAttribute('aria-label', 'birds'));
    await waitForAria('link\xa0"birds"\xa0focusable:\xa0true[role="treeitem"]');
  });

  it('listen for removed nodes and redraw tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await waitForAria('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]');
    await link.evaluate(node => node.remove());
    await waitForNone('link\xa0"cats"\xa0focusable:\xa0true[role="treeitem"]', undefined, undefined, 'aria');
  });
});
