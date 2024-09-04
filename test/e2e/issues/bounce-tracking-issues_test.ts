// Copyright 2023 The Chromium Authors. All rights reserved.
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

describe('Bounce Tracking issue', () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        code: 'BounceTrackingIssue',
        details: {
          bounceTrackingIssueDetails: {
            trackingSites: ['example_1.test'],
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'BounceTrackingIssue',
        details: {
          bounceTrackingIssueDetails: {
            trackingSites: ['example_2.test'],
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue2);
    });
    await expandIssue();
    const issueElement =
        await getIssueByTitle('Chrome may soon delete state for intermediate websites in a recent navigation chain');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 potentially tracking websites', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['example_1.test'],
      ['example_2.test'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
