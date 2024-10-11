// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {getBrowserAndPages, selectOption, waitFor} from '../../shared/helper.js';
import {navigateToApplicationTab} from '../helpers/application-helpers.js';

const TEST_HTML_FILE = 'window-controls';

async function assertChecked(checkbox: ElementHandle<HTMLInputElement>, expected: boolean) {
  const checked = await checkbox.evaluate(el => el.checked);
  assert.strictEqual(checked, expected);
}

describe('The Window Controls Overlay', () => {
  it('shows emulation controls when manifest with property display_overide is present', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, TEST_HTML_FILE);
    const windowControlsCheckbox =
        await (await waitFor('[title="Emulate the Window Controls Overlay on"]')).toElement('input');
    const controlsDropDown = await waitFor('.chrome-select');

    // Verify dropdown options
    const options = await controlsDropDown.$$('option');
    const values = await Promise.all(options.map(option => option.evaluate(el => el.value)));
    assert.deepStrictEqual(values, ['Windows', 'Mac', 'Linux']);

    // Verify selecting an option
    void selectOption(await controlsDropDown.toElement('select'), 'Linux');
    const selectedOption = await controlsDropDown.evaluate(input => (input as HTMLInputElement).value);
    assert.strictEqual(selectedOption, 'Linux');

    // Verify clicking the checkbox
    await assertChecked(windowControlsCheckbox, false);
    await windowControlsCheckbox.click();
    await assertChecked(windowControlsCheckbox, true);
  });
});
