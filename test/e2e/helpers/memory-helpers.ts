// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$, platform, waitForElementWithTextContent} from '../../shared/helper.js';
import {$$, click, getBrowserAndPages, pasteText, waitFor, waitForFunction, waitForNone} from '../../shared/helper.js';


const NEW_HEAP_SNAPSHOT_BUTTON = 'button[aria-label="Take heap snapshot"]';
const MEMORY_PANEL_CONTENT = 'div[aria-label="Memory panel"]';
const PROFILE_TREE_SIDEBAR = 'div.profiles-tree-sidebar';
export const MEMORY_TAB_ID = '#tab-heap_profiler';
const CLASS_FILTER_INPUT = 'div[aria-placeholder="Class filter"]';

export async function navigateToMemoryTab() {
  await click(MEMORY_TAB_ID);
  await waitFor(MEMORY_PANEL_CONTENT);
  await waitFor(PROFILE_TREE_SIDEBAR);
}

export async function takeHeapSnapshot() {
  await click(NEW_HEAP_SNAPSHOT_BUTTON);
  await waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await waitFor('.heap-snapshot-sidebar-tree-item.selected');
}

export async function waitForHeapSnapshotData() {
  await waitFor('#profile-views');
  await waitFor('#profile-views .data-grid');
  const rowCountMatches = async () => {
    const rows = await getDataGridRows('#profile-views table.data');
    if (rows.length > 0) {
      return rows;
    }
    return undefined;
  };
  return await waitForFunction(rowCountMatches);
}

export async function waitForNonEmptyHeapSnapshotData() {
  const rows = await waitForHeapSnapshotData();
  assert.isTrue(rows.length > 0);
}

export async function getDataGridRows(selector: string) {
  // The grid in Memory Tab contains a tree
  const grid = await waitFor(selector);
  return await $$('.data-grid-data-grid-node', grid);
}

export async function setClassFilter(text: string) {
  const classFilter = await waitFor(CLASS_FILTER_INPUT);
  await classFilter.focus();
  pasteText(text);
}

export async function triggerLocalFindDialog(frontend: puppeteer.Page) {
  switch (platform) {
    case 'mac':
      await frontend.keyboard.down('Meta');
      break;

    default:
      await frontend.keyboard.down('Control');
  }

  await frontend.keyboard.press('f');

  switch (platform) {
    case 'mac':
      await frontend.keyboard.up('Meta');
      break;

    default:
      await frontend.keyboard.up('Control');
  }
}

export async function setSearchFilter(text: string) {
  const {frontend} = getBrowserAndPages();
  const grid = await waitFor('#profile-views table.data');
  await grid.focus();
  await triggerLocalFindDialog(frontend);
  const SEARCH_QUERY = '[aria-label="Find"]';
  const inputElement = await waitFor(SEARCH_QUERY);
  if (!inputElement) {
    assert.fail('Unable to find search input field');
  }
  await inputElement.focus();
  await inputElement.type(text);
}

export async function waitForSearchResultNumber(results: number) {
  const findMatch = async () => {
    const currentMatch = await waitFor('label[for=\'search-input-field\']');
    const currentTextContent = currentMatch && await currentMatch.evaluate(el => el.textContent);
    if (currentTextContent && currentTextContent.endsWith(` ${results}`)) {
      return currentMatch;
    }
    return undefined;
  };
  return await waitForFunction(findMatch);
}

/**
 * Waits for the next selected row in `grid` whose text content is different from `previousContent`.
 *
 * @param grid the grid root element
 * @param previousContent the previously selected text content
 */
async function waitForNextSelectedRow(grid: puppeteer.ElementHandle<Element>, previousContent: string) {
  const findMatch = async () => {
    const currentMatch = await grid.$('.data-grid-data-grid-node.selected');
    const currentTextContent = currentMatch && await currentMatch.evaluate(el => el.textContent);
    if (currentMatch && currentTextContent !== previousContent) {
      return currentMatch;
    }
    return undefined;
  };
  return await waitForFunction(findMatch);
}

export async function findSearchResult(p: (el: puppeteer.ElementHandle<Element>) => Promise<boolean>) {
  const grid = await waitFor('#profile-views table.data');
  const next = await waitFor('[aria-label="Search next"]');
  let previousContent = '';
  const findSearchResult = async () => {
    const currentMatch = await waitForNextSelectedRow(grid, previousContent);
    if (currentMatch && await p(currentMatch)) {
      return currentMatch;
    }
    // Since `waitForNextSelectedRow` above waited for the new selection, we haven't found
    // the right search result yet, so click on the button for the next search result.
    previousContent = currentMatch && await currentMatch.evaluate(el => el.textContent) || '';
    await next.click();
    return undefined;
  };
  return await waitForFunction(findSearchResult);
}

const normalizRetainerName = (retainerName: string) => {
  // Retainers starting with `Window /` might have host information in their
  // name, including the port, so we need to strip that. We can't distinguish
  // Window from Window / either, because on Mac it is often just Window.
  if (retainerName.startsWith('Window /')) {
    return 'Window';
  }
  // Retainers including double-colons :: are names from the C++ implementation
  // exposed through Chromium's gn arg `enable_additional_blink_object_names`;
  // these should be considered implementation details, so we normalize them.
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

export async function assertRetainerChainSatisfies(p: (retainerChain: Array<RetainerChainEntry>) => boolean) {
  // Give some time for the expansion to finish.
  const retainerGridElements = await getDataGridRows('.retaining-paths-view table.data');
  const retainerChain = [];
  for (let i = 0; i < retainerGridElements.length; ++i) {
    const retainer = retainerGridElements[i];
    const propertyName = await retainer.$eval('span.property-name', el => el.textContent);
    const rawRetainerClassName = await retainer.$eval('span.value', el => el.textContent);
    if (!propertyName) {
      assert.fail('Could not get retainer name');
    }
    if (!rawRetainerClassName) {
      assert.fail('Could not get retainer value');
    }
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

export async function waitUntilRetainerChainSatisfies(p: (retainerChain: Array<RetainerChainEntry>) => boolean) {
  await waitForFunction(assertRetainerChainSatisfies.bind(null, p));
}

export async function waitForRetainerChain(expectedRetainers: Array<string>) {
  await waitForFunction(assertRetainerChainSatisfies.bind(null, retainerChain => {
    if (retainerChain.length !== expectedRetainers.length) {
      return false;
    }
    for (let i = 0; i < expectedRetainers.length; ++i) {
      if (retainerChain[i].retainerClassName !== expectedRetainers[i]) {
        return false;
      }
    }
    return true;
  }));
}

export async function changeViewViaDropdown(newPerspective: string) {
  const perspectiveDropdownSelector = 'select[aria-label="Perspective"]';
  const dropdown = await $(perspectiveDropdownSelector) as puppeteer.ElementHandle<HTMLSelectElement>;

  const optionToSelect = await waitForElementWithTextContent(newPerspective, dropdown);
  const optionValue = await optionToSelect.evaluate(opt => opt.getAttribute('value'));
  if (!optionValue) {
    throw new Error(`Could not find heap snapshot perspective option: ${newPerspective}`);
  }
  dropdown.select(optionValue);
}
