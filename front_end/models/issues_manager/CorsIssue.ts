// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';


const UIStrings = {
  /**
  *@description Label for the link for CORS private network issues
  */
  corsForPrivateNetworksRfc: 'CORS for private networks (RFC1918)',
  /**
  *@description Label for the link for CORS network issues
  */
  CORS: 'Cross-Origin Resource Sharing (`CORS`)',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CorsIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const InvalidHeaders =
    [Protocol.Audits.InspectorIssueCode.CorsIssue, 'InvalidAccessControlAllowPreflightResponse'].join('::');
export const WildcardOriginWithCredentials =
    [Protocol.Audits.InspectorIssueCode.CorsIssue, 'WildcardOriginWithCredentials'].join('::');
export const PreflightResponseInvalid =
    [Protocol.Audits.InspectorIssueCode.CorsIssue, 'PreflightResponseInvalid'].join('::');
export const OriginMismatch = [Protocol.Audits.InspectorIssueCode.CorsIssue, 'OriginMismatch'].join('::');
export const AllowCredentialsRequired =
    [Protocol.Audits.InspectorIssueCode.CorsIssue, 'AllowCredentialsRequired'].join('::');

export function getIssueCode(corsError: Protocol.Network.CorsError): string {
  switch (corsError) {
    case Protocol.Network.CorsError.InvalidAllowMethodsPreflightResponse:
    case Protocol.Network.CorsError.InvalidAllowHeadersPreflightResponse:
    case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
    case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
    case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
    case Protocol.Network.CorsError.MissingAllowOriginHeader:
    case Protocol.Network.CorsError.MultipleAllowOriginValues:
    case Protocol.Network.CorsError.InvalidAllowOriginValue:
      return InvalidHeaders;
    case Protocol.Network.CorsError.PreflightWildcardOriginNotAllowed:
    case Protocol.Network.CorsError.WildcardOriginNotAllowed:
      return WildcardOriginWithCredentials;
    case Protocol.Network.CorsError.PreflightInvalidStatus:
    case Protocol.Network.CorsError.PreflightDisallowedRedirect:
      return PreflightResponseInvalid;
    case Protocol.Network.CorsError.AllowOriginMismatch:
    case Protocol.Network.CorsError.PreflightAllowOriginMismatch:
      return OriginMismatch;
    case Protocol.Network.CorsError.InvalidAllowCredentials:
    case Protocol.Network.CorsError.PreflightInvalidAllowCredentials:
      return AllowCredentialsRequired;
    default:
      return [Protocol.Audits.InspectorIssueCode.CorsIssue, corsError].join('::');
  }
}

export class CorsIssue extends Issue {
  private issueDetails: Protocol.Audits.CorsIssueDetails;

  constructor(issueDetails: Protocol.Audits.CorsIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(getIssueCode(issueDetails.corsErrorStatus.corsError), issuesModel);
    this.issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Cors;
  }

  details(): Protocol.Audits.CorsIssueDetails {
    return this.issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (this.issueDetails.corsErrorStatus.corsError) {
      case Protocol.Network.CorsError.InsecurePrivateNetwork:
        if (this.issueDetails.clientSecurityState?.initiatorIsSecureContext) {
          return null;
        }
        return {
          file: 'corsInsecurePrivateNetwork.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cors-rfc1918-guide',
            linkTitle: i18nString(UIStrings.corsForPrivateNetworksRfc),
          }],
        };
      case Protocol.Network.CorsError.InvalidAllowMethodsPreflightResponse:
      case Protocol.Network.CorsError.InvalidAllowHeadersPreflightResponse:
      case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
      case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
      case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
      case Protocol.Network.CorsError.MissingAllowOriginHeader:
      case Protocol.Network.CorsError.MultipleAllowOriginValues:
      case Protocol.Network.CorsError.InvalidAllowOriginValue:
        return {
          file: 'corsInvalidHeaderValues.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.PreflightWildcardOriginNotAllowed:
      case Protocol.Network.CorsError.WildcardOriginNotAllowed:
        return {
          file: 'corsWildcardOriginNotAllowed.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.PreflightInvalidStatus:
      case Protocol.Network.CorsError.PreflightDisallowedRedirect:
        return {
          file: 'corsPreflightResponseInvalid.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.AllowOriginMismatch:
      case Protocol.Network.CorsError.PreflightAllowOriginMismatch:
        return {
          file: 'corsOriginMismatch.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.InvalidAllowCredentials:
      case Protocol.Network.CorsError.PreflightInvalidAllowCredentials:
        return {
          file: 'corsAllowCredentialsRequired.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.MethodDisallowedByPreflightResponse:
        return {
          file: 'corsMethodDisallowedByPreflightResponse.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.HeaderDisallowedByPreflightResponse:
        return {
          file: 'corsHeaderDisallowedByPreflightResponse.md',
          substitutions: undefined,
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case Protocol.Network.CorsError.DisallowedByMode:
      case Protocol.Network.CorsError.CorsDisabledScheme:
      case Protocol.Network.CorsError.RedirectContainsCredentials:
      case Protocol.Network.CorsError.PreflightMissingAllowExternal:
      case Protocol.Network.CorsError.PreflightInvalidAllowExternal:
      case Protocol.Network.CorsError.InvalidResponse:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.issueDetails);
  }

  getKind(): IssueKind {
    if (this.issueDetails.isWarning &&
        this.issueDetails.corsErrorStatus.corsError === Protocol.Network.CorsError.InsecurePrivateNetwork) {
      return IssueKind.BreakingChange;
    }
    return IssueKind.PageError;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel, inspectorDetails: Protocol.Audits.InspectorIssueDetails): CorsIssue[] {
    const corsIssueDetails = inspectorDetails.corsIssueDetails;
    if (!corsIssueDetails) {
      console.warn('Cors issue without details received.');
      return [];
    }
    return [new CorsIssue(corsIssueDetails, issuesModel)];
  }
}
