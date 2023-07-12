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
  SourceAndTriggerHeaders = 'AttributionReportingIssue::SourceAndTriggerHeaders',
  SourceIgnored = 'AttributionReportingIssue::SourceIgnored',
  TriggerIgnored = 'AttributionReportingIssue::TriggerIgnored',
  OsSourceIgnored = 'AttributionReportingIssue::OsSourceIgnored',
  OsTriggerIgnored = 'AttributionReportingIssue::OsTriggerIgnored',
  InvalidRegisterOsSourceHeader = 'AttributionReportingIssue::InvalidRegisterOsSourceHeader',
  InvalidRegisterOsTriggerHeader = 'AttributionReportingIssue::InvalidRegisterOsTriggerHeader',
  WebAndOsHeaders = 'AttributionReportingIssue::WebAndOsHeaders',
  NavigationRegistrationWithoutTransientUserActivation =
      'AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation',
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
    case Protocol.Audits.AttributionReportingIssueType.SourceAndTriggerHeaders:
      return IssueCode.SourceAndTriggerHeaders;
    case Protocol.Audits.AttributionReportingIssueType.SourceIgnored:
      return IssueCode.SourceIgnored;
    case Protocol.Audits.AttributionReportingIssueType.TriggerIgnored:
      return IssueCode.TriggerIgnored;
    case Protocol.Audits.AttributionReportingIssueType.OsSourceIgnored:
      return IssueCode.OsSourceIgnored;
    case Protocol.Audits.AttributionReportingIssueType.OsTriggerIgnored:
      return IssueCode.OsTriggerIgnored;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsSourceHeader:
      return IssueCode.InvalidRegisterOsSourceHeader;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsTriggerHeader:
      return IssueCode.InvalidRegisterOsTriggerHeader;
    case Protocol.Audits.AttributionReportingIssueType.WebAndOsHeaders:
      return IssueCode.WebAndOsHeaders;
    case Protocol.Audits.AttributionReportingIssueType.NavigationRegistrationWithoutTransientUserActivation:
      return IssueCode.NavigationRegistrationWithoutTransientUserActivation;
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
      case IssueCode.InvalidRegisterOsSourceHeader:
        return {
          file: 'arInvalidRegisterOsSourceHeader.md',
          links: [this.getHeaderValidatorLink('os-source')],
        };
      case IssueCode.InvalidRegisterOsTriggerHeader:
        return {
          file: 'arInvalidRegisterOsTriggerHeader.md',
          links: [this.getHeaderValidatorLink('os-trigger')],
        };
      case IssueCode.SourceAndTriggerHeaders:
        return {
          file: 'arSourceAndTriggerHeaders.md',
          links: [],
        };
      case IssueCode.WebAndOsHeaders:
        return {
          file: 'arWebAndOsHeaders.md',
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
      case IssueCode.OsSourceIgnored:
        return {
          file: 'arOsSourceIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.OsTriggerIgnored:
        return {
          file: 'arOsTriggerIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.NavigationRegistrationWithoutTransientUserActivation:
        return {
          file: 'arNavigationRegistrationWithoutTransientUserActivation.md',
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
    switch (this.code()) {
      case IssueCode.PermissionPolicyDisabled:
      case IssueCode.UntrustworthyReportingOrigin:
      case IssueCode.InsecureContext:
      case IssueCode.InvalidRegisterSourceHeader:
      case IssueCode.InvalidRegisterTriggerHeader:
      case IssueCode.InvalidRegisterOsSourceHeader:
      case IssueCode.InvalidRegisterOsTriggerHeader:
      case IssueCode.SourceAndTriggerHeaders:
      case IssueCode.WebAndOsHeaders:
      case IssueCode.SourceIgnored:
      case IssueCode.TriggerIgnored:
      case IssueCode.OsSourceIgnored:
      case IssueCode.OsTriggerIgnored:
      case IssueCode.NavigationRegistrationWithoutTransientUserActivation:
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
