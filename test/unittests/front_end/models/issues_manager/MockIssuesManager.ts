// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';

export class MockIssuesManager extends Common.ObjectWrapper.ObjectWrapper {
  private mockIssues: Iterable<IssuesManager.Issue.Issue>;
  private issueCounts = new Map<IssuesManager.Issue.IssueKind, number>([
    [IssuesManager.Issue.IssueKind.Improvement, 0],
    [IssuesManager.Issue.IssueKind.BreakingChange, 1],
    [IssuesManager.Issue.IssueKind.PageError, 2],
  ]);

  constructor(issues: Iterable<IssuesManager.Issue.Issue>) {
    super();
    this.mockIssues = issues;
  }
  issues() {
    return this.mockIssues;
  }

  numberOfIssues(kind?: IssuesManager.Issue.IssueKind): number {
    if (kind) {
      return this.issueCounts.get(kind) ?? 0;
    }
    return Array.from(this.issueCounts.values()).reduce((sum, v) => sum + v, 0);
  }

  incrementIssueCountsOfAllKinds() {
    for (const [key, value] of this.issueCounts) {
      this.issueCounts.set(key, value + 1);
    }
    this.dispatchEventToListeners(IssuesManager.IssuesManager.Events.IssuesCountUpdated);
  }
}
