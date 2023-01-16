// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertNotNullOrUndefined,
  click,
  enableExperiment,
  getBrowserAndPages,
  goToResource,
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
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await link.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    await waitForElementWithTextContent('link\xa0"dogs" focusable:\xa0true');
  });

  it('listens for changes to properties and redraws tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    await link.evaluate(node => node.setAttribute('aria-label', 'birds'));
    await waitForElementWithTextContent('link\xa0"birds" focusable:\xa0true');
  });

  it('listen for removed nodes and redraw tree', async () => {
    await enableExperiment('fullAccessibilityTree');
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree();
    const {target} = getBrowserAndPages();
    const link = await target.waitForSelector('aria/cats [role="link"]');
    assertNotNullOrUndefined(link);
    await waitForElementWithTextContent('link\xa0"cats" focusable:\xa0true');
    await link.evaluate(node => node.remove());
    await waitForNoElementsWithTextContent('link\xa0"cats" focusable:\xa0true');
  });
});
