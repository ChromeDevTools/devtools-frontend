// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  expandKind,
  getGroupByKindChecked,
  ISSUE,
  navigateToIssuesTab,
  toggleGroupByKind,
} from '../../e2e/helpers/issues-helpers.js';

describe('The Issues tab group by kind checkbox', () => {
  it('should group issues by associated kinds when checked', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (!await getGroupByKindChecked(devToolsPage)) {
      await toggleGroupByKind(devToolsPage);
    }

    await expandKind('.page-errors', devToolsPage);
    const issue = await devToolsPage.waitFor(ISSUE);
    const isParentedByKind = await issue.evaluate(node => node.parentElement?.classList.contains('issue-kind-body'));
    assert.isTrue(isParentedByKind);
  });

  it('should display issues in the issueTree when not checked', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);

    if (await getGroupByKindChecked(devToolsPage)) {
      await toggleGroupByKind(devToolsPage);
    }

    const issue = await devToolsPage.waitFor(ISSUE);
    const isParentedByKind = await issue.evaluate(node => node.parentElement?.classList.contains('issue-kind-body'));
    assert.isFalse(isParentedByKind);
  });
});
