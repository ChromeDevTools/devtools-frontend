// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertCategoryName,
  assertIssueTitle,
  expandCategory,
  expandIssue,
  getGroupByCategoryChecked,
  navigateToIssuesTab,
  toggleGroupByCategory,
} from '../../e2e/helpers/issues-helpers.js';

describe('The Issues tab categories checkbox', () => {
  it('should group issues by associated categories when checked', async ({inspectedPage, devToolsPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (!await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    await expandCategory(devToolsPage);
    await assertCategoryName('Content Security Policy', devToolsPage);
    await expandIssue(devToolsPage);
    await assertIssueTitle('Content Security Policy blocks inline execution of scripts and stylesheets', devToolsPage);
  });

  it('should use a flat list of issues when not checked', async ({inspectedPage, devToolsPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    await expandIssue(devToolsPage);
    await assertIssueTitle('Content Security Policy blocks inline execution of scripts and stylesheets', devToolsPage);
  });
});
