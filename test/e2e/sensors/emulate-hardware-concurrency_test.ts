// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {step, waitFor, waitForAria, waitForFunction} from '../../shared/helper.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

async function waitForChangedConcurrency(lastConcurrency: number|undefined) {
  const {target} = getBrowserAndPages();
  return waitForFunction(async () => {
    const newConcurrency = await target.evaluate('navigator.hardwareConcurrency') as number;
    if (newConcurrency !== lastConcurrency) {
      return newConcurrency;
    }
    return undefined;
  });
}

describe('hardwareConcurrency emulation on Sensors panel', () => {
  beforeEach(async () => {
    await step('opening sensors panel', async () => {
      await openPanelViaMoreTools('Sensors');
    });
  });

  it('can emulate navigator.hardwareConcurrency', async () => {
    let concurrency = await waitForChangedConcurrency(undefined);

    // Wait for the checkbox to load
    const toggle = await waitFor('input[title="Hardware concurrency"]') as puppeteer.ElementHandle<HTMLInputElement>;
    await waitForFunction(() => toggle.evaluate((e: HTMLInputElement) => {
      if (e.disabled) {
        return false;
      }
      e.click();
      return true;
    }));

    // Check that the concurrency input shows the correct value:
    const input = await waitFor('input[aria-label="Override the value reported by navigator.hardwareConcurrency"]');
    const initialValue = Number(await input.evaluate(input => {
      return (input as HTMLInputElement).value;
    }));

    assert.deepEqual(initialValue, concurrency);

    // Check setting a different value works:
    await input.click({clickCount: 3});
    await input.type(`${initialValue + 1}`);
    concurrency = await waitForChangedConcurrency(concurrency);
    assert.deepEqual(concurrency, initialValue + 1);

    // Check that the warning is shown when exceeding the default value:
    const warning = await waitForAria('Exceeding the default value may degrade system performance.') as
        puppeteer.ElementHandle<HTMLElement>;
    await waitForFunction(async () => await warning.evaluate(e => getComputedStyle(e).visibility) === 'visible');

    // Check that resetting the value works:
    const button = await waitForAria('Reset to the default value');
    await button.click();

    concurrency = await waitForChangedConcurrency(concurrency);
    assert.deepEqual(concurrency, initialValue);
  });
});
