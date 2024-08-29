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

describe('Cookie domain attribute should not contain non-ASCII characters issue', () => {
  afterEach(async () => {
    const {target} = getBrowserAndPages();
    const cookies = await target.cookies();
    await target.deleteCookie(...cookies);
  });

  it('should display an issue when a cookie has a domain attribute with non-ASCII characters', async () => {
    await navigateToIssuesTab();
    await goToResource('empty.html');
    const {target} = getBrowserAndPages();

    await target.evaluate(async () => {
      const img = document.createElement('img');
      const done = new Promise(c => {
        img.onerror = c;
      });
      img.src = './issues/cookie-domain-non-ascii.rawresponse';
      document.body.appendChild(img);
      await done;
    });

    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Ensure cookie `Domain` attribute values only contain ASCII characters');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('1 Raw Set-Cookie header', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['tasty_cookie=yum; Domain=öxample.com'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
