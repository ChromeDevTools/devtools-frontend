// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Heavy Ad issue', () => {
  it('should display correct information', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/quirks-mode.html');
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
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
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(devToolsPage, 'An ad on your site has exceeded resource limits');
    assert.isOk(issueElement);
    const section = await getResourcesElement(devToolsPage, '2 resources', issueElement, undefined);
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      ['Limit exceeded', 'Resolution status', 'Frame URL'],
      ['Network limit', 'Removed', /.*/],
      ['CPU peak limit', 'Warned', /.*/],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
