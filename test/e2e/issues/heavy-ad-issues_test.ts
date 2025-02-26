// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Heavy Ad issue', () => {
  beforeEach(async () => {
    await goToResource('elements/quirks-mode.html');
  });

  // Frequently fails on multiple CQ bots. https://luci-analysis.appspot.com/p/devtools-frontend/clusters?q=heavy&interval=7d
  it.skip('[crbug.com/375892666]: should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        code: 'HeavyAdIssue',
        details: {
          heavyAdIssueDetails: {
            resolution: 'HeavyAdBlocked',
            reason: 'NetworkTotalLimit',
            frame: {frameId: 'main'},
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'HeavyAdIssue',
        details: {
          heavyAdIssueDetails: {
            resolution: 'HeavyAdWarning',
            reason: 'CpuPeakLimit',
            frame: {frameId: 'main'},
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle('An ad on your site has exceeded resource limits');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 resources', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Limit exceeded', 'Resolution Status', 'Frame URL'],
      ['Network limit', 'Removed', /.*/],
      ['CPU peak limit', 'Warned', /.*/],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
