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
  await devToolsPage.click('devtools-button[aria-label="Obtain detached elements"]');
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

export async function takeAllocationTimelineProfile(
    {recordStacks}: {recordStacks: boolean} = {
      recordStacks: false,
    },
    devToolsPage: DevToolsPage) {
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

export async function takeHeapSnapshot(name = 'Snapshot 1', devToolsPage: DevToolsPage) {
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
    const rows = await getDataGridRows('#profile-views table.data', devToolsPage);
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

export async function getDataGridRows(selector: string, devToolsPage: DevToolsPage) {
  // The grid in Memory Tab contains a tree
  const grid = await devToolsPage.waitFor(selector);
  return await devToolsPage.$$('.data-grid-data-grid-node', grid);
}

export async function setClassFilter(text: string, devToolsPage: DevToolsPage) {
  const classFilter = await devToolsPage.waitFor(CLASS_FILTER_INPUT);
  await classFilter.focus();
  void devToolsPage.pasteText(text);
}

export async function setSearchFilter(text: string, devToolsPage: DevToolsPage) {
  const grid = await devToolsPage.waitFor('#profile-views table.data');
  await grid.focus();

  await devToolsPage.pressKey('f', {control: true});
  const SEARCH_QUERY = '[aria-label="Find"]';
  const inputElement = await devToolsPage.waitFor(SEARCH_QUERY);
  assert.isOk(inputElement, 'Unable to find search input field');
  await inputElement.focus();
  await inputElement.type(text);
}

export async function waitForSearchResultNumber(results: number, devToolsPage: DevToolsPage) {
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

/**
 *
 * @param searchResult
 * @param searchMatch Leave undefined if you want to go over all instances
 * @param devToolsPage
 */
export async function findSearchResult(
    searchResult: string, searchMatch: string|RegExp|undefined, devToolsPage: DevToolsPage) {
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

  const match = await devToolsPage.waitFor('#profile-views table.data');
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

export async function assertRetainerChainSatisfies(
    p: (retainerChain: RetainerChainEntry[]) => boolean, devToolsPage: DevToolsPage) {
  // Give some time for the expansion to finish.
  const retainerGridElements = await getDataGridRows('.retaining-paths-view table.data', devToolsPage);
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

export async function waitUntilRetainerChainSatisfies(
    p: (retainerChain: RetainerChainEntry[]) => boolean, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(assertRetainerChainSatisfies.bind(null, p, devToolsPage));
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

export async function waitForRetainerChain(expectedRetainers: string[], devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(assertRetainerChainSatisfies.bind(null, retainerChain => {
    const actual = retainerChain.map(e => e.retainerClassName);
    return appearsInOrder(actual, expectedRetainers);
  }, devToolsPage));
}

export async function changeViewViaDropdown(newPerspective: string, devToolsPage: DevToolsPage) {
  const perspectiveDropdownSelector = 'select[aria-label="Perspective"]';
  const dropdown = await devToolsPage.waitFor(perspectiveDropdownSelector);

  const optionToSelect = await devToolsPage.waitForElementWithTextContent(newPerspective, dropdown);
  const optionValue = await optionToSelect.evaluate(opt => opt.getAttribute('value'));
  if (!optionValue) {
    throw new Error(`Could not find heap snapshot perspective option: ${newPerspective}`);
  }
  await dropdown.select(optionValue);
}

export async function changeAllocationSampleViewViaDropdown(newPerspective: string, devToolsPage: DevToolsPage) {
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

export async function focusTableRowWithName(text: string, devToolsPage: DevToolsPage) {
  const row = await devToolsPage.waitFor(`//span[text()="${text}"]/ancestor::tr`, undefined, undefined, 'xpath');
  await focusTableRow(row, devToolsPage);
}

export async function focusTableRow(row: puppeteer.ElementHandle<Element>, devToolsPage: DevToolsPage) {
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

async function getSizesFromRow(row: puppeteer.ElementHandle<Element>, devToolsPage: DevToolsPage) {
  const numericData = await devToolsPage.$$('.numeric-column>.profile-multiple-values>span', row);
  assert.lengthOf(numericData, 4);
  function readNumber(e: Element): string {
    return e.textContent as string;
  }
  const shallowSize = parseByteString(await numericData[0].evaluate(readNumber));
  const retainedSize = parseByteString(await numericData[2].evaluate(readNumber));
  assert.isTrue(retainedSize >= shallowSize);
  return {shallowSize, retainedSize};
}

export async function getSizesFromSelectedRow(devToolsPage: DevToolsPage) {
  const row = await devToolsPage.waitFor('.selected.data-grid-data-grid-node');
  return await getSizesFromRow(row, devToolsPage);
}

export async function getCategoryRow(text: string, wait = true, devToolsPage: DevToolsPage) {
  const selector = `//td[text()="${text}"]/ancestor::tr`;
  return await (wait ? devToolsPage.waitFor(selector, undefined, undefined, 'xpath') :
                       devToolsPage.$(selector, undefined, 'xpath'));
}

export async function getSizesFromCategoryRow(text: string, devToolsPage: DevToolsPage) {
  const row = await getCategoryRow(text, undefined, devToolsPage);
  return await getSizesFromRow(row, devToolsPage);
}

export async function getDistanceFromCategoryRow(text: string, devToolsPage: DevToolsPage) {
  const row = await getCategoryRow(text, undefined, devToolsPage);
  const numericColumns = await devToolsPage.$$('.numeric-column', row);
  return await numericColumns[0].evaluate(e => parseInt(e.textContent as string, 10));
}

export async function getCountFromCategoryRowWithName(text: string, devToolsPage: DevToolsPage) {
  const row = await getCategoryRow(text, undefined, devToolsPage);
  return await getCountFromCategoryRow(row, devToolsPage);
}

export async function getCountFromCategoryRow(row: puppeteer.ElementHandle<Element>, devToolsPage: DevToolsPage) {
  const countSpan = await devToolsPage.waitFor('.objects-count', row);
  return await countSpan.evaluate(e => parseInt((e.textContent ?? '').substring(1), 10));
}

export async function getAddedCountFromComparisonRowWithName(text: string, devToolsPage: DevToolsPage) {
  const row = await getCategoryRow(text, undefined, devToolsPage);
  return await getAddedCountFromComparisonRow(row, devToolsPage);
}

export async function getAddedCountFromComparisonRow(
    row: puppeteer.ElementHandle<Element>, devToolsPage: DevToolsPage) {
  const addedCountCell = await devToolsPage.waitFor('.addedCount-column', row);
  const countText = await addedCountCell.evaluate(e => e.textContent ?? '');
  return parseByteString(countText);
}

export async function getRemovedCountFromComparisonRow(
    row: puppeteer.ElementHandle<Element>, devToolsPage: DevToolsPage) {
  const addedCountCell = await devToolsPage.waitFor('.removedCount-column', row);
  const countText = await addedCountCell.evaluate(e => e.textContent ?? '');
  return parseByteString(countText);
}

export async function clickOnContextMenuForRetainer(
    retainerName: string, menuItem: string, devToolsPage: DevToolsPage) {
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

export async function setFilterDropdown(filter: string, devToolsPage: DevToolsPage) {
  const select = await devToolsPage.waitFor('devtools-toolbar select[aria-label="Filter"]');
  await select.select(filter);
}

export async function checkExposeInternals(devToolsPage: DevToolsPage) {
  const element = await devToolsPage.waitForElementWithTextContent('Internals with implementation details');
  await devToolsPage.clickElement(element);
}
