// Copyright 2021 The Chromium Authors
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

describe('Client Hint issues test', () => {
  it('should display issue when Client Hints are used with invalid origin for DelegateCH', async ({
                                                                                             devToolsPage,
                                                                                             inspectedPage,
                                                                                           }) => {
    await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(devToolsPage, 'Client Hint meta tag contained invalid origin');
    assert.isOk(issueElement);
    const section = await getResourcesElement(devToolsPage, '2 sources', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:1'],
      ['client-hint-issue-DelegateCH-MetaTagAllowListInvalidOrigin.html:4'],
    ];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });

  it('should display issue when Client Hints are modified by javascript for DelegateCH', async ({
                                                                                           devToolsPage,
                                                                                           inspectedPage,
                                                                                         }) => {
    await inspectedPage.goToResource('issues/client-hint-issue-DelegateCH-MetaTagModifiedHTML.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    const issueElement = await getIssueByTitle(devToolsPage, 'Client Hint meta tag modified by javascript');
    assert.isOk(issueElement);
    const section = await getResourcesElement(devToolsPage, '1 source', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(devToolsPage, section);
    const expectedTableRows = [['client-hint-issue-DelegateCH-MetaTagModifiedHTML.html:7']];
    await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
  });
});
