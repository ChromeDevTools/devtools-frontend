// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {platform} from '../../conductor/platform.js';
import {clickOnContextMenu, CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', function() {
  const RESULT_SELECTOR = '.console-message-text';
  const LINE_END = platform === 'win32' ? '\r\n' : '\n';

  it('can copy contents for strings', async ({devToolsPage}) => {
    await devToolsPage.useSoftMenu();
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-string-contents', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, `string${LINE_END}content`);
  });

  it('can copy strings as JS literals', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-string-as-js-literal', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '\'string\\ncontent\'');
  });

  it('can copy strings as JSON literals', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('\'string\\ncontent\'\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-string-as-json-literal', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '"string\\ncontent"');
  });

  it('can copy numbers', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('500\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-primitive', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '500');
  });

  it('can copy bigints', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('500n\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-primitive', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, '500n');
  });

  it('can copy booleans', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('true\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-primitive', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, 'true');
  });

  it('can copy undefined', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('undefined\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-primitive', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, 'undefined');
  });

  it('can copy maps', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('new Map([["key1","value1"],["key2","value2"]])\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-object', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(
        copiedContent,
        `new Map([${LINE_END}    [${LINE_END}        "key1",${LINE_END}        "value1"${LINE_END}    ],${
            LINE_END}    [${LINE_END}        "key2",${LINE_END}        "value2"${LINE_END}    ]${LINE_END}])`);
  });

  it('can copy sets', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('new Set(["a","b","c"])\n');
    await devToolsPage.waitFor(RESULT_SELECTOR);
    await clickOnContextMenu(RESULT_SELECTOR, 'copy-object', devToolsPage);
    const copiedContent = await devToolsPage.readClipboard();
    assert.deepEqual(copiedContent, `new Set([${LINE_END}    "a",${LINE_END}    "b",${LINE_END}    "c"${LINE_END}])`);
  });
});
