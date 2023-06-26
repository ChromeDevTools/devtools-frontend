// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import type * as puppeteer from 'puppeteer-core';

import {$, $$, $textContent, platform, waitFor, waitForFunction} from '../../shared/helper.js';

export function platformSpecificTextForSubMenuEntryItem(text: string): string {
  /**
   * On Mac the context menu adds the ▶ icon to the sub menu entry points in the
   * context menu, but on Linux/Windows it uses an image. So if we're running on
   * Mac, we append the search text with the icon, else we do not.
   */
  return platform === 'mac' ? `${text}▶` : text;
}

export function waitForSoftContextMenu(): Promise<puppeteer.ElementHandle<Element>> {
  return waitFor('.soft-context-menu');
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
export async function findSubMenuEntryItem(
    text: string, hasSubmenu: boolean): Promise<puppeteer.ElementHandle<Element>> {
  const textToSearchFor = hasSubmenu ? platformSpecificTextForSubMenuEntryItem(text) : text;
  const matchingElement = await $textContent(textToSearchFor);

  if (!matchingElement) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${textToSearchFor}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
  }
  return matchingElement;
}

export async function assertSubMenuItemsText(subMenuText: string, expectedOptions: string[]): Promise<void> {
  const subMenuEntryItem = await findSubMenuEntryItem(subMenuText, true);
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
