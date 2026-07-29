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
import type {InspectedPage} from '../shared/target-helper.js';

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
             await getIssueByTitle(devToolsPage, 'Ensure cookie attribute values don’t exceed 1024 characters');
         assert.isOk(issueElement);
         const section = await getResourcesElement(devToolsPage, '1 cookie', issueElement, '.affected-resource-label');
         await ensureResourceSectionIsExpanded(devToolsPage, section);
         const expectedTableRows = [
           ['Name', 'Domain & Path'],
           ['exceeds_max_size', 'localhost/test/e2e/resources'],
         ];
         await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
       } finally {
         await clearCookies(inspectedPage);
       }
     });
});
