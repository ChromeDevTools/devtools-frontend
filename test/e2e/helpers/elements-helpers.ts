// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {
  $$,
  clickMoreTabsButton,
  getTextContent,
  step,
  summonSearchBox,
  waitForFunction,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {openSubMenu} from './context-menu-helpers.js';
import {
  expectVeEvents,
  veChange,
  veClick,
  veImpression,
  veImpressionForElementsPanel,
  veImpressionsUnder,
  veKeyDown,
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
const ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR = `${LAYOUT_PANE_TABPANEL_SELECTOR} .elements devtools-checkbox`;
const ELEMENT_STYLE_SECTION_SELECTOR = '[aria-label="element.style, css selector"]';
const STYLE_QUERY_RULE_TEXT_SELECTOR = '.query-text';
export const STYLE_PROPERTIES_SELECTOR = '.tree-outline-disclosure [role="treeitem"]';
const CSS_AUTHORING_HINTS_ICON_SELECTOR = '.hint';
export const SEARCH_BOX_SELECTOR = '.search-bar';
const SEARCH_RESULTS_MATCHES = '.search-results-matches';
export const EMULATE_FOCUSED_PAGE = 'Emulate a focused page';
const DOM_BREAKPOINTS_SECTION_SELECTOR = '[aria-label="DOM Breakpoints"]';
const DOM_BREAKPOINTS_LIST_SELECTOR = '[aria-label="DOM Breakpoints list"]';

export const openLayoutPane = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(LAYOUT_PANE_TAB_SELECTOR);
  const panel = await devToolsPage.waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
  await devToolsPage.waitFor('.elements', panel);
  await expectVeEvents(
      [
        veClick('Panel: elements > Toolbar: sidebar > PanelTabHeader: elements.layout'),
        veImpressionsUnder(
            'Panel: elements',
            [veImpression(
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
                  veImpression('Section', 'grid-overlays', [veImpression('Item', undefined, [
                                veImpression('Action', 'elements.select-element'),
                                veImpression('ShowStyleEditor', 'color'),
                                veImpression('Toggle'),
                              ])]),
                ])]),
      ],
      undefined, devToolsPage);
};

export const waitForAdorners = async (
    expectedAdorners: Array<{textContent: string, isActive: boolean}>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const actualAdorners = await devToolsPage.$$(ADORNER_SELECTOR);
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
        [veImpressionsUnder('Panel: elements >  Tree: elements > TreeItem', [veImpression('Adorner', 'grid')])],
        undefined, devToolsPage);
  }
};

export const toggleAdornerSetting =
    async (type: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await openSubMenu(SELECTED_TREE_ELEMENT_SELECTOR, 'Badge settings', devToolsPage);

  const adornerToggle = await Promise.any([
    devToolsPage.waitFor(`[aria-label="${type}, unchecked"]`), devToolsPage.waitFor(`[aria-label="${type}, checked"]`)
  ]);
  await adornerToggle.click();
  await expectVeEvents([veClick(`Menu > Toggle: ${type}`)], undefined, devToolsPage);
};

export const waitForSelectedNodeToBeExpanded =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR}[aria-expanded="true"]`);
};

export const waitForAdornerOnSelectedNode =
    async (expectedAdornerText: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const adorner = await devToolsPage.waitFor(ADORNER_SELECTOR, selectedNode);
    return expectedAdornerText === await adorner.evaluate(node => node.textContent);
  });
  await expectVeEvents(
      [veImpressionsUnder(
          'Panel: elements > Tree: elements > TreeItem', [veImpression('Adorner', expectedAdornerText)])],
      undefined, devToolsPage);
};

export const waitForNoAdornersOnSelectedNode =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  await devToolsPage.waitForNone(ADORNER_SELECTOR, selectedNode);
};

export const toggleElementCheckboxInLayoutPane =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR);
  await expectVeEvents(
      [veClick('Panel: elements > Pane: layout > Section: grid-overlays > Item > Toggle')], undefined, devToolsPage);
};

export const getGridsInLayoutPane = async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const panel = await devToolsPage.waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
  return await devToolsPage.$$('.elements .element', panel);
};

export const waitForSomeGridsInLayoutPane =
    async (minimumGridCount: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const grids = await getGridsInLayoutPane(devToolsPage);
    return grids.length >= minimumGridCount;
  });
  await expectVeEvents(
      [veImpressionsUnder(
          'Panel: elements > Pane: layout > Section: grid-overlays',
          [veImpression(
              'Item', undefined,
              [
                veImpression('Action', 'elements.select-element'),
                veImpression('ShowStyleEditor', 'color'),
                veImpression('Toggle'),
              ])])],
      undefined, devToolsPage);
};

export const waitForContentOfSelectedElementsNode =
    async (expectedTextContent: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode(devToolsPage);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForPartialContentOfSelectedElementsNode =
    async (expectedPartialTextContent: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode(devToolsPage);
    return selectedTextContent.includes(expectedPartialTextContent);
  });
};

/**
 * Gets the text content of the currently selected element.
 */
export const getContentOfSelectedNode = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  return await selectedNode.evaluate(node => node.textContent as string);
};

export const waitForSelectedNodeChange = async (
    initialValue: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage, asyncScope = new AsyncScope()) => {
  await devToolsPage.waitForFunction(async () => {
    const currentContent = await getContentOfSelectedNode(devToolsPage);
    return currentContent !== initialValue;
  }, asyncScope);
};

export const assertSelectedElementsNodeTextIncludes =
    async (expectedTextContent: string, devtoolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const selectedNode = await devtoolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent as string);
  assert.include(selectedTextContent, expectedTextContent);
};

export const waitForSelectedTreeElementSelectorWithTextcontent =
    async (expectedTextContent: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForSelectedTreeElementSelectorWhichIncludesText =
    async (expectedTextContent: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent?.includes(expectedTextContent);
  });
};

export const waitForChildrenOfSelectedElementNode =
    async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li`);
};

export const waitForAndClickTreeElementWithPartialText = async (text: string, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  await devToolsPage.waitForFunction(async () => await clickTreeElementWithPartialText(text, devToolsPage));
};

export const waitForElementWithPartialText =
    async (text: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return await devToolsPage.waitForFunction(async () => await elementWithPartialText(text, devToolsPage));
};

const elementWithPartialText =
    async (text: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const tree = await devToolsPage.waitFor('Page DOM[role="tree"]', undefined, undefined, 'aria');
  const elements = await devToolsPage.$$('[role="treeitem"]', tree, 'aria');
  for (const handle of elements) {
    const match = await handle.evaluate((element, text) => element.textContent?.includes(text), text);
    if (match) {
      return handle;
    }
  }
  return null;
};

export const clickTreeElementWithPartialText = async (text: string, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const handle = await elementWithPartialText(text, devToolsPage);
  if (handle) {
    await devToolsPage.clickElement(handle);
    await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')], undefined, devToolsPage);
    return true;
  }

  return false;
};

export const clickNthChildOfSelectedElementNode =
    async (childIndex: number, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  assert(childIndex > 0, 'CSS :nth-child() selector indices are 1-based.');
  await devToolsPage.click(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li:nth-child(${childIndex})`);
  await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')], undefined, devToolsPage);
};

export const focusElementsTree = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click(SELECTED_TREE_ELEMENT_SELECTOR);
  await expectVeEvents([veClick('Panel: elements > Tree: elements > TreeItem')], undefined, devToolsPage);
};

export const navigateToSidePane = async (paneName: string, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  if ((await $$(`[aria-label="${paneName} panel"]`, undefined, undefined, devToolsPage)).length) {
    return;
  }
  await devToolsPage.click(`[aria-label="${paneName}"]`);
  await devToolsPage.waitFor(`[aria-label="${paneName} panel"]`);
  const jslogContext = paneName.toLowerCase();
  await expectVeEvents(
      [
        veClick(`Panel: elements > Toolbar: sidebar > PanelTabHeader: ${jslogContext}`),
        veImpressionsUnder('Panel: elements', [veImpression('Pane', jslogContext)]),
      ],
      undefined, devToolsPage);
};

export const waitForElementsStyleSection =
    async (expectedNodeText: string|null = '<body', devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // Wait for the file to be loaded and selectors to be shown
  await devToolsPage.waitFor('.styles-selector');
  await expectVeEvents(
      [veImpressionsUnder('Panel: elements', [veImpression('Pane', 'styles')])], undefined, devToolsPage);

  // Check to make sure we have the correct node selected after opening a file.
  if (expectedNodeText) {
    await waitForPartialContentOfSelectedElementsNode(expectedNodeText, devToolsPage);
  }
};

export const waitForElementsDOMBreakpointsSection =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  let domBreakpointsPane = await devToolsPage.$('DOM Breakpoints', undefined, 'aria');
  if (!domBreakpointsPane) {
    const elementsPanel = await devToolsPage.waitForAria('Elements panel');
    await clickMoreTabsButton(elementsPanel, devToolsPage);
    domBreakpointsPane = await devToolsPage.waitForAria('DOM Breakpoints');
  }
  await devToolsPage.click(DOM_BREAKPOINTS_SECTION_SELECTOR);
  await devToolsPage.waitFor(DOM_BREAKPOINTS_LIST_SELECTOR);
};

export async function getDOMBreakpoints(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.$('.breakpoint-entry');
}

export const isDOMBreakpointEnabled = async (
    breakpoint: puppeteer.ElementHandle<Element>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const checkbox = await devToolsPage.waitFor('input[type="checkbox"]', breakpoint);
  return await checkbox!.evaluate(node => (node as HTMLInputElement).checked);
};

export const setDOMBreakpointOnSelectedNode =
    async (type: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await openSubMenu(SELECTED_TREE_ELEMENT_SELECTOR, 'Break on', devToolsPage);
  const breakpointToggle = await devToolsPage.waitFor(`[aria-label="${type}, unchecked"]`);
  await breakpointToggle.click();
};

export const toggleDOMBreakpointCheckbox = async (
    breakpoint: puppeteer.ElementHandle<Element>, wantChecked: boolean,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const checkbox = await devToolsPage.waitFor('input[type="checkbox"]', breakpoint);
  const checked = await checkbox!.evaluate(box => (box as HTMLInputElement).checked);
  if (checked !== wantChecked) {
    await checkbox!.click();
  }
  assert.strictEqual(await checkbox!.evaluate(box => (box as HTMLInputElement).checked), wantChecked);
};

export const waitForElementsComputedSection = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  await devToolsPage.waitFor(COMPUTED_PROPERTY_SELECTOR);
  await expectVeEvents(
      [veImpressionsUnder('Panel: elements', [veImpression('Pane', 'computed')])], undefined, devToolsPage);
};

export const getContentOfComputedPane = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const pane = await devToolsPage.waitFor('Computed panel', undefined, undefined, 'aria');
  const tree = await devToolsPage.waitFor('[role="tree"]', pane, undefined, 'aria');
  return await tree.evaluate(node => node.textContent as string);
};

export const waitForComputedPaneChange = async (initialValue: string, devToolsPage: DevToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const value = await getContentOfComputedPane(devToolsPage);
    return value !== initialValue;
  });
};

export const getAllPropertiesFromComputedPane = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const properties = await devToolsPage.$$(COMPUTED_PROPERTY_SELECTOR);
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
      .filter(prop => !!prop);
};

export const getPropertyFromComputedPane =
    async (name: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const properties = await devToolsPage.$$(COMPUTED_PROPERTY_SELECTOR);
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

export const expandSelectedNodeRecursively = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const EXPAND_RECURSIVELY = '[aria-label="Expand recursively"]';

  // Find the selected node, right click.
  await devToolsPage.click(SELECTED_TREE_ELEMENT_SELECTOR, {clickOptions: {button: 'right'}});

  // Wait for the 'expand recursively' option, and click it.
  await devToolsPage.click(EXPAND_RECURSIVELY);
  await expectVeEvents(
      [
        veClick('Panel: elements > Tree: elements > TreeItem'),
        veImpressionForSelectedNodeMenu(await getContentOfSelectedNode(devToolsPage)),
        veClick('Panel: elements > Tree: elements > TreeItem > Menu > Action: expand-recursively'),
      ],
      undefined, devToolsPage);
};

export const findElementById = async (id: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.pressKey('f', {control: true});
  await devToolsPage.waitFor('.search-bar:not(.hidden)');
  await devToolsPage.typeText('#' + id);
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor(`.highlight > .webkit-html-tag[aria-label*="\\"${id}\\"`);
  await devToolsPage.pressKey('Escape');
  await devToolsPage.waitFor('.search-bar.hidden');
};

function veImpressionForSelectedNodeMenu(content: string) {
  const isPeudoElement = content.startsWith('::');
  if (isPeudoElement) {
    return veImpressionsUnder('Panel: elements > Tree: elements > TreeItem', [veImpression('Menu', undefined, [
                                veImpression('Action', 'expand-recursively'),
                                veImpression('Action', 'scroll-into-view'),
                                veImpression('Item', 'show-adorner-settings'),
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
                              veImpression('Item', 'show-adorner-settings'),
                              veImpression('Action', 'store-as-global-variable'),
                              veImpression('Item', 'break-on'),
                              veImpression('Item', 'copy'),
                              veImpression('Item', 'force-state'),
                              veImpression('Toggle', 'elements.hide-element'),
                            ])]);
}

export const showForceState =
    async (specificStates?: boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // Check if it is already visible
  if (!(await devToolsPage.$(EMULATE_FOCUSED_PAGE, undefined, 'aria'))) {
    await devToolsPage.click('[aria-label="Toggle Element State"]');
    await devToolsPage.waitForAria(EMULATE_FOCUSED_PAGE);
  }

  if (specificStates) {
    const specificStatesPane = await devToolsPage.waitFor('.specific-pseudo-states');
    if (!(await specificStatesPane.evaluate(node => node.checkVisibility()))) {
      await devToolsPage.click('.force-specific-element-header');
      await devToolsPage.waitForVisible('.specific-pseudo-states');
    }
  }
};

export const forcePseudoState =
    async (pseudoState: string, specificStates?: boolean, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  // Open element & page state pane and wait for it to be loaded asynchronously
  await showForceState(specificStates, devToolsPage);

  const stateEl = await devToolsPage.waitForAria(pseudoState);
  await stateEl.click();
  await expectVeEvents(
      [
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
      ],
      undefined, devToolsPage);
};

export const removePseudoState =
    async (pseudoState: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const stateEl = await devToolsPage.waitForAria(pseudoState);
  await stateEl.click();
  await expectVeEvents(
      [
        veChange(`Panel: elements > Pane: styles > Pane: element-states > Toggle: ${
            pseudoState === EMULATE_FOCUSED_PAGE ? 'emulate-page-focus' : pseudoState.substr(1)}`),
      ],
      undefined, devToolsPage);
};

export const getComputedStylesForDomNode = async (
    elementSelector: string, styleAttribute: keyof CSSStyleDeclaration,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  return await inspectedPage.evaluate((elementSelector, styleAttribute) => {
    const element = document.querySelector(elementSelector);
    if (!element) {
      throw new Error(`${elementSelector} could not be found`);
    }
    return getComputedStyle(element)[styleAttribute];
  }, elementSelector, styleAttribute);
};

export const waitForNumberOfComputedProperties = async (numberToWaitFor: number, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const computedPane = await getComputedPanel(devToolsPage);
  return await devToolsPage.waitForFunction(
      async () => numberToWaitFor ===
          await computedPane.$$eval('pierce/' + COMPUTED_PROPERTY_SELECTOR, properties => properties.length));
};

export const getComputedPanel = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  return await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
};

export const filterComputedProperties = async (filterString: string, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const initialContent = await getContentOfComputedPane(devToolsPage);

  const computedPanel = await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await devToolsPage.click('[aria-label="Filter"]', {
    root: computedPanel,
  });
  await devToolsPage.typeText(filterString);
  await waitForComputedPaneChange(initialContent, devToolsPage);
  await expectVeEvents([veChange('Panel: elements > Pane: computed > TextField: filter')], undefined, devToolsPage);
};

export const toggleShowAllComputedProperties = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const initialContent = await getContentOfComputedPane(devToolsPage);

  const computedPanel = await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await devToolsPage.click(COMPUTED_STYLES_SHOW_ALL_SELECTOR, {root: computedPanel});
  await waitForComputedPaneChange(initialContent, devToolsPage);
  await expectVeEvents(
      [veChange('Panel: elements > Pane: computed > Toggle: show-inherited-computed-style-properties')], undefined,
      devToolsPage);
};

export const waitForDomNodeToBeVisible =
    async (elementSelector: string, inspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  // DevTools will force Blink to make the hover shown, so we have
  // to wait for the element to be DOM-visible (e.g. no `display: none;`)
  await inspectedPage.waitForSelector(elementSelector, {visible: true});
};

export const waitForDomNodeToBeHidden =
    async (elementSelector: string, inspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  await inspectedPage.waitForSelector(elementSelector, {hidden: true});
};

export const assertGutterDecorationForDomNodeExists =
    async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitFor('.elements-gutter-decoration');
};

export const getStyleRuleSelector = (selector: string) => `[aria-label="${selector}, css selector"]`;

export const waitForExactStyleRule =
    async (expectedSelector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.waitForFunction(async () => {
    const rules = await getDisplayedStyleRules(devToolsPage);
    return rules.find(rule => rule.selectorText === expectedSelector);
  });
};

export const waitForStyleRule = async (expectedSelector: string, devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  await devToolsPage.waitForFunction(async () => {
    const rules = await getDisplayedStyleRules(devToolsPage);
    return rules.map(rule => rule.selectorText).includes(expectedSelector);
  });
};

export const getComputedStyleProperties = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const computedPanel = await getComputedPanel(devToolsPage);
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

export const getDisplayedCSSDeclarations = async (devtoolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const cssDeclarations = await devtoolsPage.$$(CSS_DECLARATION_SELECTOR);
  return await Promise.all(cssDeclarations.map(async node => await node.evaluate(n => n.textContent?.trim())));
};

export const getDisplayedStyleRulesCompact = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const compactRules = [];
  for (const rule of await getDisplayedStyleRules(devToolsPage)) {
    compactRules.push(
        {selectorText: rule.selectorText, propertyNames: rule.propertyData.map(data => data.propertyName)});
  }
  return compactRules;
};

export const getDisplayedStyleRules = async (devToolsPage?: DevToolsPage) => {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const allRuleSelectors = await devToolsPage.$$(CSS_STYLE_RULE_SELECTOR);
  const rules = [];
  for (const ruleSelector of allRuleSelectors) {
    const propertyData = await getDisplayedCSSPropertyData(ruleSelector, devToolsPage);
    const selectorText = await ruleSelector.evaluate(node => {
      const attribute = node.getAttribute('aria-label') || '';
      return attribute.substring(0, attribute.lastIndexOf(', css selector'));
    });
    rules.push({selectorText, propertyData});
  }

  return rules;
};

/**
 * @param propertiesSection The element containing this properties section.
 * @returns an array with an entry for each property in the section. Each entry has:
 * - propertyName: The name of this property.
 * - isOverloaded: True if this is an inherited properties section, and this property is overloaded by a child node.
 *                 The property will be shown as crossed out in the style pane.
 * - isInherited: True if this is an inherited properties section, and this property is a non-inherited CSS property.
 *                The property will be shown as grayed-out in the style pane.
 */
export const getDisplayedCSSPropertyData = async (
    propertiesSection: puppeteer.ElementHandle<Element>, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const cssPropertyNames = await devToolsPage.$$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesData = (await Promise.all(cssPropertyNames.map(
                                 async node => {
                                   return {
                                     propertyName: await node.evaluate(n => n.textContent),
                                     isOverLoaded: await node.evaluate(n => n.parentElement?.matches('.overloaded')),
                                     isInherited: await node.evaluate(n => n.parentElement?.matches('.inherited')),
                                   };
                                 },
                                 )))
                                .filter(c => !!c.propertyName);
  return propertyNamesData;
};

export const getDisplayedCSSPropertyNames = async (
    propertiesSection: puppeteer.ElementHandle<Element>, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const cssPropertyNames = await devToolsPage.$$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = (await Promise.all(cssPropertyNames.map(
                                 node => node.evaluate(n => n.textContent),
                                 )))
                                .filter(c => !!c);
  return propertyNamesText;
};

export const getStyleRule = (selector: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  return devToolsPage.waitFor(getStyleRuleSelector(selector));
};

export const getStyleRuleWithSourcePosition =
    (styleSelector: string, sourcePosition?: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
      if (!sourcePosition) {
        return getStyleRule(styleSelector, devToolsPage);
      }
      const selector = getStyleRuleSelector(styleSelector);
      return devToolsPage.waitForFunction(async () => {
        const candidate = await devToolsPage.waitFor(selector);
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

export const getColorSwatch = async (
    parent: puppeteer.ElementHandle<Element>|undefined, index: number,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const swatches = await devToolsPage.$$(COLOR_SWATCH_SELECTOR, parent);
  return swatches[index];
};

export const getColorSwatchColor = async (
    parent: puppeteer.ElementHandle<Element>, index: number,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const swatch = await getColorSwatch(parent, index, devToolsPage);
  return await swatch.evaluate(node => (node as HTMLElement).style.backgroundColor);
};

export const shiftClickColorSwatch = async (
    parent: puppeteer.ElementHandle<Element>, index: number, parentVe: string,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const swatch = await getColorSwatch(parent, index, devToolsPage);
  await devToolsPage.page.keyboard.down('Shift');
  await devToolsPage.clickElement(swatch);
  await devToolsPage.page.keyboard.up('Shift');
  await expectVeEvents(
      [
        veClick(`${parentVe} > ShowStyleEditor: color`),
        veImpressionsUnder(
            `${parentVe} > ShowStyleEditor: color`,
            [veImpression(
                'Menu', undefined, [veImpression('Action', 'clipped-color'), veImpression('Item', 'color')])]),
      ],
      undefined, devToolsPage);
};

export const getElementStyleFontEditorButton = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const section = await devToolsPage.waitFor(ELEMENT_STYLE_SECTION_SELECTOR);
  const result = await devToolsPage.$(FONT_EDITOR_SELECTOR, section);
  await expectVeEvents(
      [veImpressionsUnder(
          'Panel: elements > Pane: styles > Section: style-properties', [veImpression('Action', 'font-editor')])],
      undefined, devToolsPage);
  return result;
};

export const getFontEditorButtons = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const buttons = await devToolsPage.$$(FONT_EDITOR_SELECTOR);
  return buttons;
};

export const getHiddenFontEditorButtons = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const buttons = await devToolsPage.$$(HIDDEN_FONT_EDITOR_SELECTOR);
  return buttons;
};

export const getStyleSectionSubtitles = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const subtitles = await devToolsPage.$$(SECTION_SUBTITLE_SELECTOR);
  return await Promise.all(subtitles.map(node => node.evaluate(n => n.textContent)));
};

export const getCSSPropertyInRule = async (
    ruleSection: puppeteer.ElementHandle<Element>|string, name: string, sourcePosition?: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  if (typeof ruleSection === 'string') {
    ruleSection = await getStyleRuleWithSourcePosition(ruleSection, sourcePosition, devToolsPage);
  }

  const propertyNames = await devToolsPage.$$(CSS_PROPERTY_NAME_SELECTOR, ruleSection);
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

export const focusCSSPropertyValue =
    async (selector: string, propertyName: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await waitForStyleRule(selector, devToolsPage);
  await devToolsPage.timeout(100);
  let property = await getCSSPropertyInRule(selector, propertyName, undefined, devToolsPage);
  assert.isOk(property, `Could not find property ${propertyName} in rule ${selector}`);
  // Clicking on the semicolon element to make sure we don't hit the swatch or other
  // non-editable elements.
  await devToolsPage.click(CSS_PROPERTY_VALUE_SELECTOR + ' + .styles-semicolon', {root: property});
  await devToolsPage.waitForFunction(async () => {
    property = await getCSSPropertyInRule(selector, propertyName, undefined, devToolsPage);
    const value = property ? await devToolsPage.$(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    assert.isOk(value, `Could not find property ${propertyName} in rule ${selector}`);
    return await value.evaluate(node => {
      return node.classList.contains('text-prompt') && node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents(
      [veClick(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
          propertyName.startsWith('--') ? 'custom-property' : propertyName}`)],
      undefined, devToolsPage);
};

/**
 * Edit a CSS property value in a given rule
 * @param selector The selector of the rule to be updated. Note that because of the way the Styles populates, it is
 * important to provide a rule selector that is unique here, to avoid editing a property in the wrong rule.
 * @param propertyName The name of the property to be found and edited. If several properties have the same names, the
 * first one is edited.
 * @param newValue The new value to be used.
 */
export async function editCSSProperty(
    selector: string, propertyName: string, newValue: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await focusCSSPropertyValue(selector, propertyName, devToolsPage);

  await devToolsPage.typeText(newValue, {delay: 100});
  await devToolsPage.pressKey('Enter');

  await devToolsPage.waitForFunction(async () => {
    // Wait until the value element is not a text-prompt anymore.
    const property = await getCSSPropertyInRule(selector, propertyName, undefined, devToolsPage);
    const value = property ? await devToolsPage.$(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    assert.isOk(value, `Could not find property ${propertyName} in rule ${selector}`);
    return await value.evaluate(node => {
      return !node.classList.contains('text-prompt') && !node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents(
      [veChange(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
          propertyName.startsWith('--') ? 'custom-property' : propertyName} > Value`)],
      undefined, devToolsPage);
}

// Edit a media or container query rule text for the given styles section
export async function editQueryRuleText(
    queryStylesSections: puppeteer.ElementHandle<Element>, newQueryText: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(STYLE_QUERY_RULE_TEXT_SELECTOR, {root: queryStylesSections});
  // TODO: it should actually wait for rendering to finish.
  await devToolsPage.drainTaskQueue();
  await devToolsPage.waitForFunction(async () => {
    // Wait until the value element has been marked as a text-prompt.
    const queryText = await devToolsPage.$(STYLE_QUERY_RULE_TEXT_SELECTOR, queryStylesSections);
    assert.isOk(queryText, 'Could not find any query in the given styles section');
    const check = await queryText.evaluate(node => {
      return node.classList.contains('being-edited') && node.hasAttribute('contenteditable');
    });
    return check;
  });
  await devToolsPage.typeText(newQueryText);
  await devToolsPage.pressKey('Enter');

  // TODO: it should actually wait for rendering to finish.
  await devToolsPage.drainTaskQueue();

  await devToolsPage.waitForFunction(async () => {
    // Wait until the value element is not a text-prompt anymore.
    const queryText = await devToolsPage.$(STYLE_QUERY_RULE_TEXT_SELECTOR, queryStylesSections);
    assert.isOk(queryText, 'Could not find any query in the given styles section');
    const check = await queryText.evaluate(node => {
      return !node.classList.contains('being-edited') && !node.hasAttribute('contenteditable');
    });
    return check;
  });
  await expectVeEvents(
      [
        veClick('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
        veChange('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
      ],
      undefined, devToolsPage);
}

export async function waitForCSSPropertyValue(
    selector: string, name: string, value: string, sourcePosition?: string,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return await devToolsPage.waitForFunction(async () => {
    const propertyHandle = await getCSSPropertyInRule(selector, name, sourcePosition, devToolsPage);
    if (!propertyHandle) {
      return undefined;
    }

    const valueHandle = await devToolsPage.$(CSS_PROPERTY_VALUE_SELECTOR, propertyHandle);
    if (!valueHandle) {
      return undefined;
    }

    const matches = await valueHandle.evaluate(
        (node, value) => ((node instanceof HTMLElement ? node.innerText : '') || node.textContent) === value, value);
    if (matches) {
      return valueHandle;
    }
    return undefined;
  });
}

export async function waitForPropertyToHighlight(
    ruleSelector: string, propertyName: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const property = await getCSSPropertyInRule(ruleSelector, propertyName, undefined, devToolsPage);
    assert.isOk(property, `Could not find property ${propertyName} in rule ${ruleSelector}`);
    // StylePropertyHighlighter temporarily highlights the property using the Web Animations API, so the only way to
    // know it's happening is by listing all animations.
    const animationCount = await property.evaluate(node => (node as HTMLElement).getAnimations().length);
    return animationCount > 0;
  });
}

export const getBreadcrumbsTextContent = async (
    {expectedNodeCount}: {expectedNodeCount: number}, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const crumbsSelector = 'li.crumb > a > devtools-node-text';
  await devToolsPage.waitForFunction(async () => {
    const crumbs = await devToolsPage.$$(crumbsSelector);
    return crumbs.length === expectedNodeCount;
  });

  const crumbs = await devToolsPage.$$(crumbsSelector);
  const crumbsAsText: string[] = await Promise.all(crumbs.map(node => node.evaluate(node => {
    if (!node.shadowRoot) {
      throw new Error('Found breadcrumbs node that unexpectedly has no shadowRoot.');
    }
    return Array.from(node.shadowRoot.querySelectorAll('span') || []).map(span => span.textContent).join('');
  })));

  return crumbsAsText;
};

export const getSelectedBreadcrumbTextContent = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const selectedCrumb = await devToolsPage.waitFor('li.crumb.selected > a > devtools-node-text');
  const text = selectedCrumb.evaluate(node => {
    if (!node.shadowRoot) {
      throw new Error('Found breadcrumbs node that unexpectedly has no shadowRoot.');
    }
    return Array.from(node.shadowRoot.querySelectorAll('span') || []).map(span => span.textContent).join('');
  });
  return await text;
};

export const navigateToElementsTab = async (devtoolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  if ((await devtoolsPage.$$(ELEMENTS_PANEL_SELECTOR)).length) {
    return;
  }
  // Open Elements panel
  await devtoolsPage.click('#tab-elements');
  await devtoolsPage.waitFor(ELEMENTS_PANEL_SELECTOR);
  await expectVeEvents([veImpressionForElementsPanel()], undefined, devtoolsPage);
};

export const clickOnFirstLinkInStylesPanel = async (devToolsPage: DevToolsPage) => {
  const stylesPane = await devToolsPage.waitFor('div.styles-pane');
  await devToolsPage.click('div.styles-section-subtitle button.devtools-link', {root: stylesPane});
  await expectVeEvents(
      [veClick('Panel: elements > Pane: styles > Section: style-properties > Link: css-location')],
      undefined,
      devToolsPage,
  );
};

export const toggleClassesPane = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.click(CLS_BUTTON_SELECTOR);
  // animation happening here
  await expectVeEvents(
      [
        veClick('Panel: elements > Pane: styles > ToggleSubpane: elements-classes'),
        veImpressionsUnder(
            'Panel: elements > Pane: styles', [veImpression('Pane', 'elements-classes', [veImpression('TextField')])]),
      ],
      undefined, devToolsPage);
};

export const typeInClassesPaneInput = async (
    text: string, devToolsPage: DevToolsPage, commitWith: puppeteer.KeyInput = 'Enter', waitForNodeChange = true) => {
  await step(`Typing in new class names ${text}`, async () => {
    const clsInput = await devToolsPage.waitFor(CLS_INPUT_SELECTOR);
    await clsInput.type(text, {delay: 50});
  });

  if (commitWith) {
    await step(`Committing the changes with ${commitWith}`, async () => {
      await devToolsPage.page.keyboard.press(commitWith);
    });
  }

  if (waitForNodeChange) {
    // Make sure the classes provided in text can be found in the selected element's content. This is important as the
    // cls pane applies classes as you type, so it is not enough to wait for the selected node to change just once.
    await step('Waiting for the selected node to change', async () => {
      await devToolsPage.waitForFunction(async () => {
        const nodeContent = await getContentOfSelectedNode(devToolsPage);
        return text.split(' ').every(cls => nodeContent.includes(cls));
      });
    });
  }
  await expectVeEvents(
      [veChange('Panel: elements > Pane: styles > Pane: elements-classes > TextField')], undefined, devToolsPage);
};

export const toggleClassesPaneCheckbox =
    async (checkboxLabel: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const initialValue = await getContentOfSelectedNode(devToolsPage);

  const classesPane = await devToolsPage.waitFor(CLS_PANE_SELECTOR);
  await devToolsPage.click(`[title="${checkboxLabel}"]`, {root: classesPane});

  const nodeChange = waitForSelectedNodeChange(initialValue, devToolsPage);
  const veEvents = expectVeEvents(
      [veChange('Panel: elements > Pane: styles > Pane: elements-classes > Toggle: element-class')], undefined,
      devToolsPage);
  await Promise.all([nodeChange, veEvents]);
};

export const uncheckStylesPaneCheckbox =
    async (checkboxLabel: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  console.error('uncheckStylesPaneCheckbox', checkboxLabel);
  const initialValue = await getContentOfSelectedNode(devToolsPage);
  await devToolsPage.click(`.enabled-button[aria-label="${checkboxLabel}"]`);
  await waitForSelectedNodeChange(initialValue, devToolsPage);
  await expectVeEvents(
      [veClick(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
          checkboxLabel.split(' ')[0]} > Toggle`)],
      undefined, devToolsPage);
};

export const assertSelectedNodeClasses =
    async (expectedClasses: string[], devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const nodeText = await getContentOfSelectedNode(devToolsPage);
  const match = nodeText.match(/class=\u200B"([^"]*)/);
  const classText = match ? match[1] : '';
  const classes = classText.split(/[\s]/).map(className => className.trim()).filter(className => className.length);

  assert.strictEqual(
      classes.length, expectedClasses.length, 'Did not find the expected number of classes on the element');

  for (const expectedClass of expectedClasses) {
    assert.include(classes, expectedClass, `Could not find class ${expectedClass} on the element`);
  }
};

export const toggleAccessibilityPane = async (devToolsPage: DevToolsPage) => {
  let a11yPane = await devToolsPage.$('Accessibility', undefined, 'aria');
  if (!a11yPane) {
    const elementsPanel = await devToolsPage.waitForAria('Elements panel');
    await devToolsPage.clickMoreTabsButton(elementsPanel);
    a11yPane = await devToolsPage.waitForAria('Accessibility');
    await expectVeEvents(
        [
          veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs'),
          veImpressionsUnder(
              'Panel: elements > Toolbar: sidebar > DropDown: more-tabs',
              [veImpression('Menu', undefined, [veImpression('Action', 'accessibility.view')])]),
        ],
        undefined, devToolsPage);
  }
  await devToolsPage.click('aria/Accessibility');
  await devToolsPage.waitFor('.source-order-checkbox');
  await expectVeEvents(
      [
        veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs > Menu > Action: accessibility.view'),
        veImpressionsUnder(
            'Panel: elements > Toolbar: sidebar', [veImpression('PanelTabHeader', 'accessibility.view')]),
        veImpressionForAccessibilityPane(),
      ],
      undefined, devToolsPage);
};

function veImpressionForAccessibilityPane() {
  return veImpressionsUnder(
      'Panel: elements', [veImpression('Pane', 'sidebar', [
        veImpression('SectionHeader', 'accessibility-tree'),
        veImpression(
            'Section', 'accessibility-tree',
            [
              veImpression('Toggle', 'full-accessibility-tree'),
            ]),
        veImpression('SectionHeader', 'aria-attributes'),
        veImpression('Section', 'aria-attributes'),
        veImpression('SectionHeader', 'computed-properties'),
        veImpression('Section', 'computed-properties', [veImpression('Tree', undefined, [veImpression('TreeItem')])]),
        veImpression('SectionHeader', 'source-order-viewer'),
        veImpression('Section', 'source-order-viewer', [veImpression('Toggle')]),
      ])]);
}

export const toggleAccessibilityTree = async (devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await devToolsPage.click('aria/Switch to Accessibility Tree view');
  await expectVeEvents([veClick('Panel: elements > Action: toggle-accessibility-tree')], undefined, devToolsPage);
};

export const getPropertiesWithHints =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const allRuleSelectors = await devToolsPage.$$(CSS_STYLE_RULE_SELECTOR);

  const propertiesWithHints = [];
  for (const propertiesSection of allRuleSelectors) {
    const cssRuleNodes = await devToolsPage.$$('li ', propertiesSection);

    for (const cssRuleNode of cssRuleNodes) {
      const propertyNode = await devToolsPage.$(CSS_PROPERTY_NAME_SELECTOR, cssRuleNode);
      const propertyName = propertyNode !== null ? await propertyNode.evaluate(n => n.textContent) : null;
      if (propertyName === null) {
        continue;
      }

      const authoringHintsIcon = await devToolsPage.$(CSS_AUTHORING_HINTS_ICON_SELECTOR, cssRuleNode);
      if (authoringHintsIcon) {
        propertiesWithHints.push(propertyName);
      }
    }
  }

  return propertiesWithHints;
};

export const summonAndWaitForSearchBox =
    async (devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  await summonSearchBox(devToolsPage);
  await devToolsPage.waitFor(SEARCH_BOX_SELECTOR);
  await expectVeEvents(
      [
        veKeyDown(''),
        veImpressionsUnder('Panel: elements', [veImpression(
                                                  'Toolbar', 'search',
                                                  [
                                                    veImpression('Action: close-search'),
                                                    veImpression('Action: select-next'),
                                                    veImpression('Action: select-previous'),
                                                    veImpression('TextField: search'),
                                                  ])]),
      ],
      undefined, devToolsPage);
};

export const assertSearchResultMatchesText = async (text: string, devToolsPage?: DevToolsPage) => {
  await waitForFunction(async () => {
    return await getTextContent(SEARCH_RESULTS_MATCHES, undefined, devToolsPage) === text;
  }, undefined, undefined, devToolsPage);
};

export const goToResourceAndWaitForStyleSection = async (
    path: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) => {
  await inspectedPage.goToResource(path);
  await waitForElementsStyleSection(null, devToolsPage);
};

export const checkStyleAttributes =
    async (expectedStyles: string[], devToolsPage = getBrowserAndPagesWrappers().devToolsPage) => {
  const result = await devToolsPage.$$(STYLE_PROPERTIES_SELECTOR, undefined, 'pierce');
  const actual = await Promise.all(result.map(e => e.evaluate(e => e.textContent?.trim())));
  return actual.sort().join(' ') === expectedStyles.sort().join(' ');
};
