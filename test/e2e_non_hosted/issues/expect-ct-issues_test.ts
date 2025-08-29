// Copyright 2022 The Chromium Authors. All rights reserved.
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

describe('Expect-CT Issue', () => {
  it('should display deprecation issue for Expect-CT header', async ({devToolsPage}) => {
    await navigateToIssuesTab(devToolsPage);
    await devToolsPage.evaluate(() => {
      const issue = {
        code: 'DeprecationIssue',
        details: {
          deprecationIssueDetails: {
            sourceCodeLocation: {
              url: 'empty.html',
              lineNumber: 1,
              columnNumber: 1,
            },
            type: 'ExpectCTHeader',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
    });

    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Deprecated feature used', devToolsPage);
    assert.isOk(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      ['empty.html:2'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
