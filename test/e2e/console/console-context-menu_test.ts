// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, typeText} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {clickOnContextMenu, CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate('{ navigator.clipboard.writeText = (data) => { globalThis._clipboardData = data; }};');
  });

  const RESULT_SELECTOR = '.console-message-text';

  it('can copy contents for strings', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('\'string\\ncontent\'\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy string contents');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, 'string\ncontent');
  });

  it('can copy strings as JS literals', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('\'string\\ncontent\'\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy string as JavaScript literal');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, '\'string\\ncontent\'');
  });

  it('can copy strings as JSON literals', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('\'string\\ncontent\'\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy string as JSON literal');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, '"string\\ncontent"');
  });

  it('can copy numbers', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('500\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy number');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, '500');
  });

  it('can copy bigints', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('500n\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy bigint');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, '500n');
  });

  it('can copy booleans', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('true\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy boolean');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, 'true');
  });

  it('can copy undefined', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
    await typeText('undefined\n');
    await clickOnContextMenu(RESULT_SELECTOR, 'Copy undefined');
    const copiedContent = await frontend.evaluate('globalThis._clipboardData');
    assert.deepEqual(copiedContent, 'undefined');
  });
});
