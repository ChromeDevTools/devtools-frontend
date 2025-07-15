// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function waitForChangedConcurrency(
    lastConcurrency: number|undefined, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  return await devToolsPage.waitForFunction(async () => {
    const newConcurrency = await inspectedPage.evaluate('navigator.hardwareConcurrency') as number;
    if (newConcurrency !== lastConcurrency) {
      return newConcurrency;
    }
    return undefined;
  });
}

describe('hardwareConcurrency emulation on Sensors panel', () => {
  it('can emulate navigator.hardwareConcurrency', async ({devToolsPage, inspectedPage}) => {
    await openPanelViaMoreTools('Sensors', devToolsPage);
    let concurrency = await waitForChangedConcurrency(undefined, devToolsPage, inspectedPage);

    // Wait for the checkbox to load
    const toggle = await devToolsPage.waitFor('input[title="Hardware concurrency"]');
    await devToolsPage.waitForFunction(() => toggle.evaluate(e => {
      if (e.disabled) {
        return false;
      }
      e.click();
      return true;
    }));

    // Check that the concurrency input shows the correct value:
    const input =
        await devToolsPage.waitFor('input[aria-label="Override the value reported by navigator.hardwareConcurrency"]');
    const initialValue = Number(await input.evaluate(input => {
      return input.value;
    }));

    assert.deepEqual(initialValue, concurrency);

    // Check setting a different value works:
    await input.click({clickCount: 3});
    await input.type(`${initialValue + 1}`);
    concurrency = await waitForChangedConcurrency(concurrency, devToolsPage, inspectedPage);
    assert.deepEqual(concurrency, initialValue + 1);

    // Check that the warning is shown when exceeding the default value:
    const warning = await devToolsPage.waitForAria('Exceeding the default value may degrade system performance.') as
        puppeteer.ElementHandle<HTMLElement>;
    await devToolsPage.waitForFunction(
        async () => await warning.evaluate(e => getComputedStyle(e).visibility) === 'visible');

    // Check that resetting the value works:
    const button = await devToolsPage.waitForAria('Reset to the default value');
    await button.click();

    concurrency = await waitForChangedConcurrency(concurrency, devToolsPage, inspectedPage);
    assert.deepEqual(concurrency, initialValue);
  });
});
