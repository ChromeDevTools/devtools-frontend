
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  waitForElementWithPartialText,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('updates DOM for prerender targets', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('recorder/prerender.html');
    await waitForElementWithPartialText(devToolsPage, 'The next page is prerendered');
    await devToolsPage.click('aria/Page: Main');
    await devToolsPage.click('aria/prerendered.html prerender');
    await waitForElementWithPartialText(devToolsPage, 'Is this page prerendered?');
  });

  it('updates DOM for navigations to prerender targets', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('recorder/prerender.html');
    await waitForElementWithPartialText(devToolsPage, 'The next page is prerendered');
    // TODO: cannot use click due to helper not handling target close correctly.
    await inspectedPage.pressKey('Tab');
    await inspectedPage.pressKeyAndExpectNavigation('Enter');
    await waitForElementWithPartialText(devToolsPage, 'Is this page prerendered?');
  });
});
