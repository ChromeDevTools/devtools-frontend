// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, enableExperiment, goToResource, waitForAria} from '../../shared/helper.js';
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
    const root = await waitForAria('RootWebArea\xa0"Simple page with aria labeled element" [role="treeitem"]');
    await click('.arrow-icon', {root: root});
    await waitForAria('heading\xa0"Title" [role="treeitem"]');
    await waitForAria('link\xa0"cats" [role="treeitem"]');
  });

  it('allows navigating iframes', async () => {
    await goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityTree();
    const root = await waitForAria('RootWebArea\xa0"Page with nested iframe" [role="treeitem"]');
    await click('.arrow-icon', {root: root});
    const iframe = await waitForAria('Iframe\xa0"" [role="treeitem"]');
    await click('.arrow-icon', {root: iframe});
    const iframeDoc = await waitForAria('RootWebArea\xa0"Simple page with aria labeled element" [role="treeitem"]');
    await click('.arrow-icon', {root: iframeDoc});

    await waitForAria('link\xa0"cats" [role="treeitem"]');
  });
});
