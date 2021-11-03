// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const enum IssueCode {
  DeprecationIssue = 'DeprecationIssue',
}

export class DeprecationIssue extends Issue<IssueCode> {
  private issueDetails: Protocol.Audits.DeprecationIssueDetails;

  constructor(issueDetails: Protocol.Audits.DeprecationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(IssueCode.DeprecationIssue, issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.DeprecationIssueDetails {
    return this.issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    return {
      file: 'deprecation.md',
      substitutions: new Map([
        // TODO(crbug.com/1264960): Re-work format to add i18n support per:
        // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/devtools_protocol/README.md
        ['PLACEHOLDER_message', String(this.issueDetails.message)],
      ]),
      links: [],
    };
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    if (this.issueDetails.sourceCodeLocation) {
      return [this.issueDetails.sourceCodeLocation];
    }
    return [];
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.BreakingChange;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      DeprecationIssue[] {
    const details = inspectorIssue.details.deprecationIssueDetails;
    if (!details) {
      console.warn('Deprecation issue without details received.');
      return [];
    }
    return [new DeprecationIssue(details, issuesModel)];
  }
}
