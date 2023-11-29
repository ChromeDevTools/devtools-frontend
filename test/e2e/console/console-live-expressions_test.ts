// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, typeText, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR, CONSOLE_TAB_SELECTOR} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('commits live expression with Enter', async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);
    await click(CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR);

    const consolePin = await waitFor('.console-pin');

    await waitFor('.cm-editor.cm-focused', consolePin);
    await typeText('1 + 2 + 3');

    const editorUnfocusedPromise = waitForNone('.cm-editor.cm-focused', consolePin);
    await frontend.keyboard.press('Enter');
    await editorUnfocusedPromise;
  });
});
