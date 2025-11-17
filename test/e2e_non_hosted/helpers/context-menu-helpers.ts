// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

export async function waitForSoftContextMenu(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<puppeteer.ElementHandle<Element>> {
  return await devToolsPage.waitFor('.soft-context-menu');
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
