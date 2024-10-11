// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {waitFor, waitForAria} from '../../shared/helper.js';
import {reloadDevTools} from '../helpers/cross-tool-helper.js';
import {navigateToPerformanceTab, openCaptureSettings} from '../helpers/performance-helpers.js';

describe('The Performance panel', function() {
  // These tests reload panels repeatedly, which can take a longer time.
  this.timeout(20_000);

  beforeEach(async () => {
    await navigateToPerformanceTab('empty');
    await openCaptureSettings('.timeline-settings-pane');
  });

  async function assertOption(select: ElementHandle<HTMLSelectElement>, expected: string) {
    assert.strictEqual(await select.evaluate(el => el.selectedOptions.length), 1);
    assert.strictEqual(await select.evaluate(el => el.selectedOptions[0].getAttribute('aria-label')), expected);
  }

  it('can persist throttling conditions', async () => {
    // Start with no throttling, select an option "A".
    {
      const select = await waitFor<HTMLSelectElement>('select', await waitForAria('Network conditions'));
      await assertOption(select, 'Disabled: No throttling');
      await select.select('3G');
      await assertOption(select, 'Presets: 3G');
    }
    // Verify persistence for "A", select another option "B".
    await reloadDevTools({queryParams: {panel: 'timeline'}});
    {
      const select = await waitFor<HTMLSelectElement>('select', await waitForAria('Network conditions'));
      await assertOption(select, 'Presets: 3G');
      await select.select('Slow 4G');
      await assertOption(select, 'Presets: Slow 4G');
    }
    // Verify persistence for "B", disable throttling.
    await reloadDevTools({queryParams: {panel: 'timeline'}});
    {
      const select = await waitFor<HTMLSelectElement>('select', await waitForAria('Network conditions'));
      await assertOption(select, 'Presets: Slow 4G');
      await select.select('No throttling');
      await assertOption(select, 'Disabled: No throttling');
    }
    // Verify persistence of disabled throttling.
    await reloadDevTools({queryParams: {panel: 'timeline'}});
    {
      const select = await waitFor<HTMLSelectElement>('select', await waitForAria('Network conditions'));
      await assertOption(select, 'Disabled: No throttling');
    }
  });
});
