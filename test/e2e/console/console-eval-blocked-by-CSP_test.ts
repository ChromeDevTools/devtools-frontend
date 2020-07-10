// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, goToResource, typeText, waitFor, waitForNone} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  it('eval in console succeeds for pages with no CSP', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await typeEvalAndDismissAutocomplete(frontend);

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const evaluateResult = await frontend.evaluate(() => {
      return document.querySelectorAll('.console-user-command-result')[0].textContent;
    });

    assert.strictEqual(evaluateResult, '2', 'Eval result was not correct');
  });

  async function typeEvalAndDismissAutocomplete(frontend: puppeteer.Page) {
    // See the comments in console-repl-mode_test to see why this is necessary.
    const appearPromise = waitFor('.suggest-box');
    await typeText('eval(');
    await appearPromise;

    const disappearPromise = waitForNone('.suggest-box');
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    await typeText('"1+1");');
    await frontend.keyboard.press('Enter');
  }

  it('eval in console fails for pages with CSP that blocks eval', async () => {
    await goToResource('console/CSP-blocks-eval.html');

    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await typeEvalAndDismissAutocomplete(frontend);

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const evaluateResult = await frontend.evaluate(() => {
      return document.querySelectorAll('.console-user-command-result')[0].textContent;
    });

    assert.include(
        evaluateResult || '', '\'unsafe-eval\' is not an allowed source of script',
        'Didn\'t find expected CSP error message');
  });
});
