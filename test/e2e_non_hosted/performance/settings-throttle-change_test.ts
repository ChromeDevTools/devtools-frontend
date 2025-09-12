// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  openCaptureSettings
} from '../../e2e/helpers/performance-helpers.js';
import {expectVeEvents, veChange} from '../../e2e/helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  async function setupPerformancePanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToPerformanceTab('empty', devToolsPage, inspectedPage);
    await openCaptureSettings('.timeline-settings-pane', devToolsPage);
  }

  async function assertOption(select: ElementHandle<HTMLSelectElement>, expected: string) {
    assert.strictEqual(await select.evaluate(el => el.selectedOptions.length), 1);
    assert.strictEqual(await select.evaluate(el => el.selectedOptions[0].getAttribute('aria-label')), expected);
  }

  it('can change network throttling conditions and logs the change event', async ({devToolsPage, inspectedPage}) => {
    await setupPerformancePanel(devToolsPage, inspectedPage);
    const veRoot = 'Panel: timeline > Pane: timeline-settings-pane';
    const networkDropdownVeName = 'DropDown: active-network-condition-key';

    // Initial state: No throttling, then change to "3G"
    const select = await devToolsPage.waitForAria<HTMLSelectElement>('Network conditions');
    await assertOption(select, 'Disabled: No throttling');
    await select.select('3G');
    await assertOption(select, 'Presets: 3G');
    await expectVeEvents([veChange(networkDropdownVeName)], veRoot, devToolsPage);

    // Change to "Slow 4G"
    await assertOption(select, 'Presets: 3G');
    await select.select('Slow 4G');
    await assertOption(select, 'Presets: Slow 4G');
    await expectVeEvents([veChange(networkDropdownVeName)], veRoot, devToolsPage);

    // Change back to "No throttling"
    await select.select('No throttling');
    await assertOption(select, 'Disabled: No throttling');
    await expectVeEvents([veChange(networkDropdownVeName)], veRoot, devToolsPage);
  });
});
