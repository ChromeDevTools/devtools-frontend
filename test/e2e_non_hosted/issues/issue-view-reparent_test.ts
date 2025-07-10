// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CATEGORY,
  getGroupByCategoryChecked,
  ISSUE,
  navigateToIssuesTab,
  toggleGroupByCategory,
} from '../../e2e/helpers/issues-helpers.js';

describe('IssueView', () => {
  it('should be parented in issueTree when not groupedByCategory', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    const issue = await devToolsPage.waitFor(ISSUE);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isFalse(parent);
  });

  it('should be parented in IssueCategoryView when groupedByCategory', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (!await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    const issue = await devToolsPage.waitFor(ISSUE);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isTrue(parent);
  });

  it('should reparent correctly after parent change', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }
    let category = await devToolsPage.$$(CATEGORY);
    assert.isEmpty(category);
    const issue = await devToolsPage.waitFor(ISSUE);
    const parent = await issue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isFalse(parent);
    await toggleGroupByCategory(devToolsPage);
    category = await devToolsPage.$$(CATEGORY);
    assert.isNotEmpty(category);
    const reparentedIssue = await devToolsPage.waitFor(ISSUE);
    const newParent =
        await reparentedIssue.evaluate(node => node.parentElement?.classList.contains('issue-category-body'));
    assert.isTrue(newParent);
  });
});
