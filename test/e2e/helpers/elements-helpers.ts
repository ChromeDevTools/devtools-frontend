// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {$, $$, click, getBrowserAndPages, waitFor} from '../../shared/helper.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';
const CSS_PROPERTY_NAME_SELECTOR = '.webkit-css-property';

export const assertContentOfSelectedElementsNode = async (expectedTextContent: string) => {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.equal(selectedTextContent, expectedTextContent);
};

export const waitForChildrenOfSelectedElementNode = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const waitForElementsStyleSection = async () => {
  // Wait for the file to be loaded and selectors to be shown
  await waitFor('.styles-selector');
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

const EVENT_LISTENERS_PANEL_LINK = '[aria-label="Event Listeners"]';
const EVENT_LISTENERS_SELECTOR = '[aria-label$="event listener"]';

export const openEventListenersPaneAndWaitForListeners = async () => {
  await click(EVENT_LISTENERS_PANEL_LINK);
  await waitFor(EVENT_LISTENERS_SELECTOR);
};

export const getDisplayedEventListenerNames = async(): Promise<string[]> => {
  const eventListeners = await $$(EVENT_LISTENERS_SELECTOR);
  const eventListenerNames = await eventListeners.evaluate(nodes => {
    return nodes.map((listener: HTMLElement) => listener.textContent);
  });
  return eventListenerNames;
};

export const getAriaLabelSelectorFromPropertiesSelector = (selectorForProperties: string) =>
    `[aria-label="${selectorForProperties}, css selector"]`;

export const getDisplayedCSSPropertyNames = async (selectorForProperties: string) => {
  const listNodesContent = (nodes: Element[]) => {
    const rawContent = nodes.map(node => node.textContent);
    const filteredContent = rawContent.filter(content => !!content);
    return filteredContent;
  };
  const propertiesSection = await $(getAriaLabelSelectorFromPropertiesSelector(selectorForProperties));
  const cssPropertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = await cssPropertyNames.evaluate(listNodesContent);
  return propertyNamesText;
};
