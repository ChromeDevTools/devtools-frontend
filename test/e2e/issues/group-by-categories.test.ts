// Copyright 2020 The Chromium Authors
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
} from '../helpers/issues-helpers.js';

describe('The Issues tab categories checkbox', () => {
  it('should group issues by associated categories when checked', async ({inspectedPage, devToolsPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (!await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    await expandCategory(devToolsPage);
    await assertCategoryName(devToolsPage, 'Content Security Policy');
    await expandIssue(devToolsPage);
    await assertIssueTitle(devToolsPage, 'Content Security Policy blocks inline execution of scripts and stylesheets');
  });

  it('should use a flat list of issues when not checked', async ({inspectedPage, devToolsPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (await getGroupByCategoryChecked(devToolsPage)) {
      await toggleGroupByCategory(devToolsPage);
    }

    await expandIssue(devToolsPage);
    await assertIssueTitle(devToolsPage, 'Content Security Policy blocks inline execution of scripts and stylesheets');
  });
});
