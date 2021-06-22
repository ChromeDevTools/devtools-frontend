// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, pasteText, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('Logging and preview of Trusted Types objects in the Console', async () => {
  it('Logging of Trusted Type HTML object', async () => {
    const {frontend} = getBrowserAndPages();
    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });
    await pasteText(`policy = trustedTypes.createPolicy("generalPolicy", {
      createHTML: string => string
    });`);
    await frontend.keyboard.press('Enter');

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    await pasteText('x = policy.createHTML("<foo>"); x');
    await frontend.keyboard.press('Enter');

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });

    await step('get the result text from the console', async () => {
      const evaluateResult = await frontend.evaluate(() => {
        return document.querySelectorAll('.console-user-command-result')[1].textContent;
      });
      assert.strictEqual(evaluateResult, 'TrustedHTML \'<foo>\'', 'Trusted Type log is not the expected.');
    });
  });

  it('Preview of Trusted Type HTML object', async () => {
    const {frontend} = getBrowserAndPages();
    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });
    await pasteText(`policy = trustedTypes.createPolicy("generalPolicy", {
      createHTML: string => string
    });`);
    await frontend.keyboard.press('Enter');

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    await pasteText('x = policy.createHTML("<foo>")');
    await frontend.keyboard.press('Enter');

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });
    await pasteText('x');

    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-eager-inner-preview').length === 1 &&
          document.querySelectorAll('.console-eager-inner-preview')[0].textContent;
    });

    await step('Get the preview message', async () => {
      const evaluateResult = await frontend.evaluate(() => {
        return document.querySelectorAll('.console-eager-inner-preview')[0].textContent;
      });
      assert.strictEqual(evaluateResult, 'TrustedHTML "<foo>"', 'Trusted Type preview is not the expected');
    });
  });
});
