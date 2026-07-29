// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {
  getAccessibilityTreeNodeSelector,
  toggleAccessibilityTree,
  waitForSelectedTreeElementSelectorWhichIncludesText,
} from '../helpers/elements-helpers.js';

describe('Accessibility Tree in the Elements Tab', function() {
  setup({enabledDevToolsExperiments: ['protocol-monitor']});

  it('displays the fuller accessibility tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree(devToolsPage);
    await devToolsPage.waitForElementWithTextContent('heading\xa0"Title"');
    await devToolsPage.waitForElementWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });
});

describe('Accessibility Tree in the Elements Tab', function() {
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
    await devToolsPage.bringToFront();
    await devToolsPage.waitForNoElementsWithTextContent(
        `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`);
  });

  it('allows copying nodes via context menu', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree(devToolsPage);

    const linkText = `link\xa0"cats" focusable:\xa0true url:\xa0${inspectedPage.getResourcesPath()}/elements/x`;
    const linkSelector = getAccessibilityTreeNodeSelector(linkText);

    await devToolsPage.waitForElementWithTextContent(linkText);

    await openSoftContextMenuAndClickOnItem(devToolsPage, linkSelector, 'Copy');

    const expectedClipboardText = `link "cats" focusable: true url: ${
        inspectedPage.getResourcesPath()}/elements/x\n  StaticText "cats"\n    InlineTextBox "cats"\n`;

    await devToolsPage.waitForStrictEqual(expectedClipboardText, async () => {
      return (await devToolsPage.readClipboard()).replaceAll('\r\n', '\n');
    }, `Waiting for clipboard to exactly contain ${JSON.stringify(expectedClipboardText)}`);
  });

  it('allows copying nodes via keyboard shortcut', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityTree(devToolsPage);

    const headingText = 'heading\xa0"Title"';
    const headingSelector = getAccessibilityTreeNodeSelector(headingText);

    await devToolsPage.waitForElementWithTextContent(headingText);

    const expectedClipboardText = 'heading "Title"\n  StaticText "Title"\n    InlineTextBox "Title"\n';

    await devToolsPage.waitForStrictEqual(expectedClipboardText, async () => {
      // Sometimes doesn't register; retry until it works.
      await devToolsPage.click(headingSelector);
      await waitForSelectedTreeElementSelectorWhichIncludesText(devToolsPage, 'Title');
      await devToolsPage.pressKey('c', {control: true});
      return (await devToolsPage.readClipboard()).replaceAll('\r\n', '\n');
    }, 'Waiting for clipboard to exactly contain ' + JSON.stringify(expectedClipboardText));
  });

  it('allows switching between DOM tree and Accessibility tree via context menu',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/accessibility-simple-page.html');
       await toggleAccessibilityTree(devToolsPage);

       // 1. Right click on a non-body node in Accessibility tree (heading "Title")
       const headingText = 'heading\xa0"Title"';
       const headingSelector = getAccessibilityTreeNodeSelector(headingText);
       await devToolsPage.waitForElementWithTextContent(headingText);

       await devToolsPage.click(headingSelector, {clickOptions: {button: 'right'}});
       await waitForSelectedTreeElementSelectorWhichIncludesText(devToolsPage, 'Title');

       const contextMenu = await devToolsPage.waitFor('.soft-context-menu');
       await devToolsPage.click('[aria-label="Switch to DOM tree"]', {root: contextMenu});

       // 2. Verify DOM tree is displayed and the corresponding DOM node (<h1>) is selected
       await devToolsPage.waitForFunction(async () => {
         // The DOM tree might not use role="treeitem" for its selected element depending on which tree component it uses,
         // but it definitely has the .selected class. We look inside the elements panel.
         const selectedNode = await devToolsPage.waitFor('.elements-tree-outline .selected');
         const text = await selectedNode.evaluate(node => node.textContent);
         return text && text.includes('Title');
       });

       // 3. Right click on a non-body element in DOM tree (<a>)
       const linkNode = await devToolsPage.waitForFunction(async () => {
         const nodes = await devToolsPage.$$('.webkit-html-tag-name');
         for (const node of nodes) {
           const text = await node.evaluate(e => e.textContent);
           if (text === 'a') {
             return node;
           }
         }
         return undefined;
       });
       // Right click to open context menu and wait for the node to be selected
       await linkNode.click({button: 'right'});
       await devToolsPage.waitForFunction(async () => {
         const selectedNode = await devToolsPage.waitFor('.elements-tree-outline .selected');
         const text = await selectedNode.evaluate(node => node.textContent);
         return text && text.includes('cats');
       });

       const root = await devToolsPage.waitFor('.soft-context-menu');
       await devToolsPage.click('[aria-label="Switch to accessibility tree"]', {root});

       // 4. Verify Accessibility tree is displayed and the corresponding accessibility node (link "cats") is selected
       await devToolsPage.waitForFunction(async () => {
         const treeOutline = await devToolsPage.waitFor('devtools-tree-outline');
         if (!treeOutline) {
           return false;
         }
         const text = await treeOutline.evaluate(node => {
           const selected = node.shadowRoot?.querySelector('.selected[role="treeitem"]');
           if (!selected) {
             return null;
           }
           const axNode = selected.querySelector('devtools-accessibility-tree-node');
           return axNode && axNode.shadowRoot ? axNode.shadowRoot.textContent : null;
         });
         return text && text.includes('cats');
       });
     });
});
