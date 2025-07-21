// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {toggleAccessibilityTree} from '../../e2e/helpers/elements-helpers.js';
import {
  raf,
} from '../../shared/helper.js';

describe('Accessibility Tree in the Elements Tab', function() {
  setup({enabledDevToolsExperiments: ['full-accessibility-tree', 'protocol-monitor']});

  it('displays the fuller accessibility tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree(devToolsPage);
    await devToolsPage.waitForElementWithTextContent('heading\xa0"Title"');
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });
});

describe('Accessibility Tree in the Elements Tab', function() {
  setup({enabledDevToolsExperiments: ['full-accessibility-tree']});

  it('allows navigating iframes', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-iframe-page.html');
    await toggleAccessibilityTree(devToolsPage);
    const iframeDoc = await devToolsPage.waitForElementWithTextContent(
        `RootWebArea\xa0"Simple page with aria labeled element" focusable:\xa0true url:\xa0${
            inspectedPage.getResourcesPath()}/elements/accessibility-simple-page.html`);
    const arrowIconContainer =
        (await iframeDoc.evaluateHandle(
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            node => (node as any).parentElementOrShadowHost().parentElement.parentElement)) as puppeteer.ElementHandle;
    assert.isOk(arrowIconContainer);
    await devToolsPage.click('.arrow-icon', {root: arrowIconContainer});
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });

  it('listens for text changes to DOM and redraws the tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.bringToFront();
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await devToolsPage.bringToFront();
    await toggleAccessibilityTree(devToolsPage);
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
    await inspectedPage.bringToFront();
    const link = await inspectedPage.waitForSelector('aria/cats[role="link"]');
    await link!.evaluate(node => {
      (node as HTMLElement).innerText = 'dogs';
    });
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(inspectedPage.page);
    }
    await devToolsPage.bringToFront();
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"dogs" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });

  it('listens for changes to properties and redraws tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.bringToFront();
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await devToolsPage.bringToFront();
    await toggleAccessibilityTree(devToolsPage);
    await inspectedPage.bringToFront();
    const link = await inspectedPage.waitForSelector('aria/cats[role="link"]');
    assert.isOk(link);
    await devToolsPage.bringToFront();
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
    await inspectedPage.bringToFront();
    await link.evaluate(node => node.setAttribute('aria-label', 'birds'));
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(inspectedPage.page);
    }
    await devToolsPage.bringToFront();
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"birds" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });

  it('listen for removed nodes and redraw tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.bringToFront();
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await devToolsPage.bringToFront();
    await toggleAccessibilityTree(devToolsPage);
    await inspectedPage.bringToFront();
    const link = await inspectedPage.waitForSelector('aria/cats[role="link"]');
    await devToolsPage.bringToFront();
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
    await inspectedPage.bringToFront();
    await link!.evaluate(node => node.remove());
    // For some reason a11y tree takes a while to propagate.
    for (let i = 0; i < 30; i++) {
      await raf(inspectedPage.page);
    }
    await devToolsPage.bringToFront();
    await devToolsPage.waitForNoElementsWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });
});
