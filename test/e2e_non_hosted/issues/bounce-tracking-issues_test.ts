// Copyright 2023 The Chromium Authors. All rights reserved.
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
        'Chrome may soon delete state for intermediate websites in a recent navigation chain', devToolsPage);
    assert.isOk(issueElement);
    const section = await getResourcesElement('2 potentially tracking websites', issueElement, undefined, devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      ['example_1.test'],
      ['example_2.test'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
