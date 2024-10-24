// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';

export const enum IssueCode {
  PERMISSION_POLICY_DISABLED = 'AttributionReportingIssue::PermissionPolicyDisabled',
  UNTRUSTWORTHY_REPORTING_ORIGIN = 'AttributionReportingIssue::UntrustworthyReportingOrigin',
  INSECURE_CONTEXT = 'AttributionReportingIssue::InsecureContext',
  INVALID_REGISTER_SOURCE_HEADER = 'AttributionReportingIssue::InvalidRegisterSourceHeader',
  INVALID_REGISTER_TRIGGER_HEADER = 'AttributionReportingIssue::InvalidRegisterTriggerHeader',
  SOURCE_AND_TRIGGER_HEADERS = 'AttributionReportingIssue::SourceAndTriggerHeaders',
  SOURCE_IGNORED = 'AttributionReportingIssue::SourceIgnored',
  TRIGGER_IGNORED = 'AttributionReportingIssue::TriggerIgnored',
  OS_SOURCE_IGNORED = 'AttributionReportingIssue::OsSourceIgnored',
  OS_TRIGGER_IGNORED = 'AttributionReportingIssue::OsTriggerIgnored',
  INVALID_REGISTER_OS_SOURCE_HEADER = 'AttributionReportingIssue::InvalidRegisterOsSourceHeader',
  INVALID_REGISTER_OS_TRIGGER_HEADER = 'AttributionReportingIssue::InvalidRegisterOsTriggerHeader',
  WEB_AND_OS_HEADERS = 'AttributionReportingIssue::WebAndOsHeaders',
  NO_WEB_OR_OS_SUPPORT = 'AttributionReportingIssue::NoWebOrOsSupport',
  NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION =
      'AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation',
  INVALID_INFO_HEADER = 'AttributionReportingIssue::InvalidInfoHeader',
  NO_REGISTER_SOURCE_HEADER = 'AttributionReportingIssue::NoRegisterSourceHeader',
  NO_REGISTER_TRIGGER_HEADER = 'AttributionReportingIssue::NoRegisterTriggerHeader',
  NO_REGISTER_OS_SOURCE_HEADER = 'AttributionReportingIssue::NoRegisterOsSourceHeader',
  NO_REGISTER_OS_TRIGGER_HEADER = 'AttributionReportingIssue::NoRegisterOsTriggerHeader',
  NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET =
      'AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet',
  UNKNOWN = 'AttributionReportingIssue::Unknown',
}

function getIssueCode(details: Protocol.Audits.AttributionReportingIssueDetails): IssueCode {
  switch (details.violationType) {
    case Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled:
      return IssueCode.PERMISSION_POLICY_DISABLED;
    case Protocol.Audits.AttributionReportingIssueType.UntrustworthyReportingOrigin:
      return IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN;
    case Protocol.Audits.AttributionReportingIssueType.InsecureContext:
      return IssueCode.INSECURE_CONTEXT;
    case Protocol.Audits.AttributionReportingIssueType.InvalidHeader:
      return IssueCode.INVALID_REGISTER_SOURCE_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterTriggerHeader:
      return IssueCode.INVALID_REGISTER_TRIGGER_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.SourceAndTriggerHeaders:
      return IssueCode.SOURCE_AND_TRIGGER_HEADERS;
    case Protocol.Audits.AttributionReportingIssueType.SourceIgnored:
      return IssueCode.SOURCE_IGNORED;
    case Protocol.Audits.AttributionReportingIssueType.TriggerIgnored:
      return IssueCode.TRIGGER_IGNORED;
    case Protocol.Audits.AttributionReportingIssueType.OsSourceIgnored:
      return IssueCode.OS_SOURCE_IGNORED;
    case Protocol.Audits.AttributionReportingIssueType.OsTriggerIgnored:
      return IssueCode.OS_TRIGGER_IGNORED;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsSourceHeader:
      return IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsTriggerHeader:
      return IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.WebAndOsHeaders:
      return IssueCode.WEB_AND_OS_HEADERS;
    case Protocol.Audits.AttributionReportingIssueType.NoWebOrOsSupport:
      return IssueCode.NO_WEB_OR_OS_SUPPORT;
    case Protocol.Audits.AttributionReportingIssueType.NavigationRegistrationWithoutTransientUserActivation:
      return IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION;
    case Protocol.Audits.AttributionReportingIssueType.InvalidInfoHeader:
      return IssueCode.INVALID_INFO_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.NoRegisterSourceHeader:
      return IssueCode.NO_REGISTER_SOURCE_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.NoRegisterTriggerHeader:
      return IssueCode.NO_REGISTER_TRIGGER_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.NoRegisterOsSourceHeader:
      return IssueCode.NO_REGISTER_OS_SOURCE_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.NoRegisterOsTriggerHeader:
      return IssueCode.NO_REGISTER_OS_TRIGGER_HEADER;
    case Protocol.Audits.AttributionReportingIssueType.NavigationRegistrationUniqueScopeAlreadySet:
      return IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET;
    default:
      return IssueCode.UNKNOWN;
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
    return IssueCategory.ATTRIBUTION_REPORTING;
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
      case IssueCode.PERMISSION_POLICY_DISABLED:
        return {
          file: 'arPermissionPolicyDisabled.md',
          links: [],
        };
      case IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN:
        return {
          file: 'arUntrustworthyReportingOrigin.md',
          links: [],
        };
      case IssueCode.INSECURE_CONTEXT:
        return {
          file: 'arInsecureContext.md',
          links: [],
        };
      case IssueCode.INVALID_REGISTER_SOURCE_HEADER:
        return {
          file: 'arInvalidRegisterSourceHeader.md',
          links: [this.getHeaderValidatorLink('source')],
        };
      case IssueCode.INVALID_REGISTER_TRIGGER_HEADER:
        return {
          file: 'arInvalidRegisterTriggerHeader.md',
          links: [this.getHeaderValidatorLink('trigger')],
        };
      case IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER:
        return {
          file: 'arInvalidRegisterOsSourceHeader.md',
          links: [this.getHeaderValidatorLink('os-source')],
        };
      case IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER:
        return {
          file: 'arInvalidRegisterOsTriggerHeader.md',
          links: [this.getHeaderValidatorLink('os-trigger')],
        };
      case IssueCode.SOURCE_AND_TRIGGER_HEADERS:
        return {
          file: 'arSourceAndTriggerHeaders.md',
          links: [],
        };
      case IssueCode.WEB_AND_OS_HEADERS:
        return {
          file: 'arWebAndOsHeaders.md',
          links: [],
        };
      case IssueCode.SOURCE_IGNORED:
        return {
          file: 'arSourceIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.TRIGGER_IGNORED:
        return {
          file: 'arTriggerIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.OS_SOURCE_IGNORED:
        return {
          file: 'arOsSourceIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.OS_TRIGGER_IGNORED:
        return {
          file: 'arOsTriggerIgnored.md',
          links: [structuredHeaderLink],
        };
      case IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION:
        return {
          file: 'arNavigationRegistrationWithoutTransientUserActivation.md',
          links: [],
        };
      case IssueCode.NO_WEB_OR_OS_SUPPORT:
        return {
          file: 'arNoWebOrOsSupport.md',
          links: [],
        };
      case IssueCode.INVALID_INFO_HEADER:
        return {
          file: 'arInvalidInfoHeader.md',
          links: [],
        };
      case IssueCode.NO_REGISTER_SOURCE_HEADER:
        return {
          file: 'arNoRegisterSourceHeader.md',
          links: [],
        };
      case IssueCode.NO_REGISTER_TRIGGER_HEADER:
        return {
          file: 'arNoRegisterTriggerHeader.md',
          links: [],
        };
      case IssueCode.NO_REGISTER_OS_SOURCE_HEADER:
        return {
          file: 'arNoRegisterOsSourceHeader.md',
          links: [],
        };
      case IssueCode.NO_REGISTER_OS_TRIGGER_HEADER:
        return {
          file: 'arNoRegisterOsTriggerHeader.md',
          links: [],
        };
      case IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET:
        return {
          file: 'arNavigationRegistrationUniqueScopeAlreadySet.md',
          links: [],
        };
      case IssueCode.UNKNOWN:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
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
