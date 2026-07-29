// Copyright 2023 The Chromium Authors
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

describe('Bounce Tracking issue', () => {
  it('should display correct information', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'BounceTrackingIssue',
        details: {
          bounceTrackingIssueDetails: {
            trackingSites: ['example_1.test'],
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'BounceTrackingIssue',
        details: {
          bounceTrackingIssueDetails: {
            trackingSites: ['example_2.test'],
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(
        devToolsPage, 'Chrome may soon delete state for intermediate websites in a recent navigation chain');
    assert.isOk(issueElement);
    const section = await getResourcesElement(devToolsPage, '2 potentially tracking websites', issueElement, undefined);
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      ['example_1.test'],
      ['example_2.test'],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
