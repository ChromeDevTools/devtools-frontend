// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  expandSelectedNodeRecursively,
  waitForAndClickTreeElementWithPartialText,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

const CLASS_VALUE = 'align_left color_primary en_iconbox_kunden';
const WORD = 'color_primary';
const EDITOR_SELECTOR = '.webkit-html-attribute.being-edited';

async function startEditingClassAttribute(devToolsPage: DevToolsPage): Promise<puppeteer.ElementHandle<Element>> {
  const selected = await devToolsPage.waitFor('.selected[role="treeitem"]');
  // `class` is the first attribute of the test node.
  await devToolsPage.doubleClick('.webkit-html-attribute', {root: selected});
  return await devToolsPage.waitFor(EDITOR_SELECTOR);
}

/**
 * Returns the viewport box of `word` inside the attribute value of the editor.
 */
async function getWordBox(editor: puppeteer.ElementHandle<Element>,
                          word: string): Promise<{left: number, right: number, y: number}> {
  return await editor.evaluate((element, word) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node|null;
    while ((node = walker.nextNode())) {
      const index = node.textContent?.indexOf(word) ?? -1;
      if (index === -1) {
        continue;
      }
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + word.length);
      const rect = range.getBoundingClientRect();
      return {left: rect.left, right: rect.right, y: rect.top + rect.height / 2};
    }
    throw new Error(`Word ${word} not found in the editor`);
  }, word);
}

async function getSelectionText(devToolsPage: DevToolsPage): Promise<string> {
  return await devToolsPage.page.evaluate(() => {
    let root: Document|ShadowRoot = document;
    while (root.activeElement?.shadowRoot) {
      root = root.activeElement.shadowRoot;
    }
    return (root as unknown as {getSelection(): Selection | null}).getSelection()?.toString() ?? '';
  });
}

async function isEditorFocused(devToolsPage: DevToolsPage): Promise<boolean> {
  const active = await devToolsPage.activeElement();
  return await active.evaluate(e => e.classList.contains('being-edited'));
}

describe('Inline attribute editing in the Elements tab', function() {
  async function setup(devToolsPage: DevToolsPage,
                       inspectedPage: InspectedPage): Promise<puppeteer.ElementHandle<Element>> {
    await inspectedPage.goToHtml(`<div class="${CLASS_VALUE}" id="target">content</div>`);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForAndClickTreeElementWithPartialText(devToolsPage, '"target"');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '"target"');
    return await startEditingClassAttribute(devToolsPage);
  }

  it('keeps the editor open and places the caret on click', async ({devToolsPage, inspectedPage}) => {
    const editor = await setup(devToolsPage, inspectedPage);
    const box = await getWordBox(editor, WORD);

    await devToolsPage.page.mouse.click((box.left + box.right) / 2, box.y);
    await devToolsPage.raf();

    assert.isNotNull(await devToolsPage.$(EDITOR_SELECTOR), 'editor must stay open');
    assert.isTrue(await isEditorFocused(devToolsPage), 'editor must keep the focus');
    assert.strictEqual(await getSelectionText(devToolsPage), '', 'click must collapse the selection to a caret');
  });

  it('selects a single word on double click inside the editor', async ({devToolsPage, inspectedPage}) => {
    const editor = await setup(devToolsPage, inspectedPage);
    const box = await getWordBox(editor, WORD);

    await devToolsPage.page.mouse.click((box.left + box.right) / 2, box.y, {count: 2});
    await devToolsPage.raf();

    assert.isNotNull(await devToolsPage.$(EDITOR_SELECTOR), 'editor must stay open');
    assert.isTrue(await isEditorFocused(devToolsPage), 'editor must keep the focus');
    // Windows includes the trailing space in the native word selection.
    assert.strictEqual((await getSelectionText(devToolsPage)).trim(), WORD);
  });

  it('selects text on drag inside the editor and does not drag the node', async ({devToolsPage, inspectedPage}) => {
    const editor = await setup(devToolsPage, inspectedPage);
    const box = await getWordBox(editor, WORD);
    const {mouse} = devToolsPage.page;

    await mouse.move(box.left, box.y);
    await mouse.down();
    await mouse.move((box.left + box.right) / 2, box.y, {steps: 5});
    await mouse.move(box.right, box.y, {steps: 5});
    await mouse.up();
    await devToolsPage.raf();

    assert.isNotNull(await devToolsPage.$(EDITOR_SELECTOR), 'editor must stay open');
    assert.isTrue(await isEditorFocused(devToolsPage), 'editor must keep the focus');
    assert.strictEqual(await getSelectionText(devToolsPage), WORD);
    assert.isNull(await devToolsPage.$('.elements-drag-over'), 'no DOM node drag must start');
  });
});
