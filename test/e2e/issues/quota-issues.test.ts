// Copyright 2022 The Chromium Authors
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

describe('Quota Issues', () => {
  it('should display correct information', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
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
            type: 'PersistentQuotaType',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
    });

    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(devToolsPage, 'Deprecated feature used');
    assert.isOk(issueElement);
    const section = await getResourcesElement(devToolsPage, '1 source', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      ['empty.html:2'],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
