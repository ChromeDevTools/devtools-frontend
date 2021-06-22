// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNull, click, getBrowserAndPages, typeText, waitFor, waitForAria} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  it('shows copy button for strings', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    const stringToEvaluate = '"string content"';

    await typeText(stringToEvaluate);
    await frontend.keyboard.press('Enter');

    const result = await waitFor('.console-message-text');
    await click(result, {clickOptions: {button: 'right'}});
    const copyButton = await waitForAria('Copy string content');

    assertNotNull(copyButton);
  });

  it('shows copy button for numbers', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    const numToEvaluate = '500';

    await typeText(numToEvaluate);
    await frontend.keyboard.press('Enter');

    const result = await waitFor('.console-message-text');
    await click(result, {clickOptions: {button: 'right'}});
    const copyButton = await waitForAria('Copy number');

    assertNotNull(copyButton);
  });
});
