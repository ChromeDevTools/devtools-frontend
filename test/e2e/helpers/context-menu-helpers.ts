// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {$, $$, waitForFunction} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

export async function waitForSoftContextMenu(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<Element>> {
  return await devToolsPage.waitFor('.soft-context-menu');
}

export async function assertTopLevelContextMenuItemsText(expectedOptions: string[]): Promise<void> {
  const contextMenu = await $('.soft-context-menu');
  assert.isOk(contextMenu, 'Could not find context menu.');

  const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
  const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));

  assert.deepEqual(allItemsText, expectedOptions);
}

export async function findSubMenuEntryItem(
    text: string,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<puppeteer.ElementHandle<Element>> {
  const matchingElement = await devToolsPage.$textContent(text);

  if (!matchingElement) {
    const allItems = await devToolsPage.$$('.soft-context-menu > .soft-context-menu-item');
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
  assert.isOk(subMenuElement, `Could not find sub menu for ${subMenuText}`);
  const subMenuItems = await $$('.soft-context-menu-item', subMenuElement);
  const subMenuItemsText = await Promise.all(subMenuItems.map(item => item.evaluate(div => div.textContent)));
  assert.deepEqual(subMenuItemsText, expectedOptions);
}

export async function openSoftContextMenuAndClickOnItem(selector: string, label: string, devToolsPage?: DevToolsPage) {
  if (!devToolsPage) {
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage;
  }
  // Find the selected node, right click.
  await devToolsPage.click(selector, {clickOptions: {button: 'right'}});

  // Wait for the context menu option, and click it.
  const root = await waitForSoftContextMenu(devToolsPage);
  await devToolsPage.click(`[aria-label="${label}"]`, {root});
}

export async function openSubMenu(
    selector: string, text: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // Find the selected node, right click.
  await devToolsPage.click(selector, {clickOptions: {button: 'right'}});

  // Wait for the context menu option, and click it.
  await waitForSoftContextMenu(devToolsPage);

  const subMenuEntryItem = await findSubMenuEntryItem(text, devToolsPage);
  await subMenuEntryItem.hover();
}
