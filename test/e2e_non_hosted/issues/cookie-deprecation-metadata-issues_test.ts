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

describe('Cookie Deprecation Metadata issue', () => {
  it('should display correct information', async ({devToolsPage}) => {
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'CookieDeprecationMetadataIssue',
        details: {
          cookieDeprecationMetadataIssueDetails: {
            allowedSites: ['example_1.test'],
            optOutPercentage: 25,
            isOptOutTopLevel: true,
            operation: 'ReadCookie',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
      const issue2 = {
        code: 'CookieDeprecationMetadataIssue',
        details: {
          cookieDeprecationMetadataIssueDetails: {
            allowedSites: ['example_2.test'],
            optOutPercentage: 50,
            isOptOutTopLevel: false,
            operation: 'ReadCookie',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue2);
    });
    await expandIssue(devToolsPage);
    const issueElement =
        await getIssueByTitle('Third-party websites are allowed to read cookies on this page', devToolsPage);
    assert.isOk(issueElement);
    const section =
        await getResourcesElement('2 websites allowed to access cookies', issueElement, undefined, devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      ['example_1.test'],
      ['example_2.test (opt-out: 50% - learn more)'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
