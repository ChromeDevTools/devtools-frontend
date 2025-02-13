// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, step, waitFor} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, typeIntoConsole} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('correctly expands getters on string properties', async () => {
    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole('new class ClassWithStringGetter { get x() { return 84 / 2; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands getters on symbol properties', async () => {
    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole('new class ClassWithSymbolGetter { get [Symbol("foo")]() { return 21 + 21; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands private getters', async () => {
    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole('new class ClassWithPrivateGetter { get #x() { return 21 << 1; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });
});
