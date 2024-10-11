// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import type * as SDK from '../core/sdk/sdk.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';

import {MockIssuesModel} from './MockIssuesModel.js';
import type {StubIssue} from './StubIssue.js';

export class MockIssuesManager extends Common.ObjectWrapper.ObjectWrapper<IssuesManager.IssuesManager.EventTypes> {
  private mockIssues: IssuesManager.Issue.Issue[];
  private issueCounts = new Map<IssuesManager.Issue.IssueKind, number>([
    [IssuesManager.Issue.IssueKind.IMPROVEMENT, 0],
    [IssuesManager.Issue.IssueKind.BREAKING_CHANGE, 1],
    [IssuesManager.Issue.IssueKind.PAGE_ERROR, 2],
  ]);

  // An empty model to pass along for the IssuesManager.Events.IssueAdded event.
  private mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

  constructor(issues: Iterable<IssuesManager.Issue.Issue>) {
    super();
    this.mockIssues = Array.from(issues);
  }

  issues() {
    return this.mockIssues;
  }

  getIssueById(id: string): IssuesManager.Issue.Issue|null {
    for (const issue of this.mockIssues) {
      if (issue.getIssueId() === id) {
        return issue;
      }
    }
    return null;
  }

  numberOfIssues(kind?: IssuesManager.Issue.IssueKind): number {
    if (kind) {
      return this.issueCounts.get(kind) ?? 0;
    }
    return Array.from(this.issueCounts.values()).reduce((sum, v) => sum + v, 0);
  }

  setNumberOfIssues(counts: Map<IssuesManager.Issue.IssueKind, number>): void {
    this.issueCounts = counts;
  }

  incrementIssueCountsOfAllKinds() {
    for (const [key, value] of this.issueCounts) {
      this.issueCounts.set(key, value + 1);
    }
    this.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
  }

  addIssue(mockIssue: StubIssue) {
    this.mockIssues.push(mockIssue as IssuesManager.Issue.Issue);
    this.dispatchEventToListeners(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issue: mockIssue, issuesModel: this.mockModel});
  }
}
