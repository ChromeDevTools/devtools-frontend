// Copyright 2022 The Chromium Authors. All rights reserved.
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

describe('Privacy Sandbox Extensions API', () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should report privacy sandbox extensions api deprecation issues', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        code: 'DeprecationIssue',
        details: {
          deprecationIssueDetails: {
            sourceCodeLocation: {
              url: 'empty.html',
              lineNumber: 1,
              columnNumber: 1,
            },
            type: 'PrivacySandboxExtensionsAPI',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });

    await expandIssue();
    const issueElement = await getIssueByTitle('Deprecated feature used');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['empty.html:2'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
