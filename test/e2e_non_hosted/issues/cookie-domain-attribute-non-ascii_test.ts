// Copyright 2022 The Chromium Authors. All rights reserved.
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

describe('Cookie domain attribute should not contain non-ASCII characters issue', () => {
  it('should display an issue when a cookie has a domain attribute with non-ASCII characters',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToIssuesTab(devToolsPage);
       await inspectedPage.goToResource('empty.html');

       await inspectedPage.evaluate(async () => {
         const img = document.createElement('img');
         const done = new Promise(c => {
           img.onerror = c;
         });
         img.src = './issues/cookie-domain-non-ascii.rawresponse';
         // This rule is only relevant for unit tests.
         // eslint-disable-next-line rulesdir/no-document-body-mutation
         document.body.appendChild(img);
         await done;
       });

       await navigateToIssuesTab(devToolsPage);
       await expandIssue(devToolsPage);
       const issueElement =
           await getIssueByTitle('Ensure cookie `Domain` attribute values only contain ASCII characters', devToolsPage);
       assert.isOk(issueElement);
       const section =
           await getResourcesElement('1 Raw Set-Cookie header', issueElement, '.affected-resource-label', devToolsPage);
       await ensureResourceSectionIsExpanded(section, devToolsPage);
       const expectedTableRows = [
         ['tasty_cookie=yum; Domain=öxample.com'],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);

       const cookies = await inspectedPage.page.cookies();
       await inspectedPage.page.deleteCookie(...cookies);
     });
});
