// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNull, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {ensureResourceSectionIsExpanded, expandIssue, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Navigator User Agent Issues', async () => {
  beforeEach(async () => {
    await goToResource('empty.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        code: 'NavigatorUserAgentIssue',
        details: {
          navigatorUserAgentIssueDetails: {
            location: {
              url: 'empty.html',
              lineNumber: 1,
              columnNumber: 1,
            },
            url: 'empty.html',
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
    });

    await expandIssue();
    const issueElement =
        await getIssueByTitle('Audit usage of navigator.userAgent, navigator.appVersion, and navigator.platform');
    assertNotNull(issueElement);
    const section = await getResourcesElement('1 source', issueElement, '.affected-resource-label');
    await ensureResourceSectionIsExpanded(section);
    const table = await extractTableFromResourceSection(section.content);
    assertNotNull(table);
    assert.strictEqual(table.length, 1);
    assert.deepEqual(table[0], [
      'empty.html:2',
    ]);
  });
});
