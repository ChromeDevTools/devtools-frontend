// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, typeIntoConsole} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('correctly expands getters on string properties', async () => {
    const {frontend} = getBrowserAndPages();

    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole(frontend, 'new class ClassWithStringGetter { get x() { return 84 / 2; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands getters on symbol properties', async () => {
    const {frontend} = getBrowserAndPages();

    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole(frontend, 'new class ClassWithSymbolGetter { get [Symbol("foo")]() { return 21 + 21; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands private getters', async () => {
    const {frontend} = getBrowserAndPages();

    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole(frontend, 'new class ClassWithPrivateGetter { get #x() { return 21 << 1; }}');

    await click('.console-view-object-properties-section');
    await click('.object-value-calculate-value-button');

    const value = await waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });
});
