// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {expandIssue, expandResourceSection, extractTableFromResourceSection, getIssueByTitle, getResourcesElement, navigateToIssuesTab} from '../helpers/issues-helpers.js';

describe('SAB issues test', async () => {
  beforeEach(async () => {
    await goToResource('issues/sab-issue.html');
  });

  it('should display SharedArrayBuffer violations with the correct affected resources', async () => {
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('SharedArrayBuffer usage is restricted to cross-origin isolated sites');
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('violation', issueElement);
      const text = await section.label.evaluate(el => el.textContent);
      assert.strictEqual(text, '2 violations');
      await expandResourceSection(section);
      const table = await extractTableFromResourceSection(section.content);
      assert.isNotNull(table);
      if (table) {
        assert.strictEqual(table.length, 3);
        assert.deepEqual(table[0], ['Source Location', 'Trigger', 'Status']);
        assert.deepEqual(table[1].slice(0, 2), ['sab-issue.html:4', 'Instantiation']);
        // Accept both values in the status column as that depends on chromium flags.
        assert.include(['warning', 'blocked'], table[1][2]);
        assert.deepEqual(table[2].slice(0, 2), ['sab-issue.html:4', 'Transfer']);
        // Accept both values in the status column as that depends on chromium flags.
        assert.include(['warning', 'blocked'], table[2][2]);
      }
    }
  });
});
