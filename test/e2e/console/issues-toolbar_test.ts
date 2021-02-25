// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertIssueButtonLabel, navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('shows the toolbar button for no issue correctly', async () => {
    // Navigate to page which causes no issues.
    await goToResource('console/empty.html');
    await navigateToConsoleTab();

    await assertIssueButtonLabel('No Issues');
  });

  it('shows the toolbar button for one issue correctly', async () => {
    // Navigate to page which causes a SameSiteCookieIssue.
    await goToResource('console/cookie-issue.html');
    await navigateToConsoleTab();

    await assertIssueButtonLabel('1 Issue');
  });

  it('shows the toolbar button for two issues correctly', async () => {
    // Navigate to page which causes two SameSiteCookieIssue.
    await goToResource('console/two-cookie-issues.html');
    await navigateToConsoleTab();

    await assertIssueButtonLabel('2 Issues');
  });

  it('updates the toolbar button correctly', async () => {
    // Navigate to page which causes no issues.
    await goToResource('console/empty.html');
    await navigateToConsoleTab();

    await assertIssueButtonLabel('No Issues');

    const {target} = getBrowserAndPages();
    await target.evaluate(() => {
      // Trigger a SameSiteCookieIssue.
      document.cookie = 'foo=bar;samesite=None';
    });

    await assertIssueButtonLabel('1 Issue');
  });
});
