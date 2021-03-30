// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {ElementHandle} from 'puppeteer';

import {waitFor, waitForAria} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToNetworkTab} from '../helpers/network-helpers.js';

describe('The Network Tab', async function() {
  beforeEach(async () => {
    await navigateToNetworkTab('empty.html');
  });

  async function openNetworkConditions() {
    const networkConditionsButton = await waitForAria('More network conditions…');
    await networkConditionsButton.click();
    return await waitFor('.network-config-accepted-encoding');
  }

  async function assertDisabled(checkbox: ElementHandle<Element>, expected: boolean) {
    const disabled = await checkbox.evaluate(el => el.disabled);
    assert.strictEqual(disabled, expected);
  }

  async function assertChecked(checkbox: ElementHandle<Element>, expected: boolean) {
    const checked = await checkbox.evaluate(el => el.checked);
    assert.strictEqual(checked, expected);
  }

  it('can change accepted content encodings', async () => {
    const section = await openNetworkConditions();
    const autoCheckbox = await waitForAria('Use browser default', section);
    const deflateCheckbox = await waitForAria('deflate', section);
    const gzipCheckbox = await waitForAria('gzip', section);
    const brotliCheckbox = await waitForAria('br', section);
    await brotliCheckbox.evaluate(el => el.scrollIntoView(true));
    await assertChecked(autoCheckbox, true);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, true);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, true);
    await assertDisabled(gzipCheckbox, true);
    await assertDisabled(brotliCheckbox, true);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, true);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, false);
    await assertDisabled(gzipCheckbox, false);
    await assertDisabled(brotliCheckbox, false);
    await brotliCheckbox.click();
    await assertChecked(autoCheckbox, false);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, false);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, false);
    await assertDisabled(gzipCheckbox, false);
    await assertDisabled(brotliCheckbox, false);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, true);
    await assertChecked(deflateCheckbox, true);
    await assertChecked(gzipCheckbox, true);
    await assertChecked(brotliCheckbox, false);
    await assertDisabled(autoCheckbox, false);
    await assertDisabled(deflateCheckbox, true);
    await assertDisabled(gzipCheckbox, true);
    await assertDisabled(brotliCheckbox, true);
  });
});
