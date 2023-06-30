// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {assertNotNullOrUndefined, waitFor, waitForAria, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToPerformanceTab, openCaptureSettings} from '../helpers/performance-helpers.js';

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

describe('The Performance panel', () => {
  it('can emulate navigator.hardwareConcurrency', async () => {
    await navigateToPerformanceTab('empty');
    await openCaptureSettings('.timeline-settings-pane');

    let concurrency = await waitForChangedConcurrency(undefined);

    // Wait for the checkbox to load
    const toggle = await waitForAria('Hardware concurrency') as puppeteer.ElementHandle<HTMLInputElement>;
    await waitForFunction(() => toggle.evaluate((e: HTMLInputElement) => {
      if (e.disabled) {
        return false;
      }
      e.click();
      return true;
    }));

    // Check for the warning icon on the tab header
    const tabHeader = await waitForAria('Performance');
    const tabIcon = await waitFor('devtools-icon', tabHeader);
    {
      const tooltipText = await tabIcon.evaluate(e => e.getAttribute('title'));
      assert.deepEqual(tooltipText, 'Hardware concurrency override is enabled');
    }

    // Check that the warning is shown on the settings gear:
    const gear =
        await waitForAria('- Hardware concurrency override is enabled') as puppeteer.ElementHandle<HTMLElement>;
    const gearColor = await gear.evaluate(
        e => e.firstElementChild && getComputedStyle(e.firstElementChild).getPropertyValue('background-color'));
    assert.deepEqual(gearColor, 'rgb(220, 54, 46)');

    // Check that the concurrency input shows the correct value:
    const input =
        await waitFor('input[aria-label="Override the value reported by navigator.hardwareConcurrency on the page"]');
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
    assertNotNullOrUndefined(button);
    await button.click();

    concurrency = await waitForChangedConcurrency(concurrency);
    assert.deepEqual(concurrency, initialValue);
  });
});
