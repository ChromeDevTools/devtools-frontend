// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {performance} from 'perf_hooks';
import * as puppeteer from 'puppeteer';

import {$, $$, click, getBrowserAndPages, timeout, waitFor, waitForFunction} from '../../shared/helper.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';
const CSS_PROPERTY_NAME_SELECTOR = '.webkit-css-property';

export const assertContentOfSelectedElementsNode = async (expectedTextContent: string) => {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.equal(selectedTextContent, expectedTextContent);
};

/**
 * Gets the text content of the currently selected element.
 */
export const getContentOfSelectedNode = async () => {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  return await selectedNode.evaluate(node => node.textContent);
};

export const waitForSelectedNodeChange = async (initialValue: string, maxTotalTimeout = 1000) => {
  if (maxTotalTimeout === 0) {
    maxTotalTimeout = Number.POSITIVE_INFINITY;
  }

  const start = performance.now();
  do {
    const currentContent = await getContentOfSelectedNode();
    if (currentContent !== initialValue) {
      return currentContent;
    }

    await timeout(30);

  } while (performance.now() - start < maxTotalTimeout);

  throw new Error(`Selected element did not change in ${maxTotalTimeout}`);
};

export const assertSelectedElementsNodeTextIncludes = async (expectedTextContent: string) => {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.include(selectedTextContent, expectedTextContent);
};

export const waitForSelectedTreeElementSelectorWithTextcontent = async (expectedTextContent: string) => {
  await waitForFunction(async () => {
    const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent === expectedTextContent;
  }, 'Did not find a select elements tree element with textcontent');
};

export const waitForChildrenOfSelectedElementNode = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const waitForElementsStyleSection = async () => {
  // Wait for the file to be loaded and selectors to be shown
  await waitFor('.styles-selector');
};

export const expandSelectedNodeRecursively = async () => {
  const EXPAND_RECURSIVELY = '[aria-label="Expand recursively"]';

  // Find the selected node, right click.
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  await click(selectedNode, {clickOptions: {button: 'right'}});

  // Wait for the 'expand recursively' option, and click it.
  await waitFor(EXPAND_RECURSIVELY);
  await click(EXPAND_RECURSIVELY);
};

export const forcePseudoState = async (pseudoState: string) => {
  // Open element state pane and wait for it to be loaded asynchronously
  await click('[aria-label="Toggle Element State"]');
  await waitFor(`[aria-label="${pseudoState}"]`);

  await click(`[aria-label="${pseudoState}"]`);
};

export const removePseudoState = async (pseudoState: string) => {
  await click(`[aria-label="${pseudoState}"]`);
};

export const getComputedStylesForDomNode = async (elementSelector: string, styleAttribute: string) => {
  const {target} = getBrowserAndPages();

  return target.evaluate((elementSelector, styleAttribute) => {
    const element = document.querySelector(elementSelector);
    if (!element) {
      throw new Error(`${elementSelector} could not be found`);
    }
    return getComputedStyle(element)[styleAttribute];
  }, elementSelector, styleAttribute);
};

export const waitForDomNodeToBeVisible = async (elementSelector: string) => {
  const {target} = getBrowserAndPages();

  // DevTools will force Blink to make the hover shown, so we have
  // to wait for the element to be DOM-visible (e.g. no `display: none;`)
  await target.waitForSelector(elementSelector, {visible: true});
};

export const waitForDomNodeToBeHidden = async (elementSelector: string) => {
  const {target} = getBrowserAndPages();
  await target.waitForSelector(elementSelector, {hidden: true});
};

export const assertGutterDecorationForDomNodeExists = async () => {
  await waitFor('.elements-gutter-decoration');
};

export const getAriaLabelSelectorFromPropertiesSelector = (selectorForProperties: string) =>
    `[aria-label="${selectorForProperties}, css selector"]`;

export const getDisplayedCSSPropertyNames = async (propertiesSection: puppeteer.JSHandle<any>) => {
  const listNodesContent = (nodes: Element[]) => {
    const rawContent = nodes.map(node => node.textContent);
    const filteredContent = rawContent.filter(content => !!content);
    return filteredContent;
  };
  const cssPropertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = await cssPropertyNames.evaluate(listNodesContent);
  return propertyNamesText;
};

export const getBreadcrumbsTextContent = async () => {
  const crumbs = await $$('span.crumb');

  const crumbsAsText: string[] = await crumbs.evaluate((nodes: HTMLElement[]) => {
    return nodes.map((node: HTMLElement) => node.textContent || '');
  });

  return crumbsAsText;
};

export const getSelectedBreadcrumbTextContent = async () => {
  const selectedCrumb = await $('span.crumb.selected');
  const text = selectedCrumb.evaluate((node: HTMLElement) => node.textContent || '');
  return text;
};
