// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource} from '../../shared/helper.js';

import {
  ensureResourceSectionIsExpanded,
  getAndExpandSpecificIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('SAB issues test', () => {
  beforeEach(async () => {
    await goToResource('issues/sab-issue.rawresponse');
  });

  it('should display SharedArrayBuffer violations with the correct affected resources', async () => {
    await navigateToIssuesTab();
    const issueElement =
        await getAndExpandSpecificIssueByTitle('SharedArrayBuffer usage is restricted to cross-origin isolated sites');
    assert.isNotNull(issueElement);
    if (issueElement) {
      const section = await getResourcesElement('violation', issueElement);
      const text = await section.label.evaluate(el => el.textContent);
      assert.strictEqual(text, '2 violations');
      await ensureResourceSectionIsExpanded(section);
      const expectedTableRows = [
        ['Source Location', 'Trigger', 'Status'],
        ['corp-frame.rawresponse:1', 'Instantiation', /warning|blocked/],
        ['corp-frame.rawresponse:1', 'Transfer', /warning|blocked/],
      ];
      await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
    }
  });
});
