// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {$, $$, $textContent, click, waitFor, waitForFunction} from '../../shared/helper.js';

export async function waitForSoftContextMenu(): Promise<puppeteer.ElementHandle<Element>> {
  return await waitFor('.soft-context-menu');
}

export async function assertTopLevelContextMenuItemsText(expectedOptions: string[]): Promise<void> {
  const contextMenu = await $('.soft-context-menu');
  if (!contextMenu) {
    assert.fail('Could not find context menu.');
  }

  const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
  const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));

  assert.deepEqual(allItemsText, expectedOptions);
}

export async function findSubMenuEntryItem(text: string): Promise<puppeteer.ElementHandle<Element>> {
  const matchingElement = await $textContent(text);

  if (!matchingElement) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${text}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
  }
  return matchingElement;
}

export async function assertSubMenuItemsText(subMenuText: string, expectedOptions: string[]): Promise<void> {
  const subMenuEntryItem = await findSubMenuEntryItem(subMenuText);
  if (!subMenuEntryItem) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${subMenuText}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
  }

  await subMenuEntryItem.hover();
  await waitForFunction(async () => {
    const menus = await $$('.soft-context-menu');
    // Wait for the main menu + the sub menu to be in the DOM
    return menus.length === 2;
  });
  const allMenus = await $$('.soft-context-menu');
  // Each submenu is rendered as a separate context menu and is appended to
  // the DOM after the main context menu, hence the array index.
  const subMenuElement = allMenus[1];
  if (!subMenuElement) {
    assert.fail(`Could not find sub menu for ${subMenuText}`);
  }
  const subMenuItems = await $$('.soft-context-menu-item', subMenuElement);
  const subMenuItemsText = await Promise.all(subMenuItems.map(item => item.evaluate(div => div.textContent)));
  assert.deepEqual(subMenuItemsText, expectedOptions);
}

export async function openSoftContextMenuAndClickOnItem(selector: string, label: string) {
  // Find the selected node, right click.
  await click(selector, {clickOptions: {button: 'right'}});

  // Wait for the context menu option, and click it.
  const root = await waitForSoftContextMenu();
  await click(`[aria-label="${label}"]`, {root});
}
