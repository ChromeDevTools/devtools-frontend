// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type * as Host from '../../../front_end/core/host/host.js';
import {AsyncScope} from '../../conductor/async-scope.js';
import {
  step,

} from '../../shared/helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

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
export const SECTION_SUBTITLE_SELECTOR = '.styles-section-subtitle';
const CLS_PANE_SELECTOR = '.styles-sidebar-toolbar-pane';
const CLS_BUTTON_SELECTOR = '[aria-label="Element Classes"]';
const CLS_INPUT_SELECTOR = '[aria-placeholder="Add new class"]';
const LAYOUT_PANE_TAB_SELECTOR = '[aria-label="Layout"]';
const LAYOUT_PANE_TABPANEL_SELECTOR = '[aria-label="Layout panel"]';
const ADORNER_SELECTOR = 'devtools-adorner';
export const INACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Enable grid mode"]';
export const ACTIVE_GRID_ADORNER_SELECTOR = '[aria-label="Disable grid mode"]';
export const INACTIVE_STARTING_STYLE_ADORNER_SELECTOR = '[aria-label="Enable @starting-style mode"]';
export const ACTIVE_STARTING_STYLE_ADORNER_SELECTOR = '[aria-label="Disable @starting-style mode"]';
const ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR = `${LAYOUT_PANE_TABPANEL_SELECTOR} .elements devtools-checkbox`;
const STYLE_QUERY_RULE_TEXT_SELECTOR = '.query-text';
export const STYLE_PROPERTIES_SELECTOR = '.tree-outline-disclosure [role="treeitem"]';
const CSS_AUTHORING_HINTS_ICON_SELECTOR = '.hint';
export const SEARCH_BOX_SELECTOR = '.search-bar';
const SEARCH_RESULTS_MATCHES = '.search-results-matches';
export const EMULATE_FOCUSED_PAGE = 'Emulate a focused page';
const DOM_BREAKPOINTS_SECTION_SELECTOR = '[aria-label="DOM breakpoints"]';
const DOM_BREAKPOINTS_LIST_SELECTOR = '[aria-label="DOM breakpoints list"]';
const TOGGLE_COMMON_RENDERING_EMULATIONS_SELECTOR = '[aria-label="Toggle common rendering emulations"]';

export const openLayoutPane = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.click(LAYOUT_PANE_TAB_SELECTOR);
  const panel = await devToolsPage.waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
  await devToolsPage.waitFor('.elements', panel);
  await expectVeEvents(
      devToolsPage, [
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
      undefined);
};

export const waitForAdorners =
    async (devToolsPage: DevToolsPage, expectedAdorners: Array<{textContent: string, isActive: boolean}>,
           activeSelector: string = ACTIVE_GRID_ADORNER_SELECTOR) => {
  await devToolsPage.waitForFunction(async () => {
    const actualAdorners = await devToolsPage.$$(ADORNER_SELECTOR);
    const actualAdornersStates = await Promise.all(actualAdorners.map(n => {
      return n.evaluate((node, activeSelector: string) => {
        return {textContent: node.textContent, isActive: node.matches(activeSelector)};
      }, activeSelector);
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
    await expectVeEvents(devToolsPage, [veImpressionsUnder('Panel: elements >  Tree: elements > TreeItem',
                                                           [veImpression('Adorner', 'grid')])],
                         undefined);
  }
};

export const toggleAdornerSetting = async (devToolsPage: DevToolsPage, type: string) => {
  await openSubMenu(devToolsPage, SELECTED_TREE_ELEMENT_SELECTOR, 'Badge settings');

  const adornerToggle = await Promise.any([
    devToolsPage.waitFor(`[aria-label="${type}, unchecked"]`),
    devToolsPage.waitFor(`[aria-label="${type}, checked"]`),
  ]);
  await adornerToggle.click();
  await expectVeEvents(devToolsPage, [veClick(`Menu > Toggle: ${type}`)], undefined);
};

export const waitForSelectedNodeToBeExpanded = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.waitFor(`${SELECTED_TREE_ELEMENT_SELECTOR}[aria-expanded="true"]`);
};

export const waitForAdornerOnSelectedNode = async (devToolsPage: DevToolsPage, expectedAdornerText: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const adorner = await devToolsPage.waitFor(ADORNER_SELECTOR, selectedNode);
    return expectedAdornerText === await adorner.evaluate(node => node.textContent);
  });
  await expectVeEvents(devToolsPage, [veImpressionsUnder('Panel: elements > Tree: elements > TreeItem',
                                                         [veImpression('Adorner', expectedAdornerText)])],
                       undefined);
};

export const waitForSpecificAdornerOnSelectedNode = async (devToolsPage: DevToolsPage, selector: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const adorner = await devToolsPage.waitFor(selector, selectedNode);
    return !!adorner;
  });
};

export const waitForNoAdornersOnSelectedNode = async (devToolsPage: DevToolsPage) => {
  const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  await devToolsPage.waitForNone(ADORNER_SELECTOR, selectedNode);
};

export const toggleElementCheckboxInLayoutPane = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.click(ELEMENT_CHECKBOX_IN_LAYOUT_PANE_SELECTOR);
  await expectVeEvents(devToolsPage,
                       [veClick('Panel: elements > Pane: layout > Section: grid-overlays > Item > Toggle')], undefined);
};

export const getGridsInLayoutPane = async (devToolsPage: DevToolsPage) => {
  const panel = await devToolsPage.waitFor(LAYOUT_PANE_TABPANEL_SELECTOR);
  return await devToolsPage.$$('.elements .element', panel);
};

export const waitForSomeGridsInLayoutPane = async (devToolsPage: DevToolsPage, minimumGridCount: number) => {
  await devToolsPage.waitForFunction(async () => {
    const grids = await getGridsInLayoutPane(devToolsPage);
    return grids.length >= minimumGridCount;
  });
  await expectVeEvents(devToolsPage,
                       [veImpressionsUnder('Panel: elements > Pane: layout > Section: grid-overlays',
                                           [veImpression('Item', undefined,
                                                         [
                                                           veImpression('Action', 'elements.select-element'),
                                                           veImpression('ShowStyleEditor', 'color'),
                                                           veImpression('Toggle'),
                                                         ])])],
                       undefined);
};

export const waitForContentOfSelectedElementsNode = async (devToolsPage: DevToolsPage, expectedTextContent: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode(devToolsPage);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForPartialContentOfSelectedElementsNode =
    async (devToolsPage: DevToolsPage, expectedPartialTextContent: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedTextContent = await getContentOfSelectedNode(devToolsPage);
    return selectedTextContent.includes(expectedPartialTextContent);
  });
};

/**
 * Gets the text content of the currently selected element.
 */
export const getContentOfSelectedNode = async (devToolsPage: DevToolsPage) => {
  const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  return await selectedNode.evaluate(node => node.textContent);
};

export const waitForSelectedNodeChange =
    async (devToolsPage: DevToolsPage, initialValue: string, asyncScope = new AsyncScope()) => {
  await devToolsPage.waitForFunction(async () => {
    const currentContent = await getContentOfSelectedNode(devToolsPage);
    return currentContent !== initialValue;
  }, asyncScope);
};

export const assertSelectedElementsNodeTextIncludes =
    async (devToolsPage: DevToolsPage, expectedTextContent: string) => {
  const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
  const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
  assert.include(selectedTextContent, expectedTextContent);
};

export const waitForSelectedTreeElementSelectorWithTextcontent =
    async (devToolsPage: DevToolsPage, expectedTextContent: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent === expectedTextContent;
  });
};

export const waitForSelectedTreeElementSelectorWhichIncludesText =
    async (devToolsPage: DevToolsPage, expectedTextContent: string) => {
  await devToolsPage.waitForFunction(async () => {
    const selectedNode = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR);
    const selectedTextContent = await selectedNode.evaluate(node => node.textContent);
    return selectedTextContent?.includes(expectedTextContent);
  });
};

export const waitForChildrenOfSelectedElementNode = async (devToolsPage: DevToolsPage, partialTexts?: string[]) => {
  return await devToolsPage.waitForFunction(async () => {
    const childrenContainer = await devToolsPage.waitFor(SELECTED_TREE_ELEMENT_SELECTOR + ' + ol');
    const children = await devToolsPage.$$('[role="treeitem"]', childrenContainer, 'aria');
    if (!partialTexts) {
      return children.length > 0;
    }
    if (children.length) {
      // Remove the close tag
      --children.length;
    }
    if (children.length !== partialTexts.length) {
      return false;
    }
    for (let i = 0; i < children.length; i++) {
      const match = await children[i].evaluate((element, text) => element.textContent?.includes(text), partialTexts[i]);
      if (!match) {
        return false;
      }
    }
    return true;
  });
};

export const waitForAndClickTreeElementWithPartialText = async (devToolsPage: DevToolsPage, text: string) => {
  await devToolsPage.waitForFunction(async () => await clickTreeElementWithPartialText(devToolsPage, text));
};

export const waitForElementWithPartialText = async (devToolsPage: DevToolsPage, text: string) => {
  return await devToolsPage.waitForFunction(async () => await elementWithPartialText(devToolsPage, text));
};

export const elementWithPartialText = async (devToolsPage: DevToolsPage, text: string) => {
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

export const clickTreeElementWithPartialText = async (devToolsPage: DevToolsPage, text: string) => {
  const handle = await elementWithPartialText(devToolsPage, text);
  if (handle) {
    await devToolsPage.clickElement(handle);
    await expectVeEvents(devToolsPage, [veClick('Panel: elements > Tree: elements > TreeItem')], undefined);
    return true;
  }

  return false;
};

export const clickNthChildOfSelectedElementNode = async (devToolsPage: DevToolsPage, childIndex: number) => {
  assert(childIndex > 0, 'CSS :nth-child() selector indices are 1-based.');
  await devToolsPage.click(`${SELECTED_TREE_ELEMENT_SELECTOR} + ol > li:nth-child(${childIndex})`);
  await expectVeEvents(devToolsPage, [veClick('Panel: elements > Tree: elements > TreeItem')], undefined);
};

export const focusElementsTree = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.click(SELECTED_TREE_ELEMENT_SELECTOR);
  await expectVeEvents(devToolsPage, [veClick('Panel: elements > Tree: elements > TreeItem')], undefined);
};

export const navigateToSidePane = async (devToolsPage: DevToolsPage, paneName: string) => {
  if ((await devToolsPage.$$(`[aria-label="${paneName} panel"]`)).length) {
    return;
  }
  await devToolsPage.click(`[aria-label="${paneName}"]`);
  await devToolsPage.waitFor(`[aria-label="${paneName} panel"]`);
  const jslogContext = paneName.toLowerCase();
  await expectVeEvents(devToolsPage,
                       [
                         veClick(`Panel: elements > Toolbar: sidebar > PanelTabHeader: ${jslogContext}`),
                         veImpressionsUnder('Panel: elements', [veImpression('Pane', jslogContext)]),
                       ],
                       undefined);
};

export const waitForElementsStyleSection =
    async (devToolsPage: DevToolsPage, expectedNodeText: string|null = '<body') => {
  // Wait for the file to be loaded and selectors to be shown
  await devToolsPage.waitFor('.styles-selector');
  await expectVeEvents(devToolsPage, [veImpressionsUnder('Panel: elements', [veImpression('Pane', 'styles')])],
                       undefined);

  // Check to make sure we have the correct node selected after opening a file.
  if (expectedNodeText) {
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, expectedNodeText);
  }
};

export const waitForElementsDOMBreakpointsSection = async (devToolsPage: DevToolsPage) => {
  let domBreakpointsPane = await devToolsPage.$('DOM breakpoints', undefined, 'aria');
  if (!domBreakpointsPane) {
    const elementsPanel = await devToolsPage.waitForAria('Elements panel');
    await devToolsPage.clickMoreTabsButton(elementsPanel);
    domBreakpointsPane = await devToolsPage.waitForAria('DOM breakpoints');
  }
  await devToolsPage.click(DOM_BREAKPOINTS_SECTION_SELECTOR);
  await devToolsPage.waitFor(DOM_BREAKPOINTS_LIST_SELECTOR);
};

export async function getDOMBreakpoints(devToolsPage: DevToolsPage) {
  return await devToolsPage.$('.breakpoint-entry');
}

export const isDOMBreakpointEnabled =
    async (devToolsPage: DevToolsPage, breakpoint: puppeteer.ElementHandle<Element>) => {
  const checkbox = await devToolsPage.waitFor('input[type="checkbox"]', breakpoint);
  return await checkbox!.evaluate(node => node.checked);
};

export const setDOMBreakpointOnSelectedNode = async (devToolsPage: DevToolsPage, type: string) => {
  await openSubMenu(devToolsPage, SELECTED_TREE_ELEMENT_SELECTOR, 'Break on');
  const breakpointToggle = await devToolsPage.waitFor(`[aria-label="${type}, unchecked"]`);
  await breakpointToggle.click();
};

export const toggleDOMBreakpointCheckbox =
    async (devToolsPage: DevToolsPage, breakpoint: puppeteer.ElementHandle<Element>, wantChecked: boolean) => {
  const checkbox = await devToolsPage.waitFor('input[type="checkbox"]', breakpoint);
  const checked = await checkbox!.evaluate(box => box.checked);
  if (checked !== wantChecked) {
    await checkbox!.click();
  }
  assert.strictEqual(await checkbox!.evaluate(box => box.checked), wantChecked);
};

export const waitForElementsComputedSection = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.waitFor(COMPUTED_PROPERTY_SELECTOR);
  await expectVeEvents(devToolsPage, [veImpressionsUnder('Panel: elements', [veImpression('Pane', 'computed')])],
                       undefined);
};

export const getContentOfComputedPane = async (devToolsPage: DevToolsPage) => {
  const pane = await devToolsPage.waitFor('Computed panel', undefined, undefined, 'aria');
  const tree = await devToolsPage.waitFor('[role="tree"]', pane, undefined, 'aria');
  return await tree.evaluate(node => node.textContent);
};

export const waitForComputedPaneChange = async (devToolsPage: DevToolsPage, initialValue: string) => {
  await devToolsPage.waitForFunction(async () => {
    const value = await getContentOfComputedPane(devToolsPage);
    return value !== initialValue;
  });
};

export const getAllPropertiesFromComputedPane = async (devToolsPage: DevToolsPage) => {
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

export const getPropertyFromComputedPane = async (devToolsPage: DevToolsPage, name: string) => {
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

export const expandSelectedNodeRecursively = async (devToolsPage: DevToolsPage) => {
  const EXPAND_RECURSIVELY = '[aria-label="Expand recursively"]';

  // Find the selected node, right click.
  await devToolsPage.click(SELECTED_TREE_ELEMENT_SELECTOR, {clickOptions: {button: 'right'}});

  // Wait for the 'expand recursively' option, and click it.
  await devToolsPage.click(EXPAND_RECURSIVELY);
  await expectVeEvents(devToolsPage,
                       [
                         veClick('Panel: elements > Tree: elements > TreeItem'),
                         veImpressionForSelectedNodeMenu(await getContentOfSelectedNode(devToolsPage)),
                         veClick('Panel: elements > Tree: elements > TreeItem > Menu > Action: expand-recursively'),
                       ],
                       undefined);
};

export const findElementById = async (devToolsPage: DevToolsPage, id: string) => {
  await devToolsPage.pressKey('f', {control: true});
  await devToolsPage.waitFor('.search-bar:not(.hidden)');
  await devToolsPage.typeText('#' + id);
  await devToolsPage.pressKey('Enter');
  await devToolsPage.waitFor(`.highlight > .webkit-html-tag[aria-label*="\\"${id}\\"`);
  await devToolsPage.pressKey('Escape');
  await devToolsPage.waitFor('.search-bar.hidden');
};

function veImpressionForSelectedNodeMenu(content: string) {
  const isPseudoElement = content.startsWith('::');
  if (isPseudoElement) {
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

export const showForceState = async (devToolsPage: DevToolsPage, specificStates = false) => {
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

export const forcePseudoState = async (devToolsPage: DevToolsPage, pseudoState: string, specificStates = false) => {
  // Open element & page state pane and wait for it to be loaded asynchronously
  await showForceState(devToolsPage, specificStates);

  const stateEl = await devToolsPage.waitForAria(pseudoState);
  await stateEl.click();
  await expectVeEvents(
      devToolsPage,
      [
        veClick('Panel: elements > Pane: styles > ToggleSubpane: element-states'),
        veImpressionsUnder('Panel: elements > Pane: styles', [veImpression('Pane', 'element-states',
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
      undefined);
};

export const removePseudoState = async (devToolsPage: DevToolsPage, pseudoState: string) => {
  const stateEl = await devToolsPage.waitForAria(pseudoState);
  await stateEl.click();
  await expectVeEvents(devToolsPage,
                       [
                         veChange(`Panel: elements > Pane: styles > Pane: element-states > Toggle: ${
                             pseudoState === EMULATE_FOCUSED_PAGE ? 'emulate-page-focus' : pseudoState.substr(1)}`),
                       ],
                       undefined);
};

export const getComputedStylesForDomNode =
    async (inspectedPage: InspectedPage, elementSelector: string, styleAttribute: keyof CSSStyleDeclaration) => {
  return await inspectedPage.evaluate((elementSelector, styleAttribute) => {
    const element = document.querySelector(elementSelector);
    if (!element) {
      throw new Error(`${elementSelector} could not be found`);
    }
    return getComputedStyle(element)[styleAttribute];
  }, elementSelector, styleAttribute);
};

export const waitForNumberOfComputedProperties = async (devToolsPage: DevToolsPage, numberToWaitFor: number) => {
  const computedPane = await getComputedPanel(devToolsPage);
  return await devToolsPage.waitForFunction(
      async () => numberToWaitFor ===
          await computedPane.$$eval('pierce/' + COMPUTED_PROPERTY_SELECTOR, properties => properties.length));
};

export const getComputedPanel = async (devToolsPage: DevToolsPage) => {
  return await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
};

export const filterComputedProperties = async (devToolsPage: DevToolsPage, filterString: string) => {
  const initialContent = await getContentOfComputedPane(devToolsPage);

  const computedPanel = await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await devToolsPage.click('[aria-label="Filter"]', {
    root: computedPanel,
  });
  await devToolsPage.typeText(filterString);
  await waitForComputedPaneChange(devToolsPage, initialContent);
  await expectVeEvents(devToolsPage, [veChange('Panel: elements > Pane: computed > TextField: filter')], undefined);
};

export const toggleShowAllComputedProperties = async (devToolsPage: DevToolsPage) => {
  const initialContent = await getContentOfComputedPane(devToolsPage);

  const computedPanel = await devToolsPage.waitFor(COMPUTED_STYLES_PANEL_SELECTOR);
  await devToolsPage.click(COMPUTED_STYLES_SHOW_ALL_SELECTOR, {root: computedPanel});
  await waitForComputedPaneChange(devToolsPage, initialContent);
  await expectVeEvents(
      devToolsPage, [veChange('Panel: elements > Pane: computed > Toggle: show-inherited-computed-style-properties')],
      undefined);
};

export const waitForDomNodeToBeVisible = async (inspectedPage: InspectedPage, elementSelector: string) => {
  // DevTools will force Blink to make the hover shown, so we have
  // to wait for the element to be DOM-visible (e.g. no `display: none;`)
  await inspectedPage.waitForSelector(elementSelector, {visible: true});
};

export const waitForDomNodeToBeHidden = async (inspectedPage: InspectedPage, elementSelector: string) => {
  await inspectedPage.waitForSelector(elementSelector, {hidden: true});
};

export const assertGutterDecorationForDomNodeExists = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.waitFor('.elements-gutter-decoration');
};

export const getStyleRuleSelector = (selector: string) => `[aria-label="${selector}, css selector"]`;

export const waitForExactStyleRule = async (devToolsPage: DevToolsPage, expectedSelector: string) => {
  await devToolsPage.waitForFunction(async () => {
    const rules = await getDisplayedStyleRules(devToolsPage);
    return rules.find(rule => rule.selectorText === expectedSelector);
  });
};

export const waitForStyleRule = async (devToolsPage: DevToolsPage, expectedSelector: string) => {
  await devToolsPage.waitForFunction(async () => {
    const rules = await getDisplayedStyleRules(devToolsPage);
    return rules.map(rule => rule.selectorText).includes(expectedSelector);
  });
};

export const getComputedStyleProperties = async (devToolsPage: DevToolsPage) => {
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

export const getDisplayedCSSDeclarations = async (devToolsPage: DevToolsPage) => {
  const cssDeclarations = await devToolsPage.$$(CSS_DECLARATION_SELECTOR);
  return await Promise.all(cssDeclarations.map(async node => await node.evaluate(n => n.textContent?.trim())));
};

export const getDisplayedStyleRulesCompact = async (devToolsPage: DevToolsPage) => {
  const compactRules = [];
  for (const rule of await getDisplayedStyleRules(devToolsPage)) {
    compactRules.push(
        {selectorText: rule.selectorText, propertyNames: rule.propertyData.map(data => data.propertyName)});
  }
  return compactRules;
};

export const getDisplayedStyleRules = async (devToolsPage: DevToolsPage) => {
  const allRuleSelectors = await devToolsPage.$$(CSS_STYLE_RULE_SELECTOR);
  const rules = [];
  for (const ruleSelector of allRuleSelectors) {
    const propertyData = await getDisplayedCSSPropertyData(devToolsPage, ruleSelector);
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
export const getDisplayedCSSPropertyData =
    async (devToolsPage: DevToolsPage, propertiesSection: puppeteer.ElementHandle<Element>) => {
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

export const getDisplayedCSSPropertyNames =
    async (devToolsPage: DevToolsPage, propertiesSection: puppeteer.ElementHandle<Element>) => {
  const cssPropertyNames = await devToolsPage.$$(CSS_PROPERTY_NAME_SELECTOR, propertiesSection);
  const propertyNamesText = (await Promise.all(cssPropertyNames.map(
                                 node => node.evaluate(n => n.textContent),
                                 )))
                                .filter(c => !!c);
  return propertyNamesText;
};

export const getStyleRule = (devToolsPage: DevToolsPage, selector: string) => {
  return devToolsPage.waitFor(getStyleRuleSelector(selector));
};

export const getStyleRuleWithSourcePosition =
    (devToolsPage: DevToolsPage, styleSelector: string, sourcePosition: string|undefined) => {
      if (!sourcePosition) {
        return getStyleRule(devToolsPage, styleSelector);
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

export const getColorSwatch =
    async (devToolsPage: DevToolsPage, parent: puppeteer.ElementHandle<Element>|undefined, index: number) => {
  const swatches = await devToolsPage.$$(COLOR_SWATCH_SELECTOR, parent);
  return swatches[index];
};

export const getColorSwatchColor =
    async (devToolsPage: DevToolsPage, parent: puppeteer.ElementHandle<Element>, index: number) => {
  const swatch = await devToolsPage.waitForFunction(() => getColorSwatch(devToolsPage, parent, index));
  return await swatch.evaluate(node => (node as HTMLElement).style.backgroundColor);
};

export const shiftClickColorSwatch =
    async (devToolsPage: DevToolsPage, parent: puppeteer.ElementHandle<Element>, index: number, parentVe: string) => {
  const swatch = await getColorSwatch(devToolsPage, parent, index);

  await devToolsPage.clickElement(swatch, {modifiers: {shift: true}});

  await expectVeEvents(
      devToolsPage,
      [
        veClick(`${parentVe} > ShowStyleEditor: color`),
        veImpressionsUnder(`${parentVe} > ShowStyleEditor: color`,
                           [veImpression('Menu', undefined,
                                         [veImpression('Action', 'clipped-color'), veImpression('Item', 'color')])]),
      ],
      undefined);
};

export const getStyleSectionSubtitles = async (devToolsPage: DevToolsPage) => {
  const subtitles = await devToolsPage.$$(SECTION_SUBTITLE_SELECTOR);
  return await Promise.all(subtitles.map(node => node.evaluate(n => n.textContent)));
};

export const getCSSPropertyInRule =
    async (devToolsPage: DevToolsPage, ruleSection: puppeteer.ElementHandle<Element>|string, name: string,
           sourcePosition: string|undefined = undefined) => {
  if (typeof ruleSection === 'string') {
    ruleSection = await getStyleRuleWithSourcePosition(devToolsPage, ruleSection, sourcePosition);
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

export const focusCSSPropertyValue = async (devToolsPage: DevToolsPage, selector: string, propertyName: string) => {
  await waitForStyleRule(devToolsPage, selector);
  await devToolsPage.timeout(100);
  let property = await getCSSPropertyInRule(devToolsPage, selector, propertyName, undefined);
  assert.isOk(property, `Could not find property ${propertyName} in rule ${selector}`);
  // Clicking on the semicolon element to make sure we don't hit the swatch or other
  // non-editable elements.
  await devToolsPage.click(CSS_PROPERTY_VALUE_SELECTOR + ' + .styles-semicolon', {root: property});
  await devToolsPage.waitForFunction(async () => {
    property = await getCSSPropertyInRule(devToolsPage, selector, propertyName, undefined);
    const value = property ? await devToolsPage.$(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    assert.isOk(value, `Could not find property ${propertyName} in rule ${selector}`);
    return await value.evaluate(node => {
      return node.classList.contains('text-prompt') && node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents(devToolsPage,
                       [veClick(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
                           propertyName.startsWith('--') ? 'custom-property' : propertyName}`)],
                       undefined);
};

/**
 * Edit a CSS property value in a given rule
 * @param selector The selector of the rule to be updated. Note that because of the way the Styles populates, it is
 * important to provide a rule selector that is unique here, to avoid editing a property in the wrong rule.
 * @param propertyName The name of the property to be found and edited. If several properties have the same names, the
 * first one is edited.
 * @param newValue The new value to be used.
 */
export async function editCSSProperty(devToolsPage: DevToolsPage, selector: string, propertyName: string,
                                      newValue: string) {
  await focusCSSPropertyValue(devToolsPage, selector, propertyName);

  await devToolsPage.typeText(newValue, {delay: 100});
  await devToolsPage.pressKey('Enter');

  await devToolsPage.waitForFunction(async () => {
    // Wait until the value element is not a text-prompt anymore.
    const property = await getCSSPropertyInRule(devToolsPage, selector, propertyName, undefined);
    const value = property ? await devToolsPage.$(CSS_PROPERTY_VALUE_SELECTOR, property) : null;
    assert.isOk(value, `Could not find property ${propertyName} in rule ${selector}`);
    return await value.evaluate(node => {
      return !node.classList.contains('text-prompt') && !node.hasAttribute('contenteditable');
    });
  });
  await expectVeEvents(devToolsPage,
                       [veChange(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
                           propertyName.startsWith('--') ? 'custom-property' : propertyName} > Value`)],
                       undefined);
}

/** Edit a media or container query rule text for the given styles section **/
export async function editQueryRuleText(devToolsPage: DevToolsPage,
                                        queryStylesSections: puppeteer.ElementHandle<Element>, newQueryText: string,
                                        willDelete = false) {
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

  if (willDelete) {
    await devToolsPage.waitForFunction(async () => await queryStylesSections.evaluate(node => !node.isConnected));
  } else {
    await devToolsPage.waitForFunction(async () => {
      // Wait until the value element is not a text-prompt anymore.
      const queryText = await devToolsPage.$(STYLE_QUERY_RULE_TEXT_SELECTOR, queryStylesSections);
      assert.isOk(queryText, 'Could not find any query in the given styles section');
      const check = await queryText.evaluate(node => {
        return !node.classList.contains('being-edited') && !node.hasAttribute('contenteditable');
      });
      return check;
    });
  }
  await expectVeEvents(
      devToolsPage,
      [
        veClick('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
        veChange('Panel: elements > Pane: styles > Section: style-properties > CSSRuleHeader: container-query'),
      ],
      undefined);
}

export async function waitForCSSPropertyValue(devToolsPage: DevToolsPage, selector: string, name: string, value: string,
                                              sourcePosition: string|undefined) {
  return await devToolsPage.waitForFunction(async () => {
    const propertyHandle = await getCSSPropertyInRule(devToolsPage, selector, name, sourcePosition);
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

export async function waitForPropertyToHighlight(devToolsPage: DevToolsPage, ruleSelector: string,
                                                 propertyName: string) {
  await devToolsPage.waitForFunction(async () => {
    const property = await getCSSPropertyInRule(devToolsPage, ruleSelector, propertyName, undefined);
    assert.isOk(property, `Could not find property ${propertyName} in rule ${ruleSelector}`);
    // StylePropertyHighlighter temporarily highlights the property using the Web Animations API, so the only way to
    // know it's happening is by listing all animations.
    const animationCount = await property.evaluate(node => node.getAnimations().length);
    return animationCount > 0;
  });
}

export const getBreadcrumbsTextContent =
    async (devToolsPage: DevToolsPage, {expectedNodeCount}: {expectedNodeCount: number}) => {
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

export const getSelectedBreadcrumbTextContent = async (devToolsPage: DevToolsPage) => {
  const selectedCrumb = await devToolsPage.waitFor('li.crumb.selected > a > devtools-node-text');
  const text = selectedCrumb.evaluate(node => {
    if (!node.shadowRoot) {
      throw new Error('Found breadcrumbs node that unexpectedly has no shadowRoot.');
    }
    return Array.from(node.shadowRoot.querySelectorAll('span') || []).map(span => span.textContent).join('');
  });
  return await text;
};

export const navigateToElementsTab = async (devToolsPage: DevToolsPage, options?: {expectExistingPanel: boolean}) => {
  if ((await devToolsPage.$$(ELEMENTS_PANEL_SELECTOR)).length) {
    return;
  }
  // Open Elements panel
  await devToolsPage.click('#tab-elements');
  await devToolsPage.waitFor(ELEMENTS_PANEL_SELECTOR);
  await devToolsPage.timeout(100);
  if (!options?.expectExistingPanel) {
    await expectVeEvents(devToolsPage, [veImpressionForElementsPanel(options)], undefined);
  }
};

export const clickOnFirstLinkInStylesPanel = async (devToolsPage: DevToolsPage) => {
  const stylesPane = await devToolsPage.waitFor('div.styles-pane');
  await devToolsPage.click('div.styles-section-subtitle button.devtools-link', {root: stylesPane});
  await expectVeEvents(
      devToolsPage,
      [veClick('Panel: elements > Pane: styles > Section: style-properties > Link: css-location')],
      undefined,
  );
};

export const toggleClassesPane = async (devToolsPage: DevToolsPage) => {
  const stylesPane = await devToolsPage.waitFor('div.styles-pane');
  await devToolsPage.waitFor(CLS_BUTTON_SELECTOR, stylesPane);
  // Add a wait for TOGGLE_COMMON_RENDERING_EMULATIONS_SELECTOR so that the toolbar is stable before
  // clicking on CLS_BUTTON_SELECTOR
  await devToolsPage.waitFor(TOGGLE_COMMON_RENDERING_EMULATIONS_SELECTOR, stylesPane);
  await devToolsPage.click(CLS_BUTTON_SELECTOR, {root: stylesPane});
  await devToolsPage.waitFor('.styles-element-classes-pane .text-prompt', stylesPane);  // wait for the animation
  await expectVeEvents(devToolsPage,
                       [
                         veClick('Panel: elements > Pane: styles > ToggleSubpane: elements-classes'),
                         veImpressionsUnder('Panel: elements > Pane: styles',
                                            [veImpression('Pane', 'elements-classes', [veImpression('TextField')])]),
                       ],
                       undefined);
};

export const typeInClassesPaneInput = async (devToolsPage: DevToolsPage, text: string,
                                             commitWith: puppeteer.KeyInput = 'Enter', waitForNodeChange = true) => {
  await step(`Typing in new class names ${text}`, async () => {
    await devToolsPage.click(CLS_INPUT_SELECTOR);
    await devToolsPage.typeText(text, {delay: 50});
  });

  if (commitWith) {
    await step(`Committing the changes with ${commitWith}`, async () => {
      await devToolsPage.pressKey(commitWith);
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
  await expectVeEvents(devToolsPage, [veChange('Panel: elements > Pane: styles > Pane: elements-classes > TextField')],
                       undefined);
};

export const toggleClassesPaneCheckbox = async (devToolsPage: DevToolsPage, checkboxLabel: string) => {
  const initialValue = await getContentOfSelectedNode(devToolsPage);

  const classesPane = await devToolsPage.waitFor(CLS_PANE_SELECTOR);
  await devToolsPage.click(`[title="${checkboxLabel}"]`, {root: classesPane});

  const nodeChange = waitForSelectedNodeChange(devToolsPage, initialValue);
  const veEvents = expectVeEvents(
      devToolsPage, [veChange('Panel: elements > Pane: styles > Pane: elements-classes > Toggle: element-class')],
      undefined);
  await Promise.all([nodeChange, veEvents]);
};

export const assertSelectedNodeClasses = async (devToolsPage: DevToolsPage, expectedClasses: string[]) => {
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
        devToolsPage,
        [
          veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs'),
          veImpressionsUnder('Panel: elements > Toolbar: sidebar > DropDown: more-tabs',
                             [veImpression('Menu', undefined, [veImpression('Action', 'accessibility.view')])]),
        ],
        undefined);
  }
  await devToolsPage.click('aria/Accessibility');
  await devToolsPage.waitFor('.source-order-checkbox');
  await devToolsPage.waitFor('[aria-label="ARIA Attributes"]');
  await devToolsPage.waitFor('[aria-label="Computed Properties"]');
  await expectVeEvents(
      devToolsPage,
      [
        veClick('Panel: elements > Toolbar: sidebar > DropDown: more-tabs > Menu > Action: accessibility.view'),
        veImpressionsUnder('Panel: elements > Toolbar: sidebar',
                           [veImpression('PanelTabHeader', 'accessibility.view')]),
        veImpressionForAccessibilityPane(),
      ],
      undefined);
};

function veImpressionForAccessibilityPane() {
  const result = veImpressionsUnder(
      'Panel: elements', [veImpression('Pane', 'sidebar', [
        veImpression('SectionHeader', 'aria-attributes'),
        veImpression('Section', 'aria-attributes'),
        veImpression('SectionHeader', 'computed-properties'),
        veImpression('Section', 'computed-properties', [veImpression('Tree', undefined, [veImpression('TreeItem')])]),
        veImpression('SectionHeader', 'source-order-viewer'),
        veImpression('Section', 'source-order-viewer', [veImpression('Toggle')]),
      ])]);
  result.impressions.push('Panel: elements > Toggle: elements.toggle-a11y-tree');
  return result;
}

export const toggleAccessibilityTree = async (devToolsPage: DevToolsPage) => {
  await toggleAccessibilityPane(devToolsPage);
  await devToolsPage.click('aria/Show accessibility tree');
  await expectVeEvents(devToolsPage, [veChange('Panel: elements > Toggle: elements.toggle-a11y-tree')], undefined);
};

export const getPropertiesWithHints = async (devToolsPage: DevToolsPage) => {
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

export const summonAndWaitForSearchBox = async (devToolsPage: DevToolsPage) => {
  // Wait for elements to load.
  await devToolsPage.waitFor('devtools-elements-breadcrumbs');
  await devToolsPage.summonSearchBox();
  await devToolsPage.waitFor(SEARCH_BOX_SELECTOR);
  await expectVeEvents(devToolsPage,
                       [
                         veKeyDown(''),
                         veImpressionsUnder('Panel: elements', [veImpression('Toolbar', 'search',
                                                                             [
                                                                               veImpression('Action: close-search'),
                                                                               veImpression('Action: select-next'),
                                                                               veImpression('Action: select-previous'),
                                                                               veImpression('TextField: search'),
                                                                             ])]),
                       ],
                       undefined);
};

export const assertSearchResultMatchesText = async (devToolsPage: DevToolsPage, text: string) => {
  await devToolsPage.waitForFunction(async () => {
    return await devToolsPage.getTextContent(SEARCH_RESULTS_MATCHES) === text;
  });
};

export const goToResourceAndWaitForStyleSection =
    async (devToolsPage: DevToolsPage, inspectedPage: InspectedPage, path: string) => {
  await inspectedPage.goToResource(path);
  await waitForElementsStyleSection(devToolsPage, null);
};

export const checkStyleAttributes = async (devToolsPage: DevToolsPage, expectedStyles: string[]) => {
  const result = await devToolsPage.$$(STYLE_PROPERTIES_SELECTOR, undefined, 'pierce');
  const actual = await Promise.all(result.map(e => e.evaluate(e => e.textContent?.trim())));
  return actual.sort().join(' ') === expectedStyles.sort().join(' ');
};

export const TEXT_PROMPT_GHOST_TEXT_SELECTOR = '.auto-complete-text';
export const GHOST_VALUE_PREDICTION_SELECTOR = '.ghost-value-prediction';
export const GHOST_ROW_SELECTOR = '.ghost-row';

declare global {
  interface Window {
    /* eslint-disable @typescript-eslint/naming-convention */
    __lastAidaRequest: string;
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export const mockAidaCodeComplete =
    async (devToolsPage: DevToolsPage, response: Host.AidaClient.CompletionResponse) => {
  await devToolsPage.evaluate(responseString => {
    if (!window.InspectorFrontendHost) {
      return;
    }
    window.InspectorFrontendHost.aidaCodeComplete = (request, callback) => {
      window.__lastAidaRequest = request;
      callback({response: responseString});
    };
  }, JSON.stringify(response));
};

export const getLastAidaRequest = async (devToolsPage: DevToolsPage) => {
  return await devToolsPage.evaluate(() => {
    return window.__lastAidaRequest;
  });
};

export const getGhostTextInCurrentTextPrompt = async (devToolsPage: DevToolsPage) => {
  const ghostElement = await devToolsPage.waitFor(TEXT_PROMPT_GHOST_TEXT_SELECTOR);
  if (!ghostElement) {
    return null;
  }
  return await ghostElement.evaluate(node => node.textContent);
};

export const getGhostText = async (devToolsPage: DevToolsPage) => {
  const ghostElement = await devToolsPage.waitFor(GHOST_VALUE_PREDICTION_SELECTOR);
  if (!ghostElement) {
    return null;
  }
  return await ghostElement.evaluate(node => node.textContent);
};

export const getMultilineGhostElements = async (devToolsPage: DevToolsPage) => {
  await devToolsPage.waitFor(GHOST_ROW_SELECTOR);
  const ghostRows = await devToolsPage.$$(GHOST_ROW_SELECTOR);
  return await Promise.all(ghostRows.map(row => row.evaluate(node => node.textContent)));
};

export const getAccessibilityTreeNodeSelector = (textContent: string) => `pierceShadowText/${textContent}`;
