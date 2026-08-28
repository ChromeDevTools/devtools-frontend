// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../shared/frontend-helper.js';

const NEW_HEAP_SNAPSHOT_BUTTON = 'devtools-button[aria-label="Take heap snapshot"]';
const MEMORY_PANEL_CONTENT = 'div[aria-label="Memory panel"]';
const PROFILE_TREE_SIDEBAR = 'div.profiles-tree-sidebar';
export const MEMORY_TAB_ID = '#tab-heap-profiler';
const CLASS_FILTER_INPUT = 'div[aria-placeholder="Filter by class"]';
export const SELECTED_RESULT = '#profile-views table.data tr.data-grid-data-grid-node.revealed.parent.selected';

export async function navigateToMemoryTab(devToolsPage: DevToolsPage) {
  await devToolsPage.click(MEMORY_TAB_ID);
  await devToolsPage.waitFor(MEMORY_PANEL_CONTENT);
  await devToolsPage.waitFor(PROFILE_TREE_SIDEBAR);
}

export async function takeDetachedElementsProfile(devToolsPage: DevToolsPage) {
  await devToolsPage.click('xpath///label[text()="Detached elements"]');
  await devToolsPage.click('devtools-button[aria-label="Get detached elements"]');
  await devToolsPage.waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await devToolsPage.waitFor('.heap-snapshot-sidebar-tree-item.selected');
}

export async function takeAllocationProfile(devToolsPage: DevToolsPage) {
  await devToolsPage.click('xpath///label[text()="Allocation sampling"]');
  await devToolsPage.click('devtools-button[aria-label="Start heap profiling"]');
  await new Promise(r => setTimeout(r, 200));
  await devToolsPage.click('devtools-button[aria-label="Stop heap profiling"]');
  await devToolsPage.waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await devToolsPage.waitFor('.heap-snapshot-sidebar-tree-item.selected');
}

export async function takeAllocationTimelineProfile(devToolsPage: DevToolsPage,
                                                    {recordStacks}: {recordStacks: boolean} = {
                                                      recordStacks: false,
                                                    }) {
  await devToolsPage.click('xpath///label[text()="Allocations on timeline"]');
  if (recordStacks) {
    await devToolsPage.click('[title="Allocation stack traces (more overhead)"]');
  }
  await devToolsPage.click('devtools-button[aria-label="Start recording heap profile"]');
  await new Promise(r => setTimeout(r, 200));
  await devToolsPage.click('devtools-button[aria-label="Stop recording heap profile"]');
  await devToolsPage.waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await devToolsPage.waitFor('.heap-snapshot-sidebar-tree-item.selected');
}

export async function takeHeapSnapshot(devToolsPage: DevToolsPage, name = 'Snapshot 1') {
  await devToolsPage.click(NEW_HEAP_SNAPSHOT_BUTTON);
  await devToolsPage.waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await devToolsPage.waitForFunction(async () => {
    const selected = await devToolsPage.waitFor('.heap-snapshot-sidebar-tree-item.selected');
    const title = await devToolsPage.waitFor('span.title', selected);
    return (await title.evaluate(e => e.textContent)) === name ? title : undefined;
  });
}

export async function waitForHeapSnapshotData(devToolsPage: DevToolsPage) {
  await devToolsPage.waitFor('#profile-views');
  await devToolsPage.waitFor('#profile-views .data-grid');
  const rowCountMatches = async () => {
    const rows = await getDataGridRows(devToolsPage, '#profile-views table.data');
    if (rows.length > 0) {
      return rows;
    }
    return undefined;
  };
  return await devToolsPage.waitForFunction(rowCountMatches);
}

export async function waitForNonEmptyHeapSnapshotData(devToolsPage: DevToolsPage) {
  const rows = await waitForHeapSnapshotData(devToolsPage);
  assert.isTrue(rows.length > 0);
}

export async function getDataGridRows(devToolsPage: DevToolsPage, selector: string) {
  // The grid in Memory Tab contains a tree
  const grid = await devToolsPage.waitFor(selector);
  return await devToolsPage.$$('.data-grid-data-grid-node', grid);
}

export async function setClassFilter(devToolsPage: DevToolsPage, text: string) {
  const classFilter = await devToolsPage.waitFor(CLASS_FILTER_INPUT);
  await classFilter.focus();
  void devToolsPage.pasteText(text);
}

export async function setSearchFilter(devToolsPage: DevToolsPage, text: string) {
  const grid = await devToolsPage.waitFor('#profile-views table.data');
  await grid.focus();

  await devToolsPage.pressKey('f', {control: true});
  const SEARCH_QUERY = '[aria-label="Find"]';
  const inputElement = await devToolsPage.waitFor(SEARCH_QUERY);
  assert.isOk(inputElement, 'Unable to find search input field');
  await inputElement.evaluate(el => {
    (el as HTMLInputElement).value = '';
    el.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await inputElement.focus();
  await inputElement.type(text);
}

export async function waitForSearchResultNumber(devToolsPage: DevToolsPage, results: number) {
  const findMatch = async () => {
    const currentMatch = await devToolsPage.waitFor('.search-results-matches');
    const currentTextContent = currentMatch && await currentMatch.evaluate(el => el.textContent);
    if (currentTextContent?.endsWith(` ${results}`)) {
      return currentMatch;
    }
    return undefined;
  };
  return await devToolsPage.waitForFunction(findMatch);
}

export async function waitForSelectedRowWithText(devToolsPage: DevToolsPage, text: string) {
  return await devToolsPage.waitForFunction(async () => {
    const selectedRow = await devToolsPage.$('.data-grid-data-grid-node.selected');
    if (!selectedRow) {
      return false;
    }
    const rowText = await selectedRow.evaluate(el => el.textContent);
    return rowText?.includes(text) ? selectedRow : false;
  });
}

/**
 *
 * @param searchResult
 * @param searchMatch Leave undefined if you want to go over all instances
 * @param devToolsPage
 */
export async function findSearchResult(devToolsPage: DevToolsPage, searchResult: string, searchMatch?: string|RegExp) {
  await devToolsPage.waitForFunction(async () => {
    if (!searchMatch) {
      const match = await devToolsPage.waitFor('#profile-views table.data');
      const result = await devToolsPage.$textContent(searchResult, match);
      if (result) {
        return true;
      }
    } else {
      const matches = await devToolsPage.waitFor('.search-results-matches');
      const matchesText = await matches.evaluate(element => {
        return element.textContent;
      });
      if (typeof searchMatch === 'string' && matchesText === searchMatch) {
        return true;
      }
      if (typeof searchMatch !== 'string' && searchMatch.test(matchesText)) {
        return true;
      }
    }

    await devToolsPage.click('[aria-label="Show next result"]');
    return;
  });

  const match = await devToolsPage.waitFor('#profile-views');
  await devToolsPage.waitForElementWithTextContent(searchResult, match);
}

const normalizRetainerName = (retainerName: string) => {
  // Retainers starting with `Window /` might have host information in their
  // name, including the port, so we need to strip that. We can't distinguish
  // Window from Window / either, because on Mac it is often just Window.
  if (retainerName.startsWith('Window /')) {
    return 'Window';
  }
  // Retainers including double-colons :: are names from the C++ implementation
  // exposed through V8's gn arg `cppgc_enable_object_names`; these should be
  // considered implementation details, so we normalize them.
  if (retainerName.includes('::')) {
    if (retainerName.startsWith('Detached')) {
      return 'Detached InternalNode';
    }
    return 'InternalNode';
  }
  return retainerName;
};

interface RetainerChainEntry {
  propertyName: string;
  retainerClassName: string;
}

export async function checkRetainerChainSatisfies(devToolsPage: DevToolsPage,
                                                  p: (retainerChain: RetainerChainEntry[]) => boolean) {
  // Give some time for the expansion to finish.
  const retainerGridElements = await getDataGridRows(devToolsPage, '.retaining-paths-view table.data');
  const retainerChain = [];
  for (let i = 0; i < retainerGridElements.length; ++i) {
    const retainer = retainerGridElements[i];
    const propertyName = await retainer.$eval('span.property-name', el => el.textContent);
    const rawRetainerClassName = await retainer.$eval('span.value', el => el.textContent);
    assert.isOk(propertyName, 'Could not get retainer name');
    assert.isOk(rawRetainerClassName, 'Could not get retainer value');
    const retainerClassName = normalizRetainerName(rawRetainerClassName);
    retainerChain.push({propertyName, retainerClassName});
    if (await retainer.evaluate(el => !el.classList.contains('expanded'))) {
      // Only follow the shortest retainer chain to the end. This relies on
      // the retainer view behavior that auto-expands the shortest retaining
      // chain.
      break;
    }
  }
  return p(retainerChain);
}

export async function waitUntilRetainerChainSatisfies(devToolsPage: DevToolsPage,
                                                      p: (retainerChain: RetainerChainEntry[]) => boolean) {
  await devToolsPage.waitForFunction(checkRetainerChainSatisfies.bind(null, devToolsPage, p));
}

export function appearsInOrder(targetArray: string[], inputArray: string[]) {
  let i = 0;
  let j = 0;

  if (inputArray.length > targetArray.length) {
    return false;
  }

  if (inputArray === targetArray) {
    return true;
  }

  while (i < targetArray.length && j < inputArray.length) {
    if (inputArray[j] === targetArray[i]) {
      j++;
    }
    i++;
  }

  if (j === inputArray.length) {
    return true;
  }
  return false;
}

export async function waitForRetainerChain(devToolsPage: DevToolsPage, expectedRetainers: string[]) {
  await devToolsPage.waitForFunction(checkRetainerChainSatisfies.bind(null, devToolsPage, retainerChain => {
    const actual = retainerChain.map(e => e.retainerClassName);
    return appearsInOrder(actual, expectedRetainers);
  }));
}

export async function changeViewViaDropdown(devToolsPage: DevToolsPage, newPerspective: string) {
  const perspectiveDropdownSelector = 'select[aria-label="Perspective"]';
  const dropdown = await devToolsPage.waitFor(perspectiveDropdownSelector);

  const optionToSelect = await devToolsPage.waitForElementWithTextContent(newPerspective, dropdown);
  const optionValue = await optionToSelect.evaluate(opt => opt.getAttribute('value'));
  if (!optionValue) {
    throw new Error(`Could not find heap snapshot perspective option: ${newPerspective}`);
  }
  await dropdown.select(optionValue);
}

export async function changeAllocationSampleViewViaDropdown(devToolsPage: DevToolsPage, newPerspective: string) {
  const perspectiveDropdownSelector = 'select[aria-label="Profile view mode"]';
  const dropdown = await devToolsPage.waitFor(
      perspectiveDropdownSelector,
  );
  const optionToSelect = await devToolsPage.waitForElementWithTextContent(newPerspective, dropdown);
  const optionValue = await optionToSelect.evaluate(opt => opt.getAttribute('value'));
  if (!optionValue) {
    throw new Error(`Could not find heap snapshot perspective option: ${newPerspective}`);
  }
  await dropdown.select(optionValue);
}

export async function focusTableRowWithName(devToolsPage: DevToolsPage, text: string) {
  const row = await devToolsPage.waitFor(`//span[text()="${text}"]/ancestor::tr`, undefined, undefined, 'xpath');
  await focusTableRow(devToolsPage, row);
}

export async function focusTableRow(devToolsPage: DevToolsPage, row: puppeteer.ElementHandle<Element>) {
  // Click in a numeric cell, to avoid accidentally clicking a link.
  await devToolsPage.click('.numeric-column', {
    root: row,
  });
}

export async function expandFocusedRow(devToolsPage: DevToolsPage) {
  await devToolsPage.pressKey('ArrowRight');
  await devToolsPage.waitFor('.selected.data-grid-data-grid-node.expanded');
}

function parseByteString(str: string): number {
  const number = parseFloat(str);
  if (str.endsWith('kB')) {
    return number * 1000;
  }
  if (str.endsWith('MB')) {
    return number * 1000 * 1000;
  }
  if (str.endsWith('GB')) {
    return number * 1000 * 1000 * 1000;
  }
  return number;
}

async function getSizesFromRow(devToolsPage: DevToolsPage, row: puppeteer.ElementHandle<Element>) {
  const numericData = await devToolsPage.$$('.numeric-column>.profile-multiple-values>span', row);
  assert.lengthOf(numericData, 4);
  function readNumber(e: Element): string {
    return e.textContent;
  }
  const shallowSize = parseByteString(await numericData[0].evaluate(readNumber));
  const retainedSize = parseByteString(await numericData[2].evaluate(readNumber));
  assert.isTrue(retainedSize >= shallowSize);
  return {shallowSize, retainedSize};
}

export async function getSizesFromSelectedRow(devToolsPage: DevToolsPage) {
  const row = await devToolsPage.waitFor('.selected.data-grid-data-grid-node');
  return await getSizesFromRow(devToolsPage, row);
}

export async function getCategoryRow(devToolsPage: DevToolsPage, text: string,
                                     wait?: true): ReturnType<DevToolsPage['waitFor']>;
export async function getCategoryRow(devToolsPage: DevToolsPage, text: string,
                                     wait: false): ReturnType<DevToolsPage['$']>;
export async function getCategoryRow(devToolsPage: DevToolsPage, text: string, wait = true) {
  const selector = `//td[text()="${text}"]/ancestor::tr`;
  const row = await (wait ? devToolsPage.waitFor(selector, undefined, undefined, 'xpath') :
                            devToolsPage.$(selector, undefined, 'xpath'));
  return row;
}

export async function getSizesFromCategoryRow(devToolsPage: DevToolsPage, text: string) {
  const row = await getCategoryRow(devToolsPage, text);
  return await getSizesFromRow(devToolsPage, row);
}

export async function getDistanceFromCategoryRow(devToolsPage: DevToolsPage, text: string) {
  const row = await getCategoryRow(devToolsPage, text);
  const numericColumns = await devToolsPage.$$('.numeric-column', row);
  return await numericColumns[0].evaluate(e => parseInt(e.textContent, 10));
}

export async function getCountFromCategoryRowWithName(devToolsPage: DevToolsPage, text: string) {
  const row = await getCategoryRow(devToolsPage, text);
  return await getCountFromCategoryRow(devToolsPage, row);
}

export async function getCountFromCategoryRow(devToolsPage: DevToolsPage, row: puppeteer.ElementHandle<Element>) {
  const countSpan = await devToolsPage.waitFor('.objects-count', row);
  return await countSpan.evaluate(e => parseInt(e.textContent.substring(1), 10));
}

export async function getAddedCountFromComparisonRowWithName(devToolsPage: DevToolsPage, text: string) {
  const row = await getCategoryRow(devToolsPage, text);
  return await getAddedCountFromComparisonRow(devToolsPage, row);
}

export async function getAddedCountFromComparisonRow(devToolsPage: DevToolsPage,
                                                     row: puppeteer.ElementHandle<Element>) {
  const addedCountCell = await devToolsPage.waitFor('.addedCount-column', row);
  const countText = await addedCountCell.evaluate(e => e.textContent);
  return parseByteString(countText);
}

export async function getRemovedCountFromComparisonRow(devToolsPage: DevToolsPage,
                                                       row: puppeteer.ElementHandle<Element>) {
  const addedCountCell = await devToolsPage.waitFor('.removedCount-column', row);
  const countText = await addedCountCell.evaluate(e => e.textContent);
  return parseByteString(countText);
}

export async function clickOnContextMenuForRetainer(devToolsPage: DevToolsPage, retainerName: string,
                                                    menuItem: string) {
  const retainersPane = await devToolsPage.waitFor('.retaining-paths-view');
  await devToolsPage.click(`xpath///span[text()="${retainerName}"]`, {
    root: retainersPane,
    clickOptions: {
      button: 'right',
      // Push the click right a bit further to avoid the disclosure triangle.
      offset: {x: 35, y: 0},
    },
  });
  await devToolsPage.click(`aria/${menuItem}`);
}

export async function restoreIgnoredRetainers(devToolsPage: DevToolsPage) {
  await devToolsPage.click('devtools-button[aria-label="Restore ignored retainers"]');
}

export async function setFilterDropdown(devToolsPage: DevToolsPage, filter: string) {
  const select = await devToolsPage.waitFor('devtools-toolbar select[aria-label="Filter"]');
  await select.select(filter);
}
