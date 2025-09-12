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
} from '../../e2e/helpers/issues-helpers.js';

describe('SAB issues test', () => {
  it('should display SharedArrayBuffer violations with the correct affected resources',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/sab-issue.rawresponse');
       await navigateToIssuesTab(devToolsPage);
       const issueElement = await getAndExpandSpecificIssueByTitle(
           'SharedArrayBuffer usage is restricted to cross-origin isolated sites', devToolsPage);
       assert.isNotNull(issueElement);
       if (issueElement) {
         const section = await getResourcesElement('violation', issueElement, undefined, devToolsPage);
         const text = await section.label.evaluate(el => el.textContent);
         assert.strictEqual(text, '2 violations');
         await ensureResourceSectionIsExpanded(section, devToolsPage);
         const expectedTableRows = [
           ['Source Location', 'Trigger', 'Status'],
           ['corp-frame.rawresponse:1', 'Instantiation', /warning|blocked/],
           ['corp-frame.rawresponse:1', 'Transfer', /warning|blocked/],
         ];
         await waitForTableFromResourceSectionContents(section.content, expectedTableRows, devToolsPage);
       }
     });
});
