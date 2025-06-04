// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {
  openNetworkTab,
  selectRequestByName,
  setCacheDisabled,
  setTextFilter,
  waitForSomeRequestsToAppear
} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const NETWORK_VIEW_SELECTOR = '.network-item-view';
const HEADERS_TAB_SELECTOR = '[aria-label=Headers][role="tab"]';
const ACTIVE_HEADERS_TAB_SELECTOR = '[aria-label=Headers][role=tab][aria-selected=true]';
const RESPONSE_HEADERS_SELECTOR = '[aria-label="Request Headers"]';
const HEADER_ROW_SELECTOR = '.row';

async function assertChecked(checkbox: ElementHandle<HTMLInputElement>, expected: boolean) {
  const checked = await checkbox.evaluate(el => el.checked);
  assert.strictEqual(checked, expected);
}

async function openHeadersTab(devToolsPage: DevToolsPage) {
  const networkView = await devToolsPage.waitFor(NETWORK_VIEW_SELECTOR);
  await devToolsPage.click(HEADERS_TAB_SELECTOR, {
    root: networkView,
  });
  await devToolsPage.waitFor(ACTIVE_HEADERS_TAB_SELECTOR, networkView);
}

describe('Network emulation', () => {
  it('can override user agent for service worker requests', async ({devToolsPage, inspectedPage}) => {
    const fixedVersionUAValue =
        'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    await openNetworkTab(devToolsPage);
    const networkConditionsButton = await devToolsPage.waitForAria('More network conditions…');
    await networkConditionsButton.click();
    const section = await devToolsPage.waitFor('.network-config-ua');

    const autoCheckbox = await (await devToolsPage.waitForAria('Use browser default', section)).toElement('input');
    const uaDropdown = await devToolsPage.waitForAria('User agent', section);
    await assertChecked(autoCheckbox, true);
    await autoCheckbox.click();
    await assertChecked(autoCheckbox, false);

    await uaDropdown.click();
    await uaDropdown.select(fixedVersionUAValue);
    await uaDropdown.click();
    await devToolsPage.click('[aria-label="Close drawer"]');

    await setCacheDisabled(true, devToolsPage);
    await inspectedPage.goToResource('application/service-worker-network.html');
    await setTextFilter('is:service-worker-initiated', devToolsPage);

    await waitForSomeRequestsToAppear(2, devToolsPage);
    await selectRequestByName('⚙ main.css', {devToolsPage});
    await openHeadersTab(devToolsPage);

    const responseHeaderSection = await devToolsPage.waitFor(RESPONSE_HEADERS_SELECTOR);
    const headersRows = await devToolsPage.getAllTextContents(HEADER_ROW_SELECTOR, responseHeaderSection);
    assert.include(headersRows, 'user-agent' + fixedVersionUAValue);

    await inspectedPage.evaluate(async () => {
      if (!navigator.serviceWorker) {
        return;
      }
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    });
  });
});
