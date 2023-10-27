// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Cookie Deprecation Metadata issue', async () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'CookieDeprecationMetadataIssue',
        'details': {
          'cookieDeprecationMetadataIssueDetails': {
            'allowedSites': ['example_1.test'],
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
      const issue2 = {
        'code': 'CookieDeprecationMetadataIssue',
        'details': {
          'cookieDeprecationMetadataIssueDetails': {
            'allowedSites': ['example_2.test'],
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue2);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle('Third-party websites are allowed to read cookies on this page');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 websites allowed to access cookies', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['example_1.test'],
      ['example_2.test'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
