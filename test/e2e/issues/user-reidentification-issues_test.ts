// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('User Reidentification issue', () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate(() => {
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
    await expandIssue();
    const issueElement = await getIssueByTitle('Resources suspected of tracking users are blocked');
    assert.isOk(issueElement);
    const section = await getResourcesElement('2 requests', issueElement);
    await ensureResourceSectionIsExpanded(section);
    assert.isOk(section);
    const expectedTableRows = [
      ['script.js'],
      ['script2.js'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
