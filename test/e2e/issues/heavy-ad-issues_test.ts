// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, expandResourceSection, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('Heavy Ad issue', async () => {
  beforeEach(async () => {
    await goToResource('issues/sab-issue.html');
  });

  it('should display correct information', async () => {
    await navigateToIssuesTab();
    const {frontend} = getBrowserAndPages();
    frontend.evaluate(() => {
      const issue = {
        'code': 'HeavyAdIssue',
        'details': {
          'heavyAdIssueDetails': {
            'resolution': 'HeavyAdBlocked',
            'reason': 'NetworkTotalLimit',
            'frame': {frameId: 'main'},
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue);
      const issue2 = {
        'code': 'HeavyAdIssue',
        'details': {
          'heavyAdIssueDetails': {
            'resolution': 'HeavyAdWarning',
            'reason': 'CpuPeakLimit',
            'frame': {frameId: 'main'},
          },
        },
      };
      // @ts-ignore
      window.addIssueForTest(issue2);
    });
    await expandIssue();
    const issueElement = await getIssueByTitle('An ad on your site has exceeded resource limits');
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('2 resources', issueElement);
      await expandResourceSection(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 3);
        assert.deepEqual(table[0], ['Limit exceeded', 'Resolution Status', 'Frame URL']);
        assert.deepEqual(table[1].slice(0, 2), ['Network limit', 'Removed']);
        assert.deepEqual(table[2].slice(0, 2), ['CPU peak limit', 'Warned']);
      }
    }
  });
});
