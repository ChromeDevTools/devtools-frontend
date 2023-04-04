// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertNotNullOrUndefined,
  getTestServerPort,
  goToResource,
  waitForNone,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  ensureResourceSectionIsExpanded,
  expandIssue,
  getIssueByTitle,
  getResourcesElement,
  ISSUE,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Cross-origin portal post message issue', async () => {
  it('should display correct information', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Cross-origin portal post messages are blocked on your site');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 resource', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Frame'],
      [`https://localhost:${getTestServerPort()}/test/e2e/resources/issues/cross-origin-portal-post.html`],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should remove issue on update', async () => {
    await goToResource('issues/cross-origin-portal-post.html');
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Cross-origin portal post messages are blocked on your site');
    assertNotNullOrUndefined(issueElement);
    await goToResource('issues/cross-origin-portal.html');
    await navigateToIssuesTab();
    await waitForNone(ISSUE);
  });
});
