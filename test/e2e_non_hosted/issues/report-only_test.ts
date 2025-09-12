// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertStatus, expandIssue, navigateToIssuesTab} from '../../e2e/helpers/issues-helpers.js';

describe('The Issues tab report-only issues', () => {
  it('should report the violation as blocked', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    await assertStatus('blocked', devToolsPage);
  });

  it('should report the violation as report-only', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('network/csp-report-only.rawresponse');
    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    await assertStatus('report-only', devToolsPage);
  });
});
