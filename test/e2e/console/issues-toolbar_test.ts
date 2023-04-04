// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToConsoleTab, waitForIssueButtonLabel} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('shows the toolbar button for no issue correctly', async () => {
    // Navigate to page which causes no issues.
    await goToResource('empty.html');
    await navigateToConsoleTab();

    await waitForIssueButtonLabel('No Issues');
  });

  it('shows the toolbar button for one issue correctly', async () => {
    // Navigate to page which causes a single issue.
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToConsoleTab();

    await waitForIssueButtonLabel('1 Issue:');
  });

  it('shows the toolbar button for three issues correctly', async () => {
    // Navigate to page which causes three issues.
    await goToResource('issues/cors-issue-2.html');
    await navigateToConsoleTab();

    await waitForIssueButtonLabel('3 Issues:');
  });

  it('updates the toolbar button correctly', async () => {
    // Navigate to page which causes no issues.
    await goToResource('empty.html');
    await navigateToConsoleTab();

    await waitForIssueButtonLabel('No Issues');

    const {target} = getBrowserAndPages();
    await target.evaluate(() => {
      // Trigger a CookieIssue.
      document.cookie = 'foo=bar;samesite=None';
    });

    await waitForIssueButtonLabel('1 Issue:');
  });
});
