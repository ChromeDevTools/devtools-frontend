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
} from '../../e2e/helpers/issues-helpers.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';

describe('Cookie attribute exceeds max size issues test', () => {
  const clearCookies = async (inspectedPage: InspectedPage) => {
    const cookies = await inspectedPage.page.cookies();
    await inspectedPage.page.deleteCookie(...cookies);
  };

  it('should display issue when a cookie has an attribute that exceeds the max size',
     async ({devToolsPage, inspectedPage}) => {
       try {
         await navigateToIssuesTab(devToolsPage);
         await inspectedPage.goToResource('empty.html');
         await inspectedPage.evaluate(() => {
           const longValue = 'a'.repeat(1025);
           document.cookie = `exceeds_max_size=yes;max-age=${longValue}`;
         });
         await navigateToIssuesTab(devToolsPage);
         await expandIssue(devToolsPage);
         const issueElement =
             await getIssueByTitle('Ensure cookie attribute values don’t exceed 1024 characters', devToolsPage);
         assert.isOk(issueElement);
         const section = await getResourcesElement('1 cookie', issueElement, '.affected-resource-label', devToolsPage);
         await ensureResourceSectionIsExpanded(section, devToolsPage);
         const expectedTableRows = [
           ['Name', 'Domain & Path'],
           ['exceeds_max_size', 'localhost/test/e2e/resources'],
         ];
         await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
       } finally {
         await clearCookies(inspectedPage);
       }
     });
});
