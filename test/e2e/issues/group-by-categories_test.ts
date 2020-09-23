// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertCategoryName, assertIssueTitle, expandCategory, expandIssue, getGroupByCategoryChecked, navigateToIssuesTab, toggleGroupByCategory} from '../helpers/issues-helpers.js';

describe('The Issues tab categories checkbox', async () => {
  it('should group issues by associated categories when checked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (!await getGroupByCategoryChecked()) {
      await toggleGroupByCategory();
    }

    await expandCategory();
    await assertCategoryName('Content Security Policy');
    await expandIssue();
    await assertIssueTitle('Content Security Policy blocks inline execution of scripts and stylesheets');
  });

  it('should use a flat list of issues when not checked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (await getGroupByCategoryChecked()) {
      await toggleGroupByCategory();
    }

    await expandIssue();
    await assertIssueTitle('Content Security Policy blocks inline execution of scripts and stylesheets');
  });
});
