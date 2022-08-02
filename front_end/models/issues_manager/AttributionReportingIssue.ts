// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const enum IssueCode {
  PermissionPolicyDisabled = 'AttributionReportingIssue::PermissionPolicyDisabled',
  UntrustworthyReportingOrigin = 'AttributionReportingIssue::UntrustworthyReportingOrigin',
  InsecureContext = 'AttributionReportingIssue::InsecureContext',
  InvalidRegisterSourceHeader = 'AttributionReportingIssue::InvalidRegisterSourceHeader',
  InvalidRegisterTriggerHeader = 'AttributionReportingIssue::InvalidRegisterTriggerHeader',
  InvalidEligibleHeader = 'AttributionReportingIssue::InvalidEligibleHeader',
  TooManyConcurrentRequests = 'AttributionReportingIssue::TooManyConcurrentRequests',
  // TODO(apaseltiner): Remove this once old issue types are removed from
  // protocol.
  Unknown = 'AttributionReportingIssue::Unknown',
}

function getIssueCode(details: Protocol.Audits.AttributionReportingIssueDetails): IssueCode {
  switch (details.violationType) {
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled:
      return IssueCode.PermissionPolicyDisabled;
    case Protocol.Audits.AttributionReportingIssueType.UntrustworthyReportingOrigin:
      return IssueCode.UntrustworthyReportingOrigin;
    case Protocol.Audits.AttributionReportingIssueType.InsecureContext:
      return IssueCode.InsecureContext;
    case Protocol.Audits.AttributionReportingIssueType.InvalidHeader:
      return IssueCode.InvalidRegisterSourceHeader;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterTriggerHeader:
      return IssueCode.InvalidRegisterTriggerHeader;
    case Protocol.Audits.AttributionReportingIssueType.InvalidEligibleHeader:
      return IssueCode.InvalidEligibleHeader;
    case Protocol.Audits.AttributionReportingIssueType.TooManyConcurrentRequests:
      return IssueCode.TooManyConcurrentRequests;
    default:
      return IssueCode.Unknown;
  }
}

export class AttributionReportingIssue extends Issue<IssueCode> {
  issueDetails: Readonly<Protocol.Audits.AttributionReportingIssueDetails>;

  constructor(
      issueDetails: Protocol.Audits.AttributionReportingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(getIssueCode(issueDetails), issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.AttributionReporting;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.code()) {
      case IssueCode.PermissionPolicyDisabled:
        return {
          file: 'arPermissionPolicyDisabled.md',
          links: [],
        };
      case IssueCode.UntrustworthyReportingOrigin:
        return {
          file: 'arUntrustworthyReportingOrigin.md',
          links: [],
        };
      case IssueCode.InsecureContext:
        return {
          file: 'arInsecureContext.md',
          links: [],
        };
      case IssueCode.InvalidRegisterSourceHeader:
        return {
          file: 'arInvalidRegisterSourceHeader.md',
          links: [],
        };
      case IssueCode.InvalidRegisterTriggerHeader:
        return {
          file: 'arInvalidRegisterTriggerHeader.md',
          links: [],
        };
      case IssueCode.InvalidEligibleHeader:
        return {
          file: 'arInvalidEligibleHeader.md',
          links: [{
            link: 'https://tools.ietf.org/id/draft-ietf-httpbis-header-structure-15.html#rfc.section.4.2.2',
            linkTitle: 'Structured Headers RFC',
          }],
        };
      case IssueCode.TooManyConcurrentRequests:
        return {
          file: 'arTooManyConcurrentRequests.md',
          links: [],
        };
      case IssueCode.Unknown:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      AttributionReportingIssue[] {
    const {attributionReportingIssueDetails} = inspectorIssue.details;
    if (!attributionReportingIssueDetails) {
      console.warn('Attribution Reporting issue without details received.');
      return [];
    }
    return [new AttributionReportingIssue(attributionReportingIssueDetails, issuesModel)];
  }
}
