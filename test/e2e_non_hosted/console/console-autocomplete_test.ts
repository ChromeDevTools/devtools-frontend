// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  CONSOLE_TAB_SELECTOR,
  CONSOLE_TOOLTIP_SELECTOR,
  focusConsolePrompt,
} from '../../e2e/helpers/console-helpers.js';
import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

// See the comments in console-repl-mode_test to see why this is necessary.
async function autocompleteTest(prefix: string, suffix: string, devToolsPage: DevToolsPage) {
  await devToolsPage.typeText(
      'let object = {aaa:1, bbb:2}; let map = new Map([["somekey", 5], ["some other key", 42]])');
  await devToolsPage.page.keyboard.press('Enter');

  // Wait for the console to be usable again.
  await devToolsPage.waitForFunction(() => {
    return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1);
  });

  const appearPromise = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
  await devToolsPage.typeText(prefix);
  await appearPromise;

  const disappearPromise = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
  await devToolsPage.page.keyboard.press('Escape');
  await disappearPromise;

  const appearPromise2 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
  await devToolsPage.typeText(suffix);
  await appearPromise2;

  // The first auto-suggest result is evaluated and generates a preview, which
  // we wait for so that we don't end the test/navigate with an open
  // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
  await devToolsPage.waitFor('.console-eager-inner-preview > span');
}

describe('The Console Tab', () => {
  async function beforeEach(devToolsPage: DevToolsPage) {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);
  }

  async function afterEach(devToolsPage: DevToolsPage) {
    // Make sure we don't close DevTools while there is an outstanding
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await openSourcesPanel(devToolsPage);
  }

  it('triggers autocompletion for `object.`', async ({devToolsPage}) => {
    await beforeEach(devToolsPage);
    await autocompleteTest('object', '.', devToolsPage);
    await afterEach(devToolsPage);
  });

  it('triggers autocompletion for `object?.`', async ({devToolsPage}) => {
    await beforeEach(devToolsPage);
    await autocompleteTest('object', '?.', devToolsPage);
    await afterEach(devToolsPage);
  });

  it('triggers autocompletion for `object[`', async ({devToolsPage}) => {
    await beforeEach(devToolsPage);
    await autocompleteTest('object', '[', devToolsPage);
    await afterEach(devToolsPage);
  });

  it('triggers autocompletion for `map.get(`', async ({devToolsPage}) => {
    await beforeEach(devToolsPage);
    await autocompleteTest('map.get', '(', devToolsPage);
    await afterEach(devToolsPage);
  });

  it('triggers autocompletion for `foo.#my`', async ({devToolsPage}) => {
    await beforeEach(devToolsPage);
    await devToolsPage.typeText('class Foo {#myPrivateField = 1}; let foo = new Foo');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1);
    });

    const appearPromise = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('foo');
    await appearPromise;

    const disappearPromise = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.page.keyboard.press('Escape');
    await disappearPromise;

    const appearPromise2 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('.#my');
    await appearPromise2;
    await afterEach(devToolsPage);
  });
});
