// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as BrowserSDK from '../../../../front_end/browser_sdk/browser_sdk.js';
import * as Common from '../../../../front_end/core/common/common.js';
import * as SDK from '../../../../front_end/core/sdk/sdk.js';

export class MockIssuesManager extends Common.ObjectWrapper.ObjectWrapper {
  private mockIssues: Iterable<SDK.Issue.Issue>;
  private issueCounts = new Map<SDK.Issue.IssueKind, number>([
    [SDK.Issue.IssueKind.Improvement, 0],
    [SDK.Issue.IssueKind.BreakingChange, 1],
    [SDK.Issue.IssueKind.PageError, 2],
  ]);

  constructor(issues: Iterable<SDK.Issue.Issue>) {
    super();
    this.mockIssues = issues;
  }
  issues() {
    return this.mockIssues;
  }

  numberOfIssues(kind?: SDK.Issue.IssueKind): number {
    if (kind) {
      return this.issueCounts.get(kind) ?? 0;
    }
    return Array.from(this.issueCounts.values()).reduce((sum, v) => sum + v, 0);
  }

  incrementIssueCountsOfAllKinds() {
    for (const [key, value] of this.issueCounts) {
      this.issueCounts.set(key, value + 1);
    }
    this.dispatchEventToListeners(BrowserSDK.IssuesManager.Events.IssuesCountUpdated);
  }
}
