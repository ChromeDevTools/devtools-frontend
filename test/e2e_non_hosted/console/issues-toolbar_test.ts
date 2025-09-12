// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  navigateToConsoleTab,
  waitForIssueButtonLabel,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('shows the toolbar button for no issue correctly', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page which causes no issues.
    await inspectedPage.goToResource('empty.html');
    await navigateToConsoleTab(devToolsPage);

    await waitForIssueButtonLabel('No Issues', devToolsPage);
  });

  it('shows the toolbar button for one issue correctly', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page which causes a single issue.
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToConsoleTab(devToolsPage);

    await waitForIssueButtonLabel('1 Issue:', devToolsPage);
  });

  it('shows the toolbar button for three issues correctly', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page which causes three issues.
    await inspectedPage.goToResource('issues/cors-issue-2.html');
    await navigateToConsoleTab(devToolsPage);

    await waitForIssueButtonLabel('3 Issues:', devToolsPage);
  });

  it('updates the toolbar button correctly', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page which causes no issues.
    await inspectedPage.goToResource('empty.html');
    await navigateToConsoleTab(devToolsPage);

    await waitForIssueButtonLabel('No Issues', devToolsPage);

    await inspectedPage.evaluate(() => {
      // Trigger a CookieIssue.
      document.cookie = 'foo=bar;samesite=None';
    });

    await waitForIssueButtonLabel('1 Issue:', devToolsPage);
  });
});
