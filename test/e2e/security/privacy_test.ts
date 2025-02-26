// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {expectError} from '../../conductor/events.js';
import {click, getBrowserAndPages, waitForAria} from '../../shared/helper.js';
import {reloadDevTools} from '../helpers/cross-tool-helper.js';
import {
  navigateToSecurityTab,
} from '../helpers/security-helpers.js';

describe('The Privacy and security panel', function() {
  let preloadScriptId: string;

  afterEach(async () => {
    // The tests end but DevTools might be still doing things resulting
    // in an error caused by the test runner closing or navigating the
    // target page.
    expectError('Inspected target navigated or closed');
    if (!preloadScriptId) {
      return;
    }
    const {frontend} = getBrowserAndPages();
    await frontend.removeScriptToEvaluateOnNewDocument(preloadScriptId);
  });

  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();
    const {identifier} = await frontend.evaluateOnNewDocument(`globalThis.hostConfigForTesting = {
            ...globalThis.hostConfigForTesting,
            devToolsPrivacyUI: {enabled: ${true}},
        };`);
    preloadScriptId = identifier;

    await reloadDevTools();
  });

  it('shows reload bar when controls are changed', async () => {
    await navigateToSecurityTab(/* privcayEnabled=*/ true);
    await click('[aria-label="Temporarily limit third-party cookies, only when DevTools is open"]');

    // Infobar should appear after changing control
    const infoBar = await waitForAria('To apply your updated controls, reload the page');
    infoBar.evaluate(el => assert.isNotNull(el));

    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await click('.infobar-main-row .close-button', {root: infoBar});

    // Infobar should be gone after clicking the close button
    infoBar.evaluate(el => assert.isNotNull(el));
  });
});
