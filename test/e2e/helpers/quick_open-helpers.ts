// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, click, getBrowserAndPages, platform, typeText, waitFor} from '../../shared/helper.js';

export const QUICK_OPEN_SELECTOR = '[aria-label="Quick open"]';
const QUICK_OPEN_ITEMS_SELECTOR = '.filtered-list-widget-item-wrapper';
const QUICK_OPEN_ITEM_TITLE_SELECTOR = '.filtered-list-widget-title';

const QUICK_OPEN_SELECTED_ITEM_SELECTOR = `${QUICK_OPEN_ITEMS_SELECTOR}.selected`;

export const openCommandMenu = async () => {
  const {frontend} = getBrowserAndPages();

  switch (platform) {
    case 'mac':
      await frontend.keyboard.down('Meta');
      await frontend.keyboard.down('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.down('Control');
      await frontend.keyboard.down('Shift');
      break;
  }

  await frontend.keyboard.press('P');

  switch (platform) {
    case 'mac':
      await frontend.keyboard.up('Meta');
      await frontend.keyboard.up('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.up('Control');
      await frontend.keyboard.up('Shift');
      break;
  }

  await waitFor(QUICK_OPEN_SELECTOR);
};

export const openFileQuickOpen = async () => {
  const {frontend} = getBrowserAndPages();
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.press('P');
  await frontend.keyboard.up(modifierKey);
  await waitFor(QUICK_OPEN_SELECTOR);
};

export async function readQuickOpenResults(): Promise<string[]> {
  const items = await $$('.filtered-list-widget-title');
  return await Promise.all(items.map(element => element.evaluate(el => el.textContent as string)));
}

export const openFileWithQuickOpen = async (filename: string, filePosition = 0) => {
  await openFileQuickOpen();
  await typeIntoQuickOpen(filename);
  const firstItem = await getMenuItemAtPosition(filePosition);
  await firstItem.click();
};

export const openGoToLineQuickOpen = async () => {
  const {frontend} = getBrowserAndPages();
  await frontend.keyboard.down('Control');
  await frontend.keyboard.press('G');
  await frontend.keyboard.up('Control');
  await waitFor(QUICK_OPEN_SELECTOR);
};

export const showSnippetsAutocompletion = async () => {
  const {frontend} = getBrowserAndPages();

  // Clear the `>` character, as snippets use a `!` instead
  await frontend.keyboard.press('Backspace');

  await typeText('!');
};

export async function getAvailableSnippets() {
  const quickOpenElement = await waitFor(QUICK_OPEN_SELECTOR);
  const snippetsDOMElements = await $$(QUICK_OPEN_ITEMS_SELECTOR, quickOpenElement);
  const snippets = await Promise.all(snippetsDOMElements.map(elem => elem.evaluate(elem => elem.textContent)));
  return snippets;
}

export async function getMenuItemAtPosition(position: number) {
  const quickOpenElement = await waitFor(QUICK_OPEN_SELECTOR);
  await waitFor(QUICK_OPEN_ITEM_TITLE_SELECTOR);
  const itemsHandles = await $$(QUICK_OPEN_ITEMS_SELECTOR, quickOpenElement);
  const item = itemsHandles[position];
  if (!item) {
    assert.fail(`Quick open: could not find item at position: ${position}.`);
  }
  return item;
}

export async function getMenuItemTitleAtPosition(position: number) {
  const quickOpenElement = await waitFor(QUICK_OPEN_SELECTOR);
  await waitFor(QUICK_OPEN_ITEM_TITLE_SELECTOR);
  const itemsHandles = await $$(QUICK_OPEN_ITEM_TITLE_SELECTOR, quickOpenElement);
  const item = itemsHandles[position];
  if (!item) {
    assert.fail(`Quick open: could not find item at position: ${position}.`);
  }
  const title = await item.evaluate(elem => elem.textContent);
  return title;
}

export const closeDrawer = async () => {
  const closeButtonSelector = '[aria-label="Close drawer"]';
  await waitFor(closeButtonSelector);
  await click(closeButtonSelector);
};

export const getSelectedItemText = async () => {
  const quickOpenElement = await waitFor(QUICK_OPEN_SELECTOR);
  const selectedRow = await waitFor(QUICK_OPEN_SELECTED_ITEM_SELECTOR, quickOpenElement);
  const textContent = await selectedRow.getProperty('textContent');
  if (!textContent) {
    assert.fail('Quick open: could not get selected item textContent');
  }
  return await textContent.jsonValue();
};

export async function typeIntoQuickOpen(query: string, expectEmptyResults?: boolean) {
  await openFileQuickOpen();
  const prompt = await waitFor('[aria-label="Quick open prompt"]');
  await prompt.type(query);
  if (expectEmptyResults) {
    await waitFor('.filtered-list-widget :not(.hidden).not-found-text');
  } else {
    // Because each highlighted character is in its own div, we can count the highlighted
    // characters in one item to see that the list reflects the full query.
    const highlightSelector = new Array(query.length).fill('.highlight').join(' ~ ');
    await waitFor('.filtered-list-widget-title ' + highlightSelector);
  }
}
