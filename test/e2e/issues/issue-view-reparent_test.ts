// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, assertNotNullOrUndefined, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  CATEGORY,
  getGroupByCategoryChecked,
  ISSUE,
  navigateToIssuesTab,
  toggleGroupByCategory,
} from '../helpers/issues-helpers.js';

describe('IssueView', async () => {
  it('should be parented in issueTree when not groupedByCategory', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (await getGroupByCategoryChecked()) {
      await toggleGroupByCategory();
    }

    const issue = await waitFor(ISSUE);
    assertNotNullOrUndefined(issue);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isFalse(parent);
  });

  it('should be parented in IssueCategoryView when groupedByCategory', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (!await getGroupByCategoryChecked()) {
      await toggleGroupByCategory();
    }

    const issue = await waitFor(ISSUE);
    assertNotNullOrUndefined(issue);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isTrue(parent);
  });

  it('should reparent correctly after parent change', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (await getGroupByCategoryChecked()) {
      await toggleGroupByCategory();
    }
    let category = await $$(CATEGORY);
    assert.isEmpty(category);
    const issue = await waitFor(ISSUE);
    assertNotNullOrUndefined(issue);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isFalse(parent);
    await toggleGroupByCategory();
    category = await $$(CATEGORY);
    assert.isNotEmpty(category);
    const reparentedIssue = await waitFor(ISSUE);
    assertNotNullOrUndefined(issue);
    const newParent =
        await reparentedIssue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isTrue(newParent);
  });
});
