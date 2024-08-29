// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertNotNullOrUndefined,
  click,
  enableExperiment,
  getBrowserAndPages,
  getResourcesPath,
  goToResource,
  raf,
  waitForElementWithTextContent,
  waitForNoElementsWithTextContent,
} from '../../shared/helper.js';

import {toggleAccessibilityTree} from '../helpers/elements-helpers.js';

describe('Accessibility Tree in the Elements Tab', function() {
  it('displays the fuller accessibility tree', async () => {
    await enableExperiment('full-accessibility-tree');
    await enableExperiment('protocol-monitor');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    await waitForElementWithTextContent('heading\xa0"Title"');
    await waitForElementWithTextContent(`link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
  });

  it('allows navigating iframes', async () => {
    await enableExperiment('full-accessibility-tree');
    await goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityTree();
    const iframeDoc = await waitForElementWithTextContent(
        `RootWebArea\xa0"Simple page with aria labeled element" focusable:\xa0true url:\xa0${
            getResourcesPath()}/elements/accessibility-simple-page.html`);
    const arrowIconContainer =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await iframeDoc.evaluateHandle(node => (node as any).parentElementOrShadowHost().parentElement.parentElement);
    assertNotNullOrUndefined(arrowIconContainer);
    await click('.arrow-icon', {root: arrowIconContainer});
    await waitForElementWithTextContent(`link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
  });

  it('listens for text changes to DOM and redraws the tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('full-accessibility-tree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await waitForElementWithTextContent(`link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats[role="link"]');
    await link!.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForElementWithTextContent(`link\xa0"dogs" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
  });

  it('listens for changes to properties and redraws tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('full-accessibility-tree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats[role="link"]');
    assertNotNullOrUndefined(link);
    await frontend.bringToFront();
    await waitForElementWithTextContent(`link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
    await target.bringToFront();
    await link.evaluate(node => node.setAttribute('aria-label', 'birds'));
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForElementWithTextContent(`link\xa0"birds" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
  });

  it('listen for removed nodes and redraw tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('full-accessibility-tree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats[role="link"]');
    await frontend.bringToFront();
    await waitForElementWithTextContent(`link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
    await target.bringToFront();
    await link!.evaluate(node => node.remove());
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForNoElementsWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${getResourcesPath()}/elements/x`);
  });
});
