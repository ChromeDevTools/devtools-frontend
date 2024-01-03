// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, hover, raf, waitFor} from '../../../shared/helper.js';
import {describe, it, itScreenshot} from '../../../shared/mocha-extensions.js';
import {assertElementScreenshotUnchanged} from '../../../shared/screenshots.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../helpers/shared.js';

describe('ConsoleInsight', function() {
  preloadForCodeCoverage('console_insight/static.html');

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders initial state', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await waitFor('.refine-button');
    await assertElementScreenshotUnchanged(await waitFor('devtools-console-insight'), 'explain/console_insight.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders refined state', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await click('.refine-button');
    await assertElementScreenshotUnchanged(
        await waitFor('devtools-console-insight'), 'explain/console_insight_refined.png', 3);
  });

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders tooltip', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await hover('.info');
    await assertElementScreenshotUnchanged(
        await waitFor('[data-devtools-glass-pane]'), 'explain/console_insight_info.png', 3);
  });

  async function isElementFocused(selector: string) {
    const {frontend} = getBrowserAndPages();

    return await frontend.evaluate(selector => {
      const getActiveElement = (root: Element|null): Element|null => {
        if (!root) {
          return null;
        }
        if ('shadowRoot' in root && root.shadowRoot?.activeElement) {
          return getActiveElement(root.shadowRoot?.activeElement);
        }
        return root;
      };
      const element = getActiveElement(document.activeElement);
      if (!element) {
        return false;
      }
      return element.matches(selector) ||
          /* button inside devtools-button */ (element.getRootNode() as ShadowRoot).host?.matches(selector);
    }, selector);
  }

  async function tabToInfo() {
    const {frontend} = getBrowserAndPages();
    while (!(await isElementFocused('.info'))) {
      await frontend.keyboard.press('Tab');
      await raf(frontend);
    }
  }

  // eslint-disable-next-line rulesdir/ban_screenshot_test_outside_perf_panel
  itScreenshot('renders tooltip via keyboard', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await tabToInfo();
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press(' ');
    assert(await isElementFocused('[role=document]'));
  });

  it('can navigate within the tooltip using keyboard', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await tabToInfo();

    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press(' ');
    await raf(frontend);
    assert(await isElementFocused('[role=document]'));
    await frontend.keyboard.press('Tab');
    await raf(frontend);
    assert(await isElementFocused('x-link'));
    await frontend.keyboard.press('Tab');
    await raf(frontend);
    assert(await isElementFocused('x-link'));
    await frontend.keyboard.press('Tab');
    await raf(frontend);
    assert(await isElementFocused('x-link'));
    await frontend.keyboard.press('Tab');
    await raf(frontend);
    assert(await isElementFocused('x-link'));
  });

  it('can close the tooltip using keyboard', async () => {
    await loadComponentDocExample('console_insight/static.html');
    await tabToInfo();

    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press(' ');
    await raf(frontend);
    assert(await isElementFocused('[role=document]'));
    assert.notOk(await isElementFocused('.info'));
    await frontend.keyboard.press('Escape');
    await raf(frontend);
    assert(await isElementFocused('.info'));
  });
});
