// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

function getIssueCode(attributionError: Protocol.Audits.AttributionReportingIssueType): string {
  return [Protocol.Audits.InspectorIssueCode.AttributionReportingIssue, attributionError].join('::');
}

export class AttributionReportingIssue extends Issue {
  private issueDetails: Protocol.Audits.AttributionReportingIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.AttributionReportingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(getIssueCode(issueDetails.violationType), issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.AttributionReporting;
  }

  getDescription(): MarkdownIssueDescription|null {
    return null;
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }
}
