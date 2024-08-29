// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goToResource, waitFor} from '../../shared/helper.js';

import {
  expandKind,
  getGroupByKindChecked,
  ISSUE,
  navigateToIssuesTab,
  toggleGroupByKind,
} from '../helpers/issues-helpers.js';

describe('The Issues tab group by kind checkbox', () => {
  it('should group issues by associated kinds when checked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (!await getGroupByKindChecked()) {
      await toggleGroupByKind();
    }

    await expandKind('.page-errors');
    const issue = await waitFor(ISSUE);
    const isParentedByKind = await issue.evaluate(node => node.parentElement?.classList.contains('issue-kind-body'));
    assert.isTrue(isParentedByKind);
  });

  it('should display issues in the issueTree when not checked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab();

    if (await getGroupByKindChecked()) {
      await toggleGroupByKind();
    }

    const issue = await waitFor(ISSUE);
    const isParentedByKind = await issue.evaluate(node => node.parentElement?.classList.contains('issue-kind-body'));
    assert.isFalse(isParentedByKind);
  });
});
