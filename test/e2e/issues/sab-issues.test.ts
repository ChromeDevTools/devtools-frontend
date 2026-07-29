// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ensureResourceSectionIsExpanded,
  getAndExpandSpecificIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('SAB issues test', () => {
  it('should display SharedArrayBuffer violations with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/sab-issue.rawresponse');
       await navigateToIssuesTab(devToolsPage);
       const issueElement = await getAndExpandSpecificIssueByTitle(
           devToolsPage, 'SharedArrayBuffer usage is restricted to cross-origin isolated sites');
       assert.isNotNull(issueElement);
       if (issueElement) {
         const section = await getResourcesElement(devToolsPage, 'violation', issueElement, undefined);
         const text = await section.label.evaluate(el => el.textContent);
         assert.strictEqual(text, '2 violations');
         await ensureResourceSectionIsExpanded(devToolsPage, section);
         const expectedTableRows = [
           ['Source Location', 'Trigger', 'Status'],
           ['corp-frame.rawresponse:1', 'Instantiation', /warning|blocked/],
           ['corp-frame.rawresponse:1', 'Transfer', /warning|blocked/],
         ];
         await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
       }
     });
});
