// Copyright 2025 The Chromium Authors
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
} from '../../e2e/helpers/issues-helpers.js';

describe('User Reidentification issue', () => {
  it('should display correct information', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'UserReidentificationIssue',
        details: {
          userReidentificationIssueDetails: {
            type: 'BlockedSubresource',
            request: {requestId: 'request-1', url: 'https://example.com/script.js'},
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'UserReidentificationIssue',
        details: {
          userReidentificationIssueDetails: {
            type: 'BlockedFrameNavigation',
            request: {requestId: 'request-2', url: 'https://example2.com/script2.js'},
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Resources suspected of tracking users are blocked', devToolsPage);
    assert.isOk(issueElement);
    const section = await getResourcesElement('2 requests', issueElement, undefined, devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    assert.isOk(section);
    const expectedTableRows = [
      ['script.js'],
      ['script2.js'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
