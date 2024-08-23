// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {type MarkdownIssueDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Label for the link for CORS private network issues
   */
  corsPrivateNetworkAccess: 'Private Network Access',
  /**
   *@description Label for the link for CORS network issues
   */
  CORS: 'Cross-Origin Resource Sharing (`CORS`)',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/CorsIssue.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum IssueCode {
  INSECURE_PRIVATE_NETWORK = 'CorsIssue::InsecurePrivateNetwork',
  INVALID_HEADER_VALUES = 'CorsIssue::InvalidHeaders',
  WILDCARD_ORIGN_NOT_ALLOWED = 'CorsIssue::WildcardOriginWithCredentials',
  PREFLIGHT_RESPONSE_INVALID = 'CorsIssue::PreflightResponseInvalid',
  ORIGIN_MISMATCH = 'CorsIssue::OriginMismatch',
  ALLOW_CREDENTIALS_REQUIRED = 'CorsIssue::AllowCredentialsRequired',
  METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE = 'CorsIssue::MethodDisallowedByPreflightResponse',
  HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE = 'CorsIssue::HeaderDisallowedByPreflightResponse',
  REDIRECT_CONTAINS_CREDENTIALS = 'CorsIssue::RedirectContainsCredentials',
  DISALLOWED_BY_MODE = 'CorsIssue::DisallowedByMode',
  CORS_DISABLED_SCHEME = 'CorsIssue::CorsDisabledScheme',
  // TODO(https://crbug.com/1263483): Remove this once it's removed from CDP.
  PREFLIGHT_MISSING_ALLOW_EXTERNAL = 'CorsIssue::PreflightMissingAllowExternal',
  // TODO(https://crbug.com/1263483): Remove this once it's removed from CDP.
  PREFLIGHT_INVALID_ALLOW_EXTERNAL = 'CorsIssue::PreflightInvalidAllowExternal',
  NO_CORS_REDIRECT_MODE_NOT_FOLLOW = 'CorsIssue::NoCorsRedirectModeNotFollow',
  INVALID_PRIVATE_NETWORK_ACCESS = 'CorsIssue::InvalidPrivateNetworkAccess',
  UNEXPECTED_PRIVATE_NETWORK_ACCESS = 'CorsIssue::UnexpectedPrivateNetworkAccess',
  PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR = 'CorsIssue::PreflightAllowPrivateNetworkError',
  PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID = 'CorsIssue::PreflightMissingPrivateNetworkAccessId',
  PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME = 'CorsIssue::PreflightMissingPrivateNetworkAccessName',
  PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE = 'CorsIssue::PrivateNetworkAccessPermissionUnavailable',
  PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED = 'CorsIssue::PrivateNetworkAccessPermissionDenied',
}

function getIssueCode(details: Protocol.Audits.CorsIssueDetails): IssueCode {
  switch (details.corsErrorStatus.corsError) {
    case Protocol.Network.CorsError.InvalidAllowMethodsPreflightResponse:
    case Protocol.Network.CorsError.InvalidAllowHeadersPreflightResponse:
    case Protocol.Network.CorsError.PreflightMissingAllowOriginHeader:
    case Protocol.Network.CorsError.PreflightMultipleAllowOriginValues:
    case Protocol.Network.CorsError.PreflightInvalidAllowOriginValue:
    case Protocol.Network.CorsError.MissingAllowOriginHeader:
    case Protocol.Network.CorsError.MultipleAllowOriginValues:
    case Protocol.Network.CorsError.InvalidAllowOriginValue:
      return IssueCode.INVALID_HEADER_VALUES;
    case Protocol.Network.CorsError.PreflightWildcardOriginNotAllowed:
    case Protocol.Network.CorsError.WildcardOriginNotAllowed:
      return IssueCode.WILDCARD_ORIGN_NOT_ALLOWED;
    case Protocol.Network.CorsError.PreflightInvalidStatus:
    case Protocol.Network.CorsError.PreflightDisallowedRedirect:
    case Protocol.Network.CorsError.InvalidResponse:
      return IssueCode.PREFLIGHT_RESPONSE_INVALID;
    case Protocol.Network.CorsError.AllowOriginMismatch:
    case Protocol.Network.CorsError.PreflightAllowOriginMismatch:
      return IssueCode.ORIGIN_MISMATCH;
    case Protocol.Network.CorsError.InvalidAllowCredentials:
    case Protocol.Network.CorsError.PreflightInvalidAllowCredentials:
      return IssueCode.ALLOW_CREDENTIALS_REQUIRED;
    case Protocol.Network.CorsError.MethodDisallowedByPreflightResponse:
      return IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE;
    case Protocol.Network.CorsError.HeaderDisallowedByPreflightResponse:
      return IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE;
    case Protocol.Network.CorsError.RedirectContainsCredentials:
      return IssueCode.REDIRECT_CONTAINS_CREDENTIALS;
    case Protocol.Network.CorsError.DisallowedByMode:
      return IssueCode.DISALLOWED_BY_MODE;
    case Protocol.Network.CorsError.CorsDisabledScheme:
      return IssueCode.CORS_DISABLED_SCHEME;
    case Protocol.Network.CorsError.PreflightMissingAllowExternal:
      return IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL;
    case Protocol.Network.CorsError.PreflightInvalidAllowExternal:
      return IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL;
    case Protocol.Network.CorsError.InsecurePrivateNetwork:
      return IssueCode.INSECURE_PRIVATE_NETWORK;
    case Protocol.Network.CorsError.NoCorsRedirectModeNotFollow:
      return IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW;
    case Protocol.Network.CorsError.InvalidPrivateNetworkAccess:
      return IssueCode.INVALID_PRIVATE_NETWORK_ACCESS;
    case Protocol.Network.CorsError.UnexpectedPrivateNetworkAccess:
      return IssueCode.UNEXPECTED_PRIVATE_NETWORK_ACCESS;
    case Protocol.Network.CorsError.PreflightMissingAllowPrivateNetwork:
    case Protocol.Network.CorsError.PreflightInvalidAllowPrivateNetwork:
      return IssueCode.PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR;
    case Protocol.Network.CorsError.PreflightMissingPrivateNetworkAccessId:
      return IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID;
    case Protocol.Network.CorsError.PreflightMissingPrivateNetworkAccessName:
      return IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME;
    case Protocol.Network.CorsError.PrivateNetworkAccessPermissionUnavailable:
      return IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE;
    case Protocol.Network.CorsError.PrivateNetworkAccessPermissionDenied:
      return IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED;
  }
}

export class CorsIssue extends Issue<IssueCode> {
  #issueDetails: Protocol.Audits.CorsIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.CorsIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel,
      issueId: Protocol.Audits.IssueId|undefined) {
    super(getIssueCode(issueDetails), issuesModel, issueId);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.CORS;
  }

  details(): Protocol.Audits.CorsIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (getIssueCode(this.#issueDetails)) {
      case IssueCode.INSECURE_PRIVATE_NETWORK:
        return {
          file: 'corsInsecurePrivateNetwork.md',
          links: [{
            link: 'https://developer.chrome.com/blog/private-network-access-update',
            linkTitle: i18nString(UIStrings.corsPrivateNetworkAccess),
          }],
        };
      case IssueCode.PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR:
        return {
          file: 'corsPreflightAllowPrivateNetworkError.md',
          links: [{
            link: 'https://developer.chrome.com/blog/private-network-access-update',
            linkTitle: i18nString(UIStrings.corsPrivateNetworkAccess),
          }],
        };
      case IssueCode.INVALID_HEADER_VALUES:
        return {
          file: 'corsInvalidHeaderValues.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.WILDCARD_ORIGN_NOT_ALLOWED:
        return {
          file: 'corsWildcardOriginNotAllowed.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.PREFLIGHT_RESPONSE_INVALID:
        return {
          file: 'corsPreflightResponseInvalid.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.ORIGIN_MISMATCH:
        return {
          file: 'corsOriginMismatch.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.ALLOW_CREDENTIALS_REQUIRED:
        return {
          file: 'corsAllowCredentialsRequired.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        return {
          file: 'corsMethodDisallowedByPreflightResponse.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE:
        return {
          file: 'corsHeaderDisallowedByPreflightResponse.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.REDIRECT_CONTAINS_CREDENTIALS:
        return {
          file: 'corsRedirectContainsCredentials.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.DISALLOWED_BY_MODE:
        return {
          file: 'corsDisallowedByMode.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.CORS_DISABLED_SCHEME:
        return {
          file: 'corsDisabledScheme.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.NO_CORS_REDIRECT_MODE_NOT_FOLLOW:
        return {
          file: 'corsNoCorsRedirectModeNotFollow.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      // TODO(1462857): Change the link after we have a blog post for PNA
      // permission prompt.
      case IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID:
      case IssueCode.PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME:
        return {
          file: 'corsPrivateNetworkPermissionDenied.md',
          links: [{
            link: 'https://developer.chrome.com/blog/private-network-access-update',
            linkTitle: i18nString(UIStrings.corsPrivateNetworkAccess),
          }],
        };
      case IssueCode.PREFLIGHT_MISSING_ALLOW_EXTERNAL:
      case IssueCode.PREFLIGHT_INVALID_ALLOW_EXTERNAL:
      case IssueCode.INVALID_PRIVATE_NETWORK_ACCESS:
      case IssueCode.UNEXPECTED_PRIVATE_NETWORK_ACCESS:
      case IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE:
      case IssueCode.PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED:
        return null;
    }
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    if (this.#issueDetails.isWarning &&
        (this.#issueDetails.corsErrorStatus.corsError === Protocol.Network.CorsError.InsecurePrivateNetwork ||
         this.#issueDetails.corsErrorStatus.corsError ===
             Protocol.Network.CorsError.PreflightMissingAllowPrivateNetwork ||
         this.#issueDetails.corsErrorStatus.corsError ===
             Protocol.Network.CorsError.PreflightInvalidAllowPrivateNetwork)) {
      return IssueKind.BREAKING_CHANGE;
    }
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      CorsIssue[] {
    const corsIssueDetails = inspectorIssue.details.corsIssueDetails;
    if (!corsIssueDetails) {
      console.warn('Cors issue without details received.');
      return [];
    }
    return [new CorsIssue(corsIssueDetails, issuesModel, inspectorIssue.issueId)];
  }
}
