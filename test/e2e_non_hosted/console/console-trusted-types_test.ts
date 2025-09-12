// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
} from '../../e2e/helpers/console-helpers.js';

describe('Logging and preview of Trusted Types objects in the Console', () => {
  it('Logging of Trusted Type HTML object', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.pasteText(`policy = trustedTypes.createPolicy("generalPolicy", {
      createHTML: string => string
    });`);
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    await devToolsPage.pasteText('x = policy.createHTML("<foo>"); x');
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });

    const evaluateResult = await devToolsPage.evaluate(() => {
      return document.querySelectorAll('.console-user-command-result')[1].textContent;
    });
    assert.strictEqual(evaluateResult, 'TrustedHTML \'<foo>\'', 'Trusted Type log is not the expected.');
  });

  it('Preview of Trusted Type HTML object', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.pasteText(`policy = trustedTypes.createPolicy("generalPolicy", {
      createHTML: string => string
    });`);
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    await devToolsPage.pasteText('x = policy.createHTML("<foo>")');
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });
    await devToolsPage.pasteText('x');

    await devToolsPage.page.waitForFunction(() => {
      return document.querySelectorAll('.console-eager-inner-preview').length === 1 &&
          document.querySelectorAll('.console-eager-inner-preview')[0].textContent;
    });

    const evaluateResult = await devToolsPage.evaluate(() => {
      return document.querySelectorAll('.console-eager-inner-preview')[0].textContent;
    });
    assert.strictEqual(evaluateResult, 'TrustedHTML "<foo>"', 'Trusted Type preview is not the expected');
  });
});
