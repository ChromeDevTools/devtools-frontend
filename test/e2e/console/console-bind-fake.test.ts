// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  focusConsolePrompt,
  getCurrentConsoleMessages,
  navigateToConsoleTab,
  typeIntoConsoleAndWaitForResult,
} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('does not break when Function.prototype.bind is overwritten', async ({devToolsPage, inspectedPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await focusConsolePrompt(devToolsPage);

    // Override Function.prototype.bind in the inspected page.
    await inspectedPage.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).foo = 'fooValue';
      Function.prototype.bind = function() {
        throw new Error(':P');
      };
    });

    // Evaluate 'foo' in the console.
    // Since the override was done in the page, it didn't produce a console message.
    // We expect 1 message after evaluating 'foo;'.
    await typeIntoConsoleAndWaitForResult(devToolsPage, 'foo;', 1, undefined);

    const messages = await getCurrentConsoleMessages(devToolsPage, false, undefined, undefined);

    assert.strictEqual(messages.at(-1), '\'fooValue\'');
  });
});
