// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

export class UserReidentificationIssue extends Issue {
  #issueDetails: Protocol.Audits.UserReidentificationIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.UserReidentificationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super('UserReidentificationIssue', issuesModel);
    this.#issueDetails = issueDetails;
  }

  primaryKey(): string {
    const requestId = this.#issueDetails.request ? this.#issueDetails.request.requestId : 'no-request';
    return `${this.code()}-(${requestId})`;
  }

  override requests(): Iterable<Protocol.Audits.AffectedRequest> {
    return this.#issueDetails.request ? [this.#issueDetails.request] : [];
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.code());
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  getKind(): IssueKind {
    return IssueKind.IMPROVEMENT;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      UserReidentificationIssue[] {
    const userReidentificationIssueDetails = inspectorIssue.details.userReidentificationIssueDetails;
    if (!userReidentificationIssueDetails) {
      console.warn('User Reidentification issue without details received.');
      return [];
    }
    return [new UserReidentificationIssue(userReidentificationIssueDetails, issuesModel)];
  }
}

// Add new issue types to this map (with a unique code per type).
const issueDescriptions = new Map<string, LazyMarkdownIssueDescription>([
  [
    'UserReidentificationIssue',
    {
      file: 'userReidentificationBlocked.md',
      // TODO(https://g-issues.chromium.org/issues/409596758): Add
      // internationalized learn more link text.
      links: [],
    },
  ],
]);
