// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const enum IssueCode {
  PermissionPolicyDisabled = 'AttributionReportingIssue::PermissionPolicyDisabled',
  PermissionPolicyNotDelegated = 'AttributionReportingIssue::PermissionPolicyNotDelegated',
  UntrustworthyReportingOrigin = 'AttributionReportingIssue::UntrustworthyReportingOrigin',
  InsecureContext = 'AttributionReportingIssue::InsecureContext',
  InvalidRegisterSourceHeader = 'AttributionReportingIssue::InvalidRegisterSourceHeader',
  InvalidRegisterTriggerHeader = 'AttributionReportingIssue::InvalidRegisterTriggerHeader',
  InvalidEligibleHeader = 'AttributionReportingIssue::InvalidEligibleHeader',
  TooManyConcurrentRequests = 'AttributionReportingIssue::TooManyConcurrentRequests',
  SourceAndTriggerHeaders = 'AttributionReportingIssue::SourceAndTriggerHeaders',
  SourceIgnored = 'AttributionReportingIssue::SourceIgnored',
  TriggerIgnored = 'AttributionReportingIssue::TriggerIgnored',
  // TODO(apaseltiner): Remove this once old issue types are removed from
  // protocol.
  Unknown = 'AttributionReportingIssue::Unknown',
}

function getIssueCode(details: Protocol.Audits.AttributionReportingIssueDetails): IssueCode {
  switch (details.violationType) {
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled:
      return IssueCode.PermissionPolicyDisabled;
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyNotDelegated:
      return IssueCode.PermissionPolicyNotDelegated;
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
    case Protocol.Audits.AttributionReportingIssueType.SourceAndTriggerHeaders:
      return IssueCode.SourceAndTriggerHeaders;
    case Protocol.Audits.AttributionReportingIssueType.SourceIgnored:
      return IssueCode.SourceIgnored;
    case Protocol.Audits.AttributionReportingIssueType.TriggerIgnored:
      return IssueCode.TriggerIgnored;
    default:
      return IssueCode.Unknown;
  }
}

const structuredHeaderLink = {
  link: 'https://tools.ietf.org/id/draft-ietf-httpbis-header-structure-15.html#rfc.section.4.2.2',
  linkTitle: 'Structured Headers RFC',
};

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

  getHeaderValidatorLink(name: string): {link: string, linkTitle: string} {
    const url = new URL('https://wicg.github.io/attribution-reporting-api/validate-headers');
    url.searchParams.set('header', name);

    if (this.issueDetails.invalidParameter) {
      url.searchParams.set('json', this.issueDetails.invalidParameter);
    }

    return {
      link: url.toString(),
      linkTitle: 'Header Validator',
    };
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.code()) {
      case IssueCode.PermissionPolicyDisabled:
        return {
          file: 'arPermissionPolicyDisabled.md',
          links: [],
        };
      case IssueCode.PermissionPolicyNotDelegated:
        return {
          file: 'arPermissionPolicyNotDelegated.md',
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
          links: [this.getHeaderValidatorLink('source')],
        };
      case IssueCode.InvalidRegisterTriggerHeader:
        return {
          file: 'arInvalidRegisterTriggerHeader.md',
          links: [this.getHeaderValidatorLink('trigger')],
        };
      case IssueCode.InvalidEligibleHeader:
        return {
          file: 'arInvalidEligibleHeader.md',
          links: [
            this.getHeaderValidatorLink('eligible'),
            structuredHeaderLink,
          ],
        };
      case IssueCode.TooManyConcurrentRequests:
        return {
          file: 'arTooManyConcurrentRequests.md',
          links: [],
        };
      case IssueCode.SourceAndTriggerHeaders:
        return {
          file: 'arSourceAndTriggerHeaders.md',
          links: [],
        };
      case IssueCode.SourceIgnored:
        return {
          file: 'arSourceIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.TriggerIgnored:
        return {
          file: 'arTriggerIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.Unknown:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    switch (this.code()) {
      case IssueCode.PermissionPolicyNotDelegated:
        return IssueKind.BreakingChange;
      case IssueCode.PermissionPolicyDisabled:
      case IssueCode.UntrustworthyReportingOrigin:
      case IssueCode.InsecureContext:
      case IssueCode.InvalidRegisterSourceHeader:
      case IssueCode.InvalidRegisterTriggerHeader:
      case IssueCode.InvalidEligibleHeader:
      case IssueCode.TooManyConcurrentRequests:
      case IssueCode.SourceAndTriggerHeaders:
      case IssueCode.SourceIgnored:
      case IssueCode.TriggerIgnored:
      case IssueCode.Unknown:
        return IssueKind.PageError;
    }
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
