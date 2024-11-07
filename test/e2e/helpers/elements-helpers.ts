// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {
  $,
  $$,
  click,
  clickElement,
  clickMoreTabsButton,
  getBrowserAndPages,
  getTextContent,
  goToResource,
  pressKey,
  step,
  summonSearchBox,
  typeText,
  waitFor,
  waitForAria,
  waitForFunction,
  waitForNone,
  waitForVisible,
} from '../../shared/helper.js';

import {openSoftContextMenuAndClickOnItem} from './context-menu-helpers.js';
import {
  expectVeEvents,
  veChange,
  veClick,
  veImpression,
  veImpressionForElementsPanel,
  veImpressionsUnder,
  veKeyDown,
  veResize,
} from './visual-logging-helpers.js';

const SELECTED_TREE_ELEMENT_SELECTOR = '.selected[role="treeitem"]';
const CSS_PROPERTY_NAME_SELECTOR = '.webkit-css-property';
const CSS_PROPERTY_VALUE_SELECTOR = '.value';
const CSS_DECLARATION_SELECTOR =
    `[role="treeitem"]:has(${CSS_PROPERTY_NAME_SELECTOR}):has(${CSS_PROPERTY_VALUE_SELECTOR})`;
const COLOR_SWATCH_SELECTOR = '.color-swatch-inner';
const CSS_STYLE_RULE_SELECTOR = '[aria-label*="css selector"]';
const COMPUTED_PROPERTY_SELECTOR = 'devtools-computed-style-property';
const COMPUTED_STYLES_PANEL_SELECTOR = '[aria-label="Computed panel"]';
const COMPUTED_STYLES_SHOW_ALL_SELECTOR = '[title="Show all"]';
export const ELEMENTS_PANEL_SELECTOR = '.panel[aria-label="elements"]';
const FONT_EDITOR_SELECTOR = '[aria-label="Font Editor"]';
const HIDDEN_FONT_EDITOR_SELECTOR = '.font-toolbar-hidden';
export const SECTION_SUBTITLE_SELECTOR = '.styles-section-subtitle';
const CLS_PANE_SELECTOR = '.styles-sidebar-toolbar-pane';
const CLS_BUTTON_SELECTOR = '[aria-label="Element Classes"]';
const CLS_INPUT_SELECTOR = '[aria-placeholder="Add new class"]';
const LAYOUT_PANE_TAB_SELECTOR = '[aria-label="Layout"]';
const LAYOUT_PANE_TABPANEL_SELECTOR = '[aria-label="Layout panel"]';
const ADORNER_SELECTOR = 'devtools-adorner';
export const INACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Enable grid mode"]';
export const ACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Disable grid mode"]';
const ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR = '.elements input[type=checkbox]';
const ELEMENT_STYLE_SECTION_SELECTOR = '[aria-label="element.style, css selector"]';
const STYLE_QUERY_RULE_TEXT_SELECTOR = '.query-text';
export const STYLE_PROPERTIES_SELECTOR = '.tree-outline-disclosure [role="treeitem"]';
const CSS_AUTHORING_HINTS_ICON_SELECTOR = '.hint';
export const SEARCH_BOX_SELECTOR = '.search-bar';
const SEARCH_RESULTS_MATCHES = '.search-results-matches';
export const EMULATE_FOCUSED_PAGE = 'Emulate a focused page';

export const openLayoutPane = async () => {
  await step('Open Layout pane', async () => {
    await click(LAYOUT_PANE_TAB_SELECTOR);

    const panel = await waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
    await waitFor('.elements', panel);
  });
  await expectVeEvents([
    veClick('Panel: elements > Toolbar: sidebar > PanelTabHeader: elements.layout'),
    veImpressionsUnder('Panel: elements', [veImpression(
                                              'Pane', 'layout',
                                              [
                                                veImpression('SectionHeader', 'grid-settings'),
                                                veImpression(
                                                    'Section', 'grid-settings',
                                                    [
                                                      veImpression('DropDown', 'show-grid-line-labels'),
                                                      veImpression('Toggle', 'extend-grid-lines'),
                                                      veImpression('Toggle', 'show-grid-areas'),
                                                      veImpression('Toggle', 'show-grid-track-sizes'),
                                                    ]),
                                                veImpression('Section', 'grid-overlays'),
                                                veImpression('SectionHeader', 'flexbox-overlays'),
                                                veImpression('Section', 'flexbox-overlays'),
                                              ])]),
  ]);
};

export const waitForAdorners = async (expectedAdorners: {textContent: string, isActive: boolean}[]) => {
  await waitForFunction(async () => {
    const actualAdorners = await $$(ADORNER_SELECTOR);
    const actualAdornersStates = await Promise.all(actualAdorners.map(n => {
      return n.evaluate((node, activeSelector: string) => {
        // TODO for now only the grid adorner that can be active. When the flex (or other) adorner can be activated
        // too we should change the selector passed here crbug.com/1144090.
        return {textContent: node.textContent, isActive: node.matches(activeSelector)};
      }, ACTIVE_GRID_ADORNER_SELECTOR);
    }));

    if (actualAdornersStates.length !== expectedAdorners.length) {
      return false;
    }

    for (let i = 0; i < actualAdornersStates.length; i++) {
      const index = expectedAdorners.findIndex(expected => {
        const actual = actualAdornersStates[i];
        return expected.textContent === actual.textContent && expected.isActive === actual.isActive;
      });
      if (index !== -1) {
        expectedAdorners.splice(index, 1);
      }
    }

    return expectedAdorners.length === 0;
  });

  if (expectedAdorners.length) {
    await expectVeEvents(
        [veImpressionsUnder('Panel: elements >  Tree: elements > TreeItem', [veImpression('Adorner', 'grid')])]);
  }
};

export const toggleAdornerSetting = async (type: string) => {
  await openSoftContextMenuAndClickOnItem(SELECTED_TREE_ELEMENT_SELECTOR, 'Badge settings\u2026');
  const adornerSettings = await waitFor('.adorner-settings-pane');
  await expectVeEvents([
    veClick('Panel: elements > Tree: elements > TreeItem'),
    veImpressionForSelectedNodeMenu(await getContentOfSelectedNode()),
    veClick('Panel: elements > Tree: elements > TreeItem > Menu > Action: show-adorner-settings'),
    veResize('Panel: elements > Tree: elements > TreeItem > Menu'),
  ]);
  await click(`[title=${type}]`, {root: adornerSettings});

  await expectVeEvents([
    veImpressionsUnder('Panel: elements', [veImpression(
                                              'Pane', 'adorner-settings',
                                              [
                                                veImpression('Toggle: ad'),
                                                veImpression('Toggle: container'),
                                                veImpression('Toggle: flex'),
                                                veImpression('Toggle: grid'),
                                                veImpression('Toggle: media'),
                                                veImpression('Toggle: reveal'),
                                                veImpression('Toggle: scroll-snap'),
                                                veImpression('Toggle: slot'),
                                                veImpression('Toggle: subgrid'),
                                                veImpression('Toggle: top-layer'),
                                                veImpression('Close'),
                                              ])]),
    veChange('Panel: elements > Pane: adorner-settings > Toggle: media'),
  ]);
};

export const waitForSelectedNodeToBeExpanded = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR}[aria-expanded="true"]`);
};

export const waitForAdornerOnSelectedNode = async (expectedAdornerText: string) => {
  await waitForFunction(async () => {
    const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const adorner = await waitFor(ADORNER_SELECTOR, selectedNode);
    return expectedAdornerText === await adorner.evaluate(node => node.textContent);
  });
  await expectVeEvents([veImpressionsUnder(
      'Panel: elements > Tree: elements > TreeItem', [veImpression('Adorner', expectedAdornerText)])]);
};

export const waitForNoAdornersOnSelectedNode = async () => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  await waitForNone(ADORNER_SELECTOR, selectedNode);
};

export const toggleElementCheckboxInLayoutPane = async () => {
  await step('Click element checkbox in Layout pane', async () => {
    await click(ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR);
  });
  await expectVeEvents([veClick('Panel: elements > Pane: layout > Section: grid-overlays > Item > Toggle')]);
};

export const getGridsInLayoutPane = async () => {
  const panel = await waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
  return await $$('.elements .element', panel);
};

export const waitForSomeGridsInLayoutPane = async (minimumGridCount: number) => {
  await waitForFunction(async () => {
    const grids = await getGridsInLayoutPane();
    return grids.length >= minimumGridCount;
  });
  await expectVeEvents(
      [veImpressionsUnder('Panel: elements > Pane: layout > Section: grid-overlays', [veImpression('Item', undefined, [
                            veImpression('Action', 'elements.select-element'),
                            veImpression('ShowStyleEditor', 'color'),
                            veImpression('Toggle'),
                          ])])]);
};

export const waitForContentOfSelectedElementsNode = async (expectedTextContent: string) => {
  await waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode();
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForPartialContentOfSelectedElementsNode = async (expectedPartialTextContent: string) => {
  await waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode();
    return selectedTextContent.includes(expectedPartialTextContent);
  });
};

/**
 * Gets the text content of the currently selected element.
 */
export const getContentOfSelectedNode = async () => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  return await selectedNode.evaluate(node => node.textContent as string);
};

export const waitForSelectedNodeChange = async (initialValue: string, asyncScope = new AsyncScope()) => {
  await waitForFunction(async () => {
    const currentContent = await getContentOfSelectedNode();
    return currentContent !== initialValue;
  }, asyncScope);
};

export const assertSelectedElementsNodeTextIncludes = async (expectedTextContent: string) => {
  const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent as string);
  assert.include(selectedTextContent, expectedTextContent);
};

export const waitForSelectedTreeElementSelectorWithTextcontent = async (expectedTextContent: string) => {
  await waitForFunction(async () => {
    const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForSelectedTreeElementSelectorWhichIncludesText = async (expectedTextContent: string) => {
  await waitForFunction(async () => {
    const selectedNode = await waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent && selectedTextContent.includes(expectedTextContent);
  });
};

export const waitForChildrenOfSelectedElementNode = async () => {
  await waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const waitForAndClickTreeElementWithPartialText = async (text: string) =>
    waitForFunction(async () => clickTreeElementWithPartialText(text));

export const waitForElementWithPartialText = async (text: string) => {
  return waitForFunction(async () => elementWithPartialText(text));
};

const elementWithPartialText = async (text: string) => {
  const tree = await waitFor('Page DOM[role="tree"]', undefined, undefined, 'aria');
  const elements = await $$('[role="treeitem"]', tree, 'aria');
  for (const handle of elements) {
    const match = await handle.evaluate((element, text) => element.textContent?.includes(text), text);
    if (match) {
      return handle;
    }
  }
  return null;
};

export const clickTreeElementWithPartialText = async (text: string) => {
  const handle = await elementWithPartialText(text);
  if (handle) {
    await clickElement(handle);
    await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')]);
    return true;
  }

  return false;
};

export const clickNthChildOfSelectedElementNode = async (childIndex: number) => {
  assert(childIndex > 0, 'CSS :nth-child() selector indices are 1-based.');
  await click(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li:nth-child(${childIndex})`);
  await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')]);
};

export const focusElementsTree = async () => {
  await click(SELECTED_TREE_ELEMENT_SELECTOR);
  await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')]);
};

export const navigateToSidePane = async (paneName: string) => {
  if ((await $$(`[aria-label="${paneName} panel"]`)).length) {
    return;
  }
  await click(`[aria-label="${paneName}"]`);
  await waitFor(`[aria-label="${paneName} panel"]`);
  const jslogContext = paneName.toLowerCase();
  await expectVeEvents([
    veClick(`Panel: elements > Toolbar: sidebar > PanelTabHeader: ${jslogContext}`),
    veImpressionsUnder('Panel: elements', [veImpression('Pane', jslogContext)]),
  ]);
};

export const waitForElementsStyleSection = async () => {
  // Wait for the file to be loaded and selectors to be shown
  await waitFor('.styles-selector');
  await expectVeEvents([veImpressionsUnder('Panel: elements', [veImpression('Pane', 'styles')])]);
};

export const waitForElementsComputedSection = async () => {
  await waitFor(COMPUTED_PROPERTY_SELECTOR);
  await expectVeEvents([veImpressionsUnder('Panel: elements', [veImpression('Pane', 'computed')])]);
};

export const getContentOfComputedPane = async () => {
  const pane = await waitFor('Computed panel', undefined, undefined, 'aria');
  const tree = await waitFor('[role="tree"]', pane, undefined, 'aria');
  return await tree.evaluate(node => node.textContent as string);
};

export const waitForComputedPaneChange = async (initialValue: string) => {
  await waitForFunction(async () => {
    const value = await getContentOfComputedPane();
    return value !== initialValue;
  });
};

export const getAllPropertiesFromComputedPane = async () => {
  const properties = await $$(COMPUTED_PROPERTY_SELECTOR);
  return (await Promise.all(properties.map(elem => elem.evaluate(async node => {
           const nameSlot = node.shadowRoot?.querySelector<HTMLSlotElement>('.property-name slot');
           const valueSlot = node.shadowRoot?.querySelector<HTMLSlotElement>('.property-value slot');
           const name = nameSlot?.assignedElements().at(0);
           const value = valueSlot?.assignedElements().at(0);

           return (!name || !value) ? null : {
             name: name.textContent ? name.textContent.trim().replace(/:$/, '') : '',
             value: value.textContent ? value.textContent.trim().replace(/;$/, '') : '',
           };
         }))))
      .filter(prop => Boolean(prop));
};

export const getPropertyFromComputedPane = async (name: string) => {
  const properties = await $$(COMPUTED_PROPERTY_SELECTOR);
  for (const property of properties) {
    const matchingProperty = await property.evaluate((node, name) => {
      const nameSlot = node.shadowRoot?.querySelector<HTMLSlotElement>('.property-name slot');
      const nameEl = nameSlot?.assignedElements().at(0);
      return nameEl?.textContent?.trim().replace(/:$/, '') === name;
    }, name);
    // Note that evaluateHandle always returns a handle, even if it points to an undefined remote object, so we need to
    // check it's defined here or continue iterating.
    if (matchingProperty) {
      return property;
    }
  }
  return undefined;
};

export const expandSelectedNodeRecursively = async () => {
  const EXPAND_RECURSIVELY = '[aria-label="Expand recursively"]';

  // Find the selected node, right click.
  await click(SELECTED_TREE_ELEMENT_SELECTOR, {clickOptions: {button: 'right'}});

  // Wait for the 'expand recursively' option, and click it.
  await click(EXPAND_RECURSIVELY);
  await expectVeEvents([
    veClick('Panel: elements > Tree: elements > TreeItem'),
    veImpressionForSelectedNodeMenu(await getContentOfSelectedNode()),
    veClick('Panel: elements > Tree: elements > TreeItem > Menu > Action: expand-recursively'),
  ]);
};

export const findElementById = async (id: string) => {
  await pressKey('f', {control: true});
  await waitFor('.search-bar:not(.hidden)');
  await typeText('#' + id);
  await pressKey('Enter');
  await waitFor(`.highlight > .webkit-html-tag[aria-label*="\\"${id}\\"`);
  await pressKey('Escape');
  await waitFor('.search-bar.hidden');
};

function veImpressionForSelectedNodeMenu(content: string) {
  const isPeudoElement = content.startsWith('::');
  if (isPeudoElement) {
    return veImpressionsUnder('Panel: elements > Tree: elements > TreeItem', [veImpression('Menu', undefined, [
                                veImpression('Action', 'expand-recursively'),
                                veImpression('Action', 'scroll-into-view'),
                                veImpression('Action', 'show-adorner-settings'),
                                veImpression('Action', 'store-as-global-variable'),
                              ])]);
  }
  return veImpressionsUnder('Panel: elements > Tree: elements > TreeItem', [veImpression('Menu', undefined, [
                              veImpression('Action', 'add-attribute'),
                              veImpression('Action', 'collapse-children'),
                              veImpression('Action', 'cut'),
                              veImpression('Action', 'delete-element'),
                              veImpression('Action', 'elements.duplicate-element'),
                              veImpression('Action', 'elements.edit-as-html'),
                              veImpression('Action', 'emulation.capture-node-screenshot'),
                              veImpression('Action', 'expand-recursively'),
                              veImpression('Action', 'focus'),
                              veImpression('Action', 'paste'),
                              veImpression('Action', 'scroll-into-view'),
                              veImpression('Action', 'show-adorner-settings'),
                              veImpression('Action', 'store-as-global-variable'),
                              veImpression('Item', 'break-on'),
                              veImpression('Item', 'copy'),
                              veImpression('Item', 'force-state'),
                              veImpression('Toggle', 'elements.hide-element'),
                            ])]);
}

export const showForceState = async (specificStates?: boolean) => {
  // Check if it is already visible
  if (!(await $(EMULATE_FOCUSED_PAGE, undefined, 'aria'))) {
    await click('[aria-label="Toggle Element State"]');
    await waitForAria(EMULATE_FOCUSED_PAGE);
  }

  if (specificStates) {
    const specificStatesPane = await waitFor('.specific-pseudo-states');
    if (!(await specificStatesPane.evaluate(node => node.checkVisibility()))) {
      await click('.force-specific-element-header');
      await waitForVisible('.specific-pseudo-states');
    }
  }
};

export const forcePseudoState = async (pseudoState: string, specificStates?: boolean) => {
  // Open element & page state pane and wait for it to be loaded asynchronously
  await showForceState(specificStates);

  const stateEl = await waitForAria(pseudoState);
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  // await timeout(100);
  await stateEl.click();
  await expectVeEvents([
    veClick('Panel: elements > Pane: styles > ToggleSubpane: element-states'),
    veImpressionsUnder('Panel: elements > Pane: styles', [veImpression(
                                                             'Pane', 'element-states',
                                                             [
                                                               veImpression('Action: learn-more'),
                                                               veImpression('Toggle: active'),
                                                               veImpression('Toggle: focus'),
                                                               veImpression('Toggle: focus-visible'),
                                                               veImpression('Toggle: focus-within'),
                                                               veImpression('Toggle: hover'),
                                                               veImpression('Toggle: target'),
                                                             ])]),
    veChange(`Panel: elements > Pane: styles > Pane: element-states > Toggle: ${
        pseudoState === EMULATE_FOCUSED_PAGE ? 'emulate-page-focus' : pseudoState.substr(1)}`),
  ]);
};

export const removePseudoState = async (pseudoState: string) => {
  const stateEl = await waitForAria(pseudoState);
  await stateEl.click();
  await expectVeEvents([
    veChange(`Panel: elements > Pane: styles > Pane: element-states > Toggle: ${
        pseudoState === EMULATE_FOCUSED_PAGE ? 'emulate-page-focus' : pseudoState.substr(1)}`),
  ]);
};

export const getComputedStylesForDomNode =
    async (elementSelector: string, styleAttribute: keyof CSSStyleDeclaration) => {
  const {target} = getBrowserAndPages();

  return target.evaluate((elementSelector, styleAttribute) => {
    const element = document.querySelector(elementSelector);
    if (!element) {
      throw new Error(`${elementSelector} could not be found`);
    }
    return getComputedStyle(element)[styleAttribute];
  }, elementSelector, styleAttribute);
};

export const waitForNumberOfComputedProperties = async (numberToWaitFor: number) => {
  const computedPane = await getComputedPanel();
  return waitForFunction(
      async () => numberToWaitFor ===
          await computedPane.$$eval('pierce/' + COMPUTED_PROPERTY_SELECTOR, properties => properties.length));
};

export const getComputedPanel = async () => waitFor(COMPUTED_STYLES_PANEL_SELECTOR);

export const filterComputedProperties = async (filterString: string) => {
  const initialContent = await getContentOfComputedPane();

  const computedPanel = await waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await click('[aria-label="Filter"]', {
    root: computedPanel,
  });
  await typeText(filterString);
  await waitForComputedPaneChange(initialContent);
  await expectVeEvents([veChange('Panel: elements > Pane: computed > TextField: filter')]);
};

export const toggleShowAllComputedProperties = async () => {
  const initialContent = await getContentOfComputedPane();

  const computedPanel = await waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await click(COMPUTED_STYLES_SHOW_ALL_SELECTOR, {root: computedPanel});
  await waitForComputedPaneChange(initialContent);
  await expectVeEvents(
      [veChange('Panel: elements > Pane: computed > Toggle: show-inherited-computed-style-properties')]);
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

export const getStyleRuleSelector = (selector: string) => `[aria-label="${selector}, css selector"]`;

export const waitForExactStyleRule = async (expectedSelector: string) => {
  await waitForFunction(async () => {
    const rules = await getDisplayedStyleRules();
    return rules.find(rule => rule.selectorText === expectedSelector);
  });
};

export const waitForStyleRule = async (expectedSelector: string) => {
  await waitForFunction(async () => {
    const rules = await getDisplayedStyleRules();
    return rules.map(rule => rule.selectorText).includes(expectedSelector);
  });
};

export const getComputedStyleProperties = async () => {
  const computedPanel = await getComputedPanel();
  const allProperties = await computedPanel.$$('pierce/[role="treeitem"][aria-level="1"]');
  const properties = [];
  for (const prop of allProperties) {
    const name = await prop.$eval('pierce/' + CSS_PROPERTY_NAME_SELECTOR, element => element.textContent);
    const value = await prop.$eval('pierce/' + CSS_PROPERTY_VALUE_SELECTOR, element => element.textContent);
    const traceElements = await prop.$$('pierce/devtools-computed-style-trace');
    const trace = await Promise.all(traceElements.map(async element => {
      const value = await element.$eval('pierce/.value', element => element.textContent);
      const selector = await element.$eval('pierce/.trace-selector', element => element.textContent);
      const link = await element.$eval('pierce/.trace-link', element => element.textContent);
      return {value, selector, link};
    }));
    properties.push({name, value, trace});
  }
  return properties;
};

export const getDisplayedCSSDeclarations = async () => {
  const cssDeclarations = await $$(CSS_DECLARATION_SELECTOR);
  return Promise.all(cssDeclarations.map(async node => await node.evaluate(n => n.textContent?.trim())));
};

export const getDisplayedStyleRulesCompact = async () => {
  const compactRules = [];
  for (const rule of await getDisplayedStyleRules()) {
    compactRules.push(
        {selectorText: rule.selectorText, propertyNames: rule.propertyData.map(data => data.propertyName)});
  }
  return compactRules;
};

export const getDisplayedStyleRules = async () => {
  const allRuleSelectors = await $$(CSS_STYLE_RULE_SELECTOR);
  const rules = [];
  for (const ruleSelector of allRuleSelectors) {
    const propertyData = await getDisplayedCSSPropertyData(ruleSelector);
    const selectorText = await ruleSelector.evaluate(node => {
      const attribute = node.getAttribute('aria-label') || '';
      return attribute.substring(0, attribute.lastIndexOf(', css selector'));
    });
    rules.push({selectorText, propertyData});
  }

  return rules;
};

/**
 * @param propertiesSection - The element containing this properties section.
 * @returns an array with an entry for each property in the section. Each entry has:
 * - propertyName: The name of this property.
 * - isOverloaded: True if this is an inherited properties section, and this property is overloaded by a child node.
 *                 The property will be shown as crossed out in the style pane.
 * - isInherited: True if this is an inherited properties section, and this property is a non-inherited CSS property.
 *                The property will be shown as grayed-out in the style pane.
 */
export const getDisplayedCSSPropertyData = async (propertiesSection: puppeteer.ElementHandle<Element>) => {
  const cssPropertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesData =
      (await Promise.all(cssPropertyNames.map(
           async node => {
             return {
               propertyName: await node.evaluate(n => n.textContent),
               isOverLoaded: await node.evaluate(n => n.parentElement && n.parentElement.matches('.overloaded')),
               isInherited: await node.evaluate(n => n.parentElement && n.parentElement.matches('.inherited')),
             };
           },
           )))
          .filter(c => Boolean(c.propertyName));
  return propertyNamesData;
};

export const getDisplayedCSSPropertyNames = async (propertiesSection: puppeteer.ElementHandle<Element>) => {
  const cssPropertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = (await Promise.all(cssPropertyNames.map(
                                 node => node.evaluate(n => n.textContent),
                                 )))
                                .filter(c => Boolean(c));
  return propertyNamesText;
};

export const getStyleRule = (selector: string) => {
  return waitFor(getStyleRuleSelector(selector));
};

export const getStyleRuleWithSourcePosition = (styleSelector: string, sourcePosition?: string) => {
  if (!sourcePosition) {
    return getStyleRule(styleSelector);
  }
  const selector = getStyleRuleSelector(styleSelector);
  return waitForFunction(async () => {
    const candidate = await waitFor(selector);
    if (candidate) {
      const sourcePositionElement = await candidate.$('.styles-section-subtitle .devtools-link');
      const text = await sourcePositionElement?.evaluate(node => node.textContent);
      if (text === sourcePosition) {
        return candidate;
      }
    }
    return undefined;
  });
};

export const getColorSwatch = async (parent: puppeteer.ElementHandle<Element>|undefined, index: number) => {
  const swatches = await $$(COLOR_SWATCH_SELECTOR, parent);
  return swatches[index];
};

export const getColorSwatchColor = async (parent: puppeteer.ElementHandle<Element>, index: number) => {
  const swatch = await getColorSwatch(parent, index);
  return await swatch.evaluate(node => (node as HTMLElement).style.backgroundColor);
};

export const shiftClickColorSwatch =
    async (parent: puppeteer.ElementHandle<Element>, index: number, parentVe: string) => {
  const swatch = await getColorSwatch(parent, index);
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.down('Shift');
  await clickElement(swatch);
  await frontend.keyboard.up('Shift');
  await expectVeEvents([
    veClick(`${parentVe} > ShowStyleEditor: color`),
    veImpressionsUnder(
        `${parentVe} > ShowStyleEditor: color`,
        [veImpression('Menu', undefined, [veImpression('Action', 'clipped-color'), veImpression('Item', 'color')])]),
  ]);
};

export const getElementStyleFontEditorButton = async () => {
  const section = await waitFor(ELEMENT_STYLE_SECTION_SELECTOR);
  const result = await $(FONT_EDITOR_SELECTOR, section);
  await expectVeEvents([veImpressionsUnder(
      'Panel: elements > Pane: styles > Section: style-properties', [veImpression('Action', 'font-editor')])]);
  return result;
};

export const getFontEditorButtons = async () => {
  const buttons = await $$(FONT_EDITOR_SELECTOR);
  return buttons;
};

export const getHiddenFontEditorButtons = async () => {
  const buttons = await $$(HIDDEN_FONT_EDITOR_SELECTOR);
  return buttons;
};

export const getStyleSectionSubtitles = async () => {
  const subtitles = await $$(SECTION_SUBTITLE_SELECTOR);
  return Promise.all(subtitles.map(node => node.evaluate(n => n.textContent)));
};

export const getCSSPropertyInRule =
    async (ruleSection: puppeteer.ElementHandle<Element>|string, name: string, sourcePosition?: string) => {
  if (typeof ruleSection === 'string') {
    ruleSection = await getStyleRuleWithSourcePosition(ruleSection, sourcePosition);
  }

  const propertyNames = await $$(CSS_PROPERTY_NAME_SELECTOR, ruleSection);
  for (const node of propertyNames) {
    const parent =
        (await node.evaluateHandle((node, name) => (name === node.textContent) ? node.parentNode : undefined, name))
            .asElement();
    if (parent) {
      return parent as puppeteer.ElementHandle<HTMLElement>;
    }
  }
  return undefined;
};

export const focusCSSPropertyValue = async (selector: string, propertyName: string) => {
  await waitForStyleRule(selector);
  let property = await getCSSPropertyInRule(selector, propertyName);
  // Clicking on the semicolon element to make sure we don't hit the swatch or other
  // non-editable elements.
  await click(CSS_PROPERTY_VALUE_SELECTOR + ' + .styles-semicolon', {root: property});
  await waitForFunction(async () => {
    property = await getCSSPropertyInRule(selector, propertyName);
    const value = property ? await $(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    if (!value) {
      assert.fail(`Could not find property ${propertyName} in rule ${selector}`);
    }
    return await value.evaluate(node => {
      return node.classList.contains('text-prompt') && node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents([veClick(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
      propertyName.startsWith('--') ? 'custom-property' : propertyName}`)]);
};

/**
 * Edit a CSS property value in a given rule
 * @param selector The selector of the rule to be updated. Note that because of the way the Styles populates, it is
 * important to provide a rule selector that is unique here, to avoid editing a property in the wrong rule.
 * @param propertyName The name of the property to be found and edited. If several properties have the same names, the
 * first one is edited.
 * @param newValue The new value to be used.
 */
export async function editCSSProperty(selector: string, propertyName: string, newValue: string) {
  await focusCSSPropertyValue(selector, propertyName);

  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.type(newValue, {delay: 100});
  await frontend.keyboard.press('Enter');

  await waitForFunction(async () => {
    // Wait until the value element is not a text-prompt anymore.
    const property = await getCSSPropertyInRule(selector, propertyName);
    const value = property ? await $(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    if (!value) {
      assert.fail(`Could not find property ${propertyName} in rule ${selector}`);
    }
    return await value.evaluate(node => {
      return !node.classList.contains('text-prompt') && !node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents([veChange(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
      propertyName.startsWith('--') ? 'custom-property' : propertyName} > Value`)]);
}

// Edit a media or container query rule text for the given styles section
export async function editQueryRuleText(queryStylesSections: puppeteer.ElementHandle<Element>, newQueryText: string) {
  await click(STYLE_QUERY_RULE_TEXT_SELECTOR, {root: queryStylesSections});
  await waitForFunction(async () => {
    // Wait until the value element has been marked as a text-prompt.
    const queryText = await $(STYLE_QUERY_RULE_TEXT_SELECTOR, queryStylesSections);
    if (!queryText) {
      assert.fail('Could not find any query in the given styles section');
    }
    const check = await queryText.evaluate(node => {
      return node.classList.contains('being-edited') && node.hasAttribute('contenteditable');
    });
    return check;
  });
  await typeText(newQueryText);
  await pressKey('Enter');

  await waitForFunction(async () => {
    // Wait until the value element is not a text-prompt anymore.
    const queryText = await $(STYLE_QUERY_RULE_TEXT_SELECTOR, queryStylesSections);
    if (!queryText) {
      assert.fail('Could not find any query in the given styles section');
    }
    const check = await queryText.evaluate(node => {
      return !node.classList.contains('being-edited') && !node.hasAttribute('contenteditable');
    });
    return check;
  });
  await expectVeEvents([
    veClick('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
    veChange('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
  ]);
}

export async function waitForCSSPropertyValue(selector: string, name: string, value: string, sourcePosition?: string) {
  return await waitForFunction(async () => {
    const propertyHandle = await getCSSPropertyInRule(selector, name, sourcePosition);
    if (!propertyHandle) {
      return undefined;
    }

    const valueHandle = await $(CSS_PROPERTY_VALUE_SELECTOR, propertyHandle);
    if (!valueHandle) {
      return undefined;
    }

    const matches = await valueHandle.evaluate((node, value) => node.textContent === value, value);
    if (matches) {
      return valueHandle;
    }
    return undefined;
  });
}

export async function waitForPropertyToHighlight(ruleSelector: string, propertyName: string) {
  await waitForFunction(async () => {
    const property = await getCSSPropertyInRule(ruleSelector, propertyName);
    if (!property) {
      assert.fail(`Could not find property ${propertyName} in rule ${ruleSelector}`);
    }
    // StylePropertyHighlighter temporarily highlights the property using the Web Animations API, so the only way to
    // know it's happening is by listing all animations.
    const animationCount = await property.evaluate(node => (node as HTMLElement).getAnimations().length);
    return animationCount > 0;
  });
}

export const getBreadcrumbsTextContent = async ({expectedNodeCount}: {expectedNodeCount: number}) => {
  const crumbsSelector = 'li.crumb > a > devtools-node-text';
  await waitForFunction(async () => {
    const crumbs = await $$(crumbsSelector);
    return crumbs.length === expectedNodeCount;
  });

  const crumbs = await $$(crumbsSelector);
  const crumbsAsText: string[] = await Promise.all(crumbs.map(node => node.evaluate((node: Element) => {
    if (!node.shadowRoot) {
      assert.fail('Found breadcrumbs node that unexpectedly has no shadowRoot.');
    }
    return Array.from(node.shadowRoot.querySelectorAll('span') || []).map(span => span.textContent).join('');
  })));
  return crumbsAsText;
};

export const getSelectedBreadcrumbTextContent = async () => {
  const selectedCrumb = await waitFor('li.crumb.selected > a > devtools-node-text');
  const text = selectedCrumb.evaluate((node: Element) => {
    if (!node.shadowRoot) {
      assert.fail('Found breadcrumbs node that unexpectedly has no shadowRoot.');
    }
    return Array.from(node.shadowRoot.querySelectorAll('span') || []).map(span => span.textContent).join('');
  });
  return text;
};

export const navigateToElementsTab = async () => {
  if ((await $$(ELEMENTS_PANEL_SELECTOR)).length) {
    return;
  }
  // Open Elements panel
  await click('#tab-elements');
  await waitFor(ELEMENTS_PANEL_SELECTOR);
  await expectVeEvents([veImpressionForElementsPanel()]);
};

export const clickOnFirstLinkInStylesPanel = async () => {
  const stylesPane = await waitFor('div.styles-pane');
  await click('div.styles-section-subtitle button.devtools-link', {root: stylesPane});
  await expectVeEvents([veClick('Panel: elements > Pane: styles > Section: style-properties > Link: css-location')]);
};

export const toggleClassesPane = async () => {
  await click(CLS_BUTTON_SELECTOR);
  await expectVeEvents([
    veClick('Panel: elements > Pane: styles > ToggleSubpane: elements-classes'),
    veImpressionsUnder(
        'Panel: elements > Pane: styles', [veImpression('Pane', 'elements-classes', [veImpression('TextField')])]),
  ]);
};

export const typeInClassesPaneInput =
    async (text: string, commitWith: puppeteer.KeyInput = 'Enter', waitForNodeChange: Boolean = true) => {
  await step(`Typing in new class names ${text}`, async () => {
    const clsInput = await waitFor(CLS_INPUT_SELECTOR);
    await clsInput.type(text, {delay: 50});
  });

  if (commitWith) {
    await step(`Committing the changes with ${commitWith}`, async () => {
      const {frontend} = getBrowserAndPages();
      await frontend.keyboard.press(commitWith);
    });
  }

  if (waitForNodeChange) {
    // Make sure the classes provided in text can be found in the selected element's content. This is important as the
    // cls pane applies classes as you type, so it is not enough to wait for the selected node to change just once.
    await step('Waiting for the selected node to change', async () => {
      await waitForFunction(async () => {
        const nodeContent = await getContentOfSelectedNode();
        return text.split(' ').every(cls => nodeContent.includes(cls));
      });
    });
  }
  await expectVeEvents([veChange('Panel: elements > Pane: styles > Pane: elements-classes > TextField')]);
};

export const toggleClassesPaneCheckbox = async (checkboxLabel: string) => {
  const initialValue = await getContentOfSelectedNode();

  const classesPane = await waitFor(CLS_PANE_SELECTOR);
  await click(`[title="${checkboxLabel}"]`, {root: classesPane});

  await waitForSelectedNodeChange(initialValue);
  await expectVeEvents([veChange('Panel: elements > Pane: styles > Pane: elements-classes > Toggle: element-class')]);
};

export const uncheckStylesPaneCheckbox = async (checkboxLabel: string) => {
  console.error('uncheckStylesPaneCheckbox', checkboxLabel);
  const initialValue = await getContentOfSelectedNode();
  await click(`.enabled-button[aria-label="${checkboxLabel}"]`);
  await waitForSelectedNodeChange(initialValue);
  await expectVeEvents([veClick(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
      checkboxLabel.split(' ')[0]} > Toggle`)]);
};

export const assertSelectedNodeClasses = async (expectedClasses: string[]) => {
  const nodeText = await getContentOfSelectedNode();
  const match = nodeText.match(/class=\u200B"([^"]*)/);
  const classText = match ? match[1] : '';
  const classes = classText.split(/[\s]/).map(className => className.trim()).filter(className => className.length);

  assert.strictEqual(
      classes.length, expectedClasses.length, 'Did not find the expected number of classes on the element');

  for (const expectedClass of expectedClasses) {
    assert.include(classes, expectedClass, `Could not find class ${expectedClass} on the element`);
  }
};

export const toggleAccessibilityPane = async () => {
  let a11yPane = await $('Accessibility', undefined, 'aria');
  if (!a11yPane) {
    const elementsPanel = await waitForAria('Elements panel');
    await clickMoreTabsButton(elementsPanel);
    a11yPane = await waitForAria('Accessibility');
    await expectVeEvents([
      veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs'),
      veImpressionsUnder(
          'Panel: elements > Toolbar: sidebar > DropDown: more-tabs',
          [veImpression('Menu', undefined, [veImpression('Action', 'accessibility.view')])]),
    ]);
  }
  await clickElement(a11yPane);
  await waitFor('.source-order-checkbox');
  await expectVeEvents([
    veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs > Menu > Action: accessibility.view'),
    veImpressionsUnder('Panel: elements > Toolbar: sidebar', [veImpression('PanelTabHeader', 'accessibility.view')]),
    veImpressionForAccessibilityPane(),
  ]);
};

function veImpressionForAccessibilityPane() {
  return veImpressionsUnder(
      'Panel: elements', [veImpression('Pane', 'sidebar', [
        veImpression('SectionHeader', 'accessibility-tree'),
        veImpression(
            'Section', 'accessibility-tree',
            [
              veImpression('Toggle', 'full-accessibility-tree'),
              veImpression('TreeItem', undefined, [veImpression('Expand'), veImpression('TreeItem')]),
            ]),
        veImpression('SectionHeader', 'aria-attributes'),
        veImpression('Section', 'aria-attributes'),
        veImpression('SectionHeader', 'computed-properties'),
        veImpression('Section', 'computed-properties', [veImpression('Tree', undefined, [veImpression('TreeItem')])]),
        veImpression('SectionHeader', 'source-order-viewer'),
        veImpression('Section', 'source-order-viewer', [veImpression('Toggle')]),
      ])]);
}

export const toggleAccessibilityTree = async () => {
  await click('aria/Switch to Accessibility Tree view');
  await expectVeEvents([veClick('Panel: elements > Action: toggle-accessibility-tree')]);
};

export const getPropertiesWithHints = async () => {
  const allRuleSelectors = await $$(CSS_STYLE_RULE_SELECTOR);

  const propertiesWithHints = [];
  for (const propertiesSection of allRuleSelectors) {
    const cssRuleNodes = await $$('li ', propertiesSection);

    for (const cssRuleNode of cssRuleNodes) {
      const propertyNode = await $(CSS_PROPERTY_NAME_SELECTOR, cssRuleNode);
      const propertyName = propertyNode !== null ? await propertyNode.evaluate(n => n.textContent) : null;
      if (propertyName === null) {
        continue;
      }

      const authoringHintsIcon = await $(CSS_AUTHORING_HINTS_ICON_SELECTOR, cssRuleNode);
      if (authoringHintsIcon) {
        propertiesWithHints.push(propertyName);
      }
    }
  }

  return propertiesWithHints;
};

export const summonAndWaitForSearchBox = async () => {
  await summonSearchBox();
  await waitFor(SEARCH_BOX_SELECTOR);
  await expectVeEvents([
    veKeyDown(''),
    veImpressionsUnder('Panel: elements', [veImpression(
                                              'Toolbar', 'search',
                                              [
                                                veImpression('Action: close-search'),
                                                veImpression('Action: select-next'),
                                                veImpression('Action: select-previous'),
                                                veImpression('TextField: search'),
                                              ])]),
  ]);
};

export const assertSearchResultMatchesText = async (text: string) => {
  await waitForFunction(async () => {
    return await getTextContent(SEARCH_RESULTS_MATCHES) === text;
  });
};

export const goToResourceAndWaitForStyleSection = async (path: string) => {
  await goToResource(path);
  await waitForElementsStyleSection();

  // Check to make sure we have the correct node selected after opening a file.
  await waitForPartialContentOfSelectedElementsNode('<body>\u200B');
};

export const checkStyleAttributes = async (expectedStyles: string[]) => {
  const result = await $$(STYLE_PROPERTIES_SELECTOR, undefined, 'pierce');
  const actual = await Promise.all(result.map(e => e.evaluate(e => e.textContent?.trim())));
  return actual.sort().join(' ') === expectedStyles.sort().join(' ');
};
