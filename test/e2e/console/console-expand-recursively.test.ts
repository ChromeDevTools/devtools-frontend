// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  clickOnContextMenu,
  CONSOLE_ALL_MESSAGES_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  navigateToConsoleTab,
  typeIntoConsole,
} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('recursively expands objects', async ({devToolsPage}) => {
    await devToolsPage.useSoftMenu();
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole(devToolsPage, '({a: {x: 21}, b: {y: 42}})');

    const root = await devToolsPage.waitFor('.console-view-object-properties-section');

    // Expand the object node recursively
    await clickOnContextMenu(devToolsPage, '.console-view-object-properties-section', 'expand-recursively');

    // Ensure that both a and b are expanded.
    const [aChildren, bChildren] = await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="a"][aria-expanded=true] ~ ol.expanded', root),
      devToolsPage.waitFor('li[data-object-property-name-for-test="b"][aria-expanded=true] ~ ol.expanded', root),
    ]);

    // The x and y properties should be visible now.
    await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="x"]', aChildren),
      devToolsPage.waitFor('li[data-object-property-name-for-test="y"]', bChildren),
    ]);

    // The [[Prototype]] internal properties should not be expanded now.
    await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', aChildren),
      devToolsPage.waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', bChildren),
    ]);
  });

  it('expands a logged element after it is removed from the DOM', async ({devToolsPage, inspectedPage}) => {
    await navigateToConsoleTab(devToolsPage);

    await inspectedPage.evaluate(() => {
      const el = document.createElement('div');
      const child = document.createElement('span');
      el.appendChild(child);
      // eslint-disable-next-line @devtools/no-document-body-mutation
      document.body.appendChild(el);
      (globalThis as unknown as {removedElement?: HTMLDivElement}).removedElement = el;
      // eslint-disable-next-line no-console
      console.log(el);
    });

    const message = await devToolsPage.waitFor(CONSOLE_ALL_MESSAGES_SELECTOR);
    const treeOutline = await devToolsPage.waitFor('ol.tree-outline', message);
    await devToolsPage.waitFor('.expand-button', treeOutline);
    const initialText = await devToolsPage.waitForFunction(async () => {
      const text = await message.evaluate(el => el.deepTextContent().replace(/\u200b/g, ''));
      return text.length > 0 ? text : undefined;
    });
    assert.strictEqual(initialText, '<div>…</div>');

    await inspectedPage.evaluate(() => {
      (globalThis as unknown as {removedElement?: HTMLDivElement}).removedElement?.remove();
    });

    await devToolsPage.click('.webkit-html-tag-name', {root: treeOutline});
    await devToolsPage.waitFor('li.parent.selected', treeOutline);
    await devToolsPage.pressKey('ArrowRight');

    await devToolsPage.waitFor('li.parent.expanded[aria-expanded="true"]', treeOutline);
    await devToolsPage.drainTaskQueue();
    const expandedText = await devToolsPage.waitForFunction(async () => {
      const text = await message.evaluate(el => el.deepTextContent().replace(/\u200b/g, ''));
      return text !== initialText ? text : undefined;
    });
    assert.strictEqual(expandedText, '<div></div>');
  });
});
