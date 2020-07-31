// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import {performance} from 'perf_hooks';
import * as puppeteer from 'puppeteer';

import {$, $$, click, getBrowserAndPages, timeout, waitFor, waitForFunction} from '../../shared/helper.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';
const CSS_PROPERTY_NAME_SELECTOR = '.webkit-css-property';
const CSS_PROPERTY_SWATCH_SELECTOR = '.color-swatch-inner';
const CSS_STYLE_RULE_SELECTOR = '[aria-label*="css selector"]';
export const COMPUTED_PROPERTY_SELECTOR = '.computed-style-property';
const COMPUTED_STYLES_PANEL_SELECTOR = '[aria-label="Computed panel"]';
const COMPUTED_STYLES_SHOW_ALL_SELECTOR = '[aria-label="Show all"]';
const COMPUTED_STYLE_TRACES_SELECTOR = '.expanded .property-trace';
const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
const SECTION_SUBTITLE_SELECTOR = '.styles-section-subtitle';

export const assertContentOfSelectedElementsNode = async (expectedTextContent: string) => {
  const selectedNode = await $(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.strictEqual(selectedTextContent, expectedTextContent);
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
  });
};

export const waitForChildrenOfSelectedElementNode = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const focusElementsTree = async () => {
  await click(SELECTED_TREE_ELEMENT_SELECTOR);
};

export const navigateToSidePane = async (paneName: string) => {
  await click(`[aria-label="${paneName}"]`);
  await waitFor(`[aria-label="${paneName} panel"]`);
};

export const waitForElementsStyleSection = async () => {
  // Wait for the file to be loaded and selectors to be shown
  await waitFor('.styles-selector');
};

export const waitForElementsComputedSection = async () => {
  await waitFor(COMPUTED_PROPERTY_SELECTOR);
};

export const getContentOfComputedPane = async () => {
  const pane = await $('.computed-properties');
  const tree = await $('.tree-outline', pane);
  return await tree.evaluate(node => node.textContent);
};

export const waitForComputedPaneChange = async (initialValue: string) => {
  await waitForFunction(async () => {
    const value = await getContentOfComputedPane();
    return value !== initialValue;
  });
};

export const getAllPropertiesFromComputedPane = async () => {
  const properties = await $$(COMPUTED_PROPERTY_SELECTOR);
  return properties.evaluate((nodes: Element[]) => {
    return nodes
        .map(node => {
          const name = node.querySelector('.property-name');
          const value = node.querySelector('.property-value');

          return (!name || !value) ? null : {
            name: name.textContent ? name.textContent.trim().replace(/:$/, '') : '',
            value: value.textContent ? value.textContent.trim().replace(/;$/, '') : '',
          };
        })
        .filter(prop => !!prop);
  });
};

export const getTracesFromComputedStyle = async (computedStyleSelector: string) => {
  const computedStyleProperty = await $(computedStyleSelector);
  await click(computedStyleProperty);
  await waitFor(COMPUTED_STYLE_TRACES_SELECTOR);  // avoid flakiness
  const propertyTraces = await $$(COMPUTED_STYLE_TRACES_SELECTOR);
  return propertyTraces.evaluate((nodes: Element[]) => nodes.map(node => node.textContent));
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

export const toggleShowAllComputedProperties = async () => {
  const initialContent = await getContentOfComputedPane();

  const computedPanel = await $(COMPUTED_STYLES_PANEL_SELECTOR);
  const showAllButton = await $(COMPUTED_STYLES_SHOW_ALL_SELECTOR, computedPanel);
  await click(showAllButton);
  await waitForComputedPaneChange(initialContent);
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


export const waitForStyleRule = async (expectedSelector: string) => {
  await waitForFunction(async () => {
    const rules = await getDisplayedStyleRules();
    return rules.map(rule => rule.selectorText).includes(expectedSelector);
  });
};

export const getDisplayedStyleRules = async () => {
  const allRuleSelectors = await $$(CSS_STYLE_RULE_SELECTOR);

  const rules = [];

  for (const ruleSelector of (await allRuleSelectors.getProperties()).values()) {
    const propertyNames = await getDisplayedCSSPropertyNames(ruleSelector);
    const selectorText = await ruleSelector.evaluate((node: Element) => {
      const attribute = node.getAttribute('aria-label') || '';
      return attribute.substring(0, attribute.lastIndexOf(', css selector'));
    });

    rules.push({selectorText, propertyNames});
  }

  return rules;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const getStyleRule = async (selector: string) => {
  return await $(`[aria-label="${selector}, css selector"]`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCSSPropertySwatchStyle = async (ruleSection: puppeteer.JSHandle<any>) => {
  const swatches = await $$(CSS_PROPERTY_SWATCH_SELECTOR, ruleSection);
  return await swatches.evaluate(async (nodes: Element[]) => {
    return nodes.length && nodes[0].getAttribute('style');
  });
};

export const getStyleSectionSubtitles = async () => {
  const subtitles = await $$(SECTION_SUBTITLE_SELECTOR);
  return await subtitles.evaluate(async (nodes: Element[]) => {
    return nodes.map(node => node.textContent);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCSSPropertyInRule = async (ruleSection: puppeteer.JSHandle<any>, name: string) => {
  const propertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, ruleSection);
  return await propertyNames.evaluateHandle(async (nodes: Element[], name) => {
    const propertyName = nodes.find(node => node.textContent === name);
    return propertyName && propertyName.parentNode;
  }, name);
};

export const focusCSSPropertyValue = async (selector: string, propertyName: string) => {
  await waitForStyleRule(selector);
  const rule = await getStyleRule(selector);
  const property = await getCSSPropertyInRule(rule, propertyName);
  await click('.value', {root: property});
};

export async function editCSSProperty(selector: string, propertyName: string, newValue: string) {
  await focusCSSPropertyValue(selector, propertyName);

  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.type(newValue);
  await frontend.keyboard.press('Enter');
}

export const getBreadcrumbsTextContent = async () => {
  const crumbs = await $$('li.crumb > a');

  const crumbsAsText: string[] = await crumbs.evaluate((nodes: HTMLElement[]) => {
    return nodes.map((node: HTMLElement) => node.textContent || '');
  });

  return crumbsAsText;
};

export const getSelectedBreadcrumbTextContent = async () => {
  const selectedCrumb = await $('li.crumb.selected > a');
  const text = selectedCrumb.evaluate((node: HTMLElement) => node.textContent || '');
  return text;
};

export const navigateToElementsTab = async () => {
  // Open Elements panel
  await click('#tab-elements');
  await waitFor(ELEMENTS_PANEL_SELECTOR);
};

export const clickOnFirstLinkInStylesPanel = async () => {
  const stylesPane = await waitFor('div.styles-pane');
  await click('div.styles-section-subtitle span.devtools-link', {root: stylesPane});
};
