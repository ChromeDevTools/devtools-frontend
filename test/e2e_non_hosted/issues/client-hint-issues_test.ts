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

describe('Client Hint issues test', () => {
  it('should display issue when Client Hints are used with invalid origin for DelegateCH', async ({
                                                                                             devToolsPage,
                                                                                             inspectedPage,
                                                                                           }) => {
    await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Client Hint meta tag contained invalid origin', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('2 sources', issueElement, '.affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:1'],
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:4'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });

  it('should display issue when Client Hints are modified by javascript for DelegateCH', async ({
                                                                                           devToolsPage,
                                                                                           inspectedPage,
                                                                                         }) => {
    await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagModifiedHTML.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle('Client Hint meta tag modified by javascript', devToolsPage);
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label', devToolsPage);
    await ensureResourceSectionIsExpanded(section, devToolsPage);
    const expectedTableRows = [['client-hint-issue-DelegateCH-MetaTagModifiedHTML.html:7']];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
  });
});
