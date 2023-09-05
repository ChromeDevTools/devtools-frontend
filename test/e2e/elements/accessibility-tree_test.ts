// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertNotNullOrUndefined,
  click,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
  raf,
  waitForElementWithTextContent,
  waitForNoElementsWithTextContent,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {toggleAccessibilityTree} from '../helpers/elements-helpers.js';

describe('Accessibility Tree in the Elements Tab', async function() {
  it('displays the fuller accessibility tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await enableExperiment('protocolMonitor');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    await waitForElementWithTextContent('heading\xa0"Title"');
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
  });

  it('allows navigating iframes', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityTree();
    const iframeDoc = await waitForElementWithTextContent(
        'RootWebArea\xa0"Simple page with aria labeled element" focusable:\xa0true');
    const arrowIconContainer =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await iframeDoc.evaluateHandle(node => (node as any).parentElementOrShadowHost().parentElement.parentElement);
    assertNotNullOrUndefined(arrowIconContainer);
    await click('.arrow-icon', {root: arrowIconContainer});
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
  });

  it('listens for text changes to DOM and redraws the tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('fullAccessibilityTree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await link.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForElementWithTextContent('link\xa0"dogs" focusable:\xa0true');
  });

  it('listens for changes to properties and redraws tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('fullAccessibilityTree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await frontend.bringToFront();
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    await target.bringToFront();
    await link.evaluate(node => node.setAttribute('aria-label', 'birds'));
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForElementWithTextContent('link\xa0"birds" focusable:\xa0true');
  });

  it('listen for removed nodes and redraw tree', async () => {
    const {target, frontend} = getBrowserAndPages();
    await enableExperiment('fullAccessibilityTree');
    await target.bringToFront();
    await goToResource('elements/accessibility-simple-page.html');
    await frontend.bringToFront();
    await toggleAccessibilityTree();
    await target.bringToFront();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await frontend.bringToFront();
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    await target.bringToFront();
    await link.evaluate(node => node.remove());
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(target);
    }
    await frontend.bringToFront();
    await waitForNoElementsWithTextContent('link\xa0"cats" focusable:\xa0true');
  });
});
