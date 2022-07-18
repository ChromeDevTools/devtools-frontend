// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Client Hint issues test', async () => {
  it('should display issue when Client Hints are used with invalid origin for DelegateCH', async () => {
    await goToResource('issues/client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Client Hint meta tag contained invalid origin');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 sources', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:1'],
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:4'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when Client Hints are modified by javascript for DelegateCH', async () => {
    await goToResource('issues/client-hint-issue-DelegateCH-MetaTagModifiedHTML.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Client Hint meta tag modified by javascript');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['client-hint-issue-DelegateCH-MetaTagModifiedHTML.html:7'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
