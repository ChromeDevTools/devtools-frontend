// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../../e2e/helpers/issues-helpers.js';
import {assertNotNullOrUndefined} from '../../shared/helper.js';

describe('Deprecation Issues', () => {
  it('evaluation works', async ({inspectedPage, devToolsPage}) => {
    await inspectedPage.goTo('about:blank');
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
            // This value needs maintanance to always point to an exising deprecation.
            type: 'LocalCSSFileExtensionRejected',
          },
        },
      };
      // @ts-expect-error
      window.addIssueForTest(issue);
    });

    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Deprecated feature used', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      ['empty.html:2'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
