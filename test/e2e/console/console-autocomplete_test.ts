// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {beforeEach, describe, it} from 'mocha';
import {$, click, getBrowserAndPages, typeText, waitForFunction} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  function typeTextAndWaitForSuggestBox(text: string) {
    return Promise.all([
      waitForFunction(
          async () => {
            const element = await $('.suggest-box');
            return element.asElement();
          },
          `No suggest box after typing '${text}'`, 1000),
      typeText(text),
    ]);
  }

  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await typeText('let object = {a:1, b:2};');
    await frontend.keyboard.press('Enter');
  });

  it('triggers autocompletion for `object.`', async () => {
    await typeTextAndWaitForSuggestBox('object.');
  });

  it('triggers autocompletion for `object?.`', async () => {
    await typeTextAndWaitForSuggestBox('object?.');
  });

  it('triggers autocompletion for `object[`', async () => {
    await typeTextAndWaitForSuggestBox('object[');
  });
});
