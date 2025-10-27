
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  waitForElementWithPartialText,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('updates DOM for prerender targets', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('recorder/prerender.html');
    await waitForElementWithPartialText('The next page is prerendered', devToolsPage);
    await devToolsPage.click('aria/Page: Main');
    // work around listWasShowing200msAgo in SoftDropDown.ts.
    await new Promise(resolve => setTimeout(resolve, 250));
    await devToolsPage.click('aria/prerendered.html prerender');
    await waitForElementWithPartialText('Is this page prerendered?', devToolsPage);
  });
});
