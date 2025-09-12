// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('correctly expands getters on string properties', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole('new class ClassWithStringGetter { get x() { return 84 / 2; }}', devToolsPage);

    await devToolsPage.click('.console-view-object-properties-section');
    await devToolsPage.click('.object-value-calculate-value-button');

    const value = await devToolsPage.waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands getters on symbol properties', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole('new class ClassWithSymbolGetter { get [Symbol("foo")]() { return 21 + 21; }}', devToolsPage);

    await devToolsPage.click('.console-view-object-properties-section');
    await devToolsPage.click('.object-value-calculate-value-button');

    const value = await devToolsPage.waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });

  it('correctly expands private getters', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole('new class ClassWithPrivateGetter { get #x() { return 21 << 1; }}', devToolsPage);

    await devToolsPage.click('.console-view-object-properties-section');
    await devToolsPage.click('.object-value-calculate-value-button');

    const value = await devToolsPage.waitFor('.object-value-number').then(e => e.evaluate(e => e.textContent));
    assert.strictEqual(value, '42');
  });
});
