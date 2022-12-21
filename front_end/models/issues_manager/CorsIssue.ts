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

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum IssueCode {
  InsecurePrivateNetwork = 'CorsIssue::InsecurePrivateNetwork',
  InvalidHeaderValues = 'CorsIssue::InvalidHeaders',
  WildcardOriginNotAllowed = 'CorsIssue::WildcardOriginWithCredentials',
  PreflightResponseInvalid = 'CorsIssue::PreflightResponseInvalid',
  OriginMismatch = 'CorsIssue::OriginMismatch',
  AllowCredentialsRequired = 'CorsIssue::AllowCredentialsRequired',
  MethodDisallowedByPreflightResponse = 'CorsIssue::MethodDisallowedByPreflightResponse',
  HeaderDisallowedByPreflightResponse = 'CorsIssue::HeaderDisallowedByPreflightResponse',
  RedirectContainsCredentials = 'CorsIssue::RedirectContainsCredentials',
  DisallowedByMode = 'CorsIssue::DisallowedByMode',
  CorsDisabledScheme = 'CorsIssue::CorsDisabledScheme',
  // TODO(https://crbug.com/1263483): Remove this once it's removed from CDP.
  PreflightMissingAllowExternal = 'CorsIssue::PreflightMissingAllowExternal',
  // TODO(https://crbug.com/1263483): Remove this once it's removed from CDP.
  PreflightInvalidAllowExternal = 'CorsIssue::PreflightInvalidAllowExternal',
  NoCorsRedirectModeNotFollow = 'CorsIssue::NoCorsRedirectModeNotFollow',
  InvalidPrivateNetworkAccess = 'CorsIssue::InvalidPrivateNetworkAccess',
  UnexpectedPrivateNetworkAccess = 'CorsIssue::UnexpectedPrivateNetworkAccess',
  PreflightAllowPrivateNetworkError = 'CorsIssue::PreflightAllowPrivateNetworkError',
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
      return IssueCode.InvalidHeaderValues;
    case Protocol.Network.CorsError.PreflightWildcardOriginNotAllowed:
    case Protocol.Network.CorsError.WildcardOriginNotAllowed:
      return IssueCode.WildcardOriginNotAllowed;
    case Protocol.Network.CorsError.PreflightInvalidStatus:
    case Protocol.Network.CorsError.PreflightDisallowedRedirect:
    case Protocol.Network.CorsError.InvalidResponse:
      return IssueCode.PreflightResponseInvalid;
    case Protocol.Network.CorsError.AllowOriginMismatch:
    case Protocol.Network.CorsError.PreflightAllowOriginMismatch:
      return IssueCode.OriginMismatch;
    case Protocol.Network.CorsError.InvalidAllowCredentials:
    case Protocol.Network.CorsError.PreflightInvalidAllowCredentials:
      return IssueCode.AllowCredentialsRequired;
    case Protocol.Network.CorsError.MethodDisallowedByPreflightResponse:
      return IssueCode.MethodDisallowedByPreflightResponse;
    case Protocol.Network.CorsError.HeaderDisallowedByPreflightResponse:
      return IssueCode.HeaderDisallowedByPreflightResponse;
    case Protocol.Network.CorsError.RedirectContainsCredentials:
      return IssueCode.RedirectContainsCredentials;
    case Protocol.Network.CorsError.DisallowedByMode:
      return IssueCode.DisallowedByMode;
    case Protocol.Network.CorsError.CorsDisabledScheme:
      return IssueCode.CorsDisabledScheme;
    case Protocol.Network.CorsError.PreflightMissingAllowExternal:
      return IssueCode.PreflightMissingAllowExternal;
    case Protocol.Network.CorsError.PreflightInvalidAllowExternal:
      return IssueCode.PreflightInvalidAllowExternal;
    case Protocol.Network.CorsError.InsecurePrivateNetwork:
      return IssueCode.InsecurePrivateNetwork;
    case Protocol.Network.CorsError.NoCorsRedirectModeNotFollow:
      return IssueCode.NoCorsRedirectModeNotFollow;
    case Protocol.Network.CorsError.InvalidPrivateNetworkAccess:
      return IssueCode.InvalidPrivateNetworkAccess;
    case Protocol.Network.CorsError.UnexpectedPrivateNetworkAccess:
      return IssueCode.UnexpectedPrivateNetworkAccess;
    case Protocol.Network.CorsError.PreflightMissingAllowPrivateNetwork:
    case Protocol.Network.CorsError.PreflightInvalidAllowPrivateNetwork:
      return IssueCode.PreflightAllowPrivateNetworkError;
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
    return IssueCategory.Cors;
  }

  details(): Protocol.Audits.CorsIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    switch (getIssueCode(this.#issueDetails)) {
      case IssueCode.InsecurePrivateNetwork:
        return {
          file: 'corsInsecurePrivateNetwork.md',
          links: [{
            link: 'https://developer.chrome.com/blog/private-network-access-update',
            linkTitle: i18nString(UIStrings.corsPrivateNetworkAccess),
          }],
        };
      case IssueCode.PreflightAllowPrivateNetworkError:
        return {
          file: 'corsPreflightAllowPrivateNetworkError.md',
          links: [{
            link: 'https://developer.chrome.com/blog/private-network-access-update',
            linkTitle: i18nString(UIStrings.corsPrivateNetworkAccess),
          }],
        };
      case IssueCode.InvalidHeaderValues:
        return {
          file: 'corsInvalidHeaderValues.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.WildcardOriginNotAllowed:
        return {
          file: 'corsWildcardOriginNotAllowed.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.PreflightResponseInvalid:
        return {
          file: 'corsPreflightResponseInvalid.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.OriginMismatch:
        return {
          file: 'corsOriginMismatch.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.AllowCredentialsRequired:
        return {
          file: 'corsAllowCredentialsRequired.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.MethodDisallowedByPreflightResponse:
        return {
          file: 'corsMethodDisallowedByPreflightResponse.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.HeaderDisallowedByPreflightResponse:
        return {
          file: 'corsHeaderDisallowedByPreflightResponse.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.RedirectContainsCredentials:
        return {
          file: 'corsRedirectContainsCredentials.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.DisallowedByMode:
        return {
          file: 'corsDisallowedByMode.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.CorsDisabledScheme:
        return {
          file: 'corsDisabledScheme.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.NoCorsRedirectModeNotFollow:
        return {
          file: 'corsNoCorsRedirectModeNotFollow.md',
          links: [{
            link: 'https://web.dev/cross-origin-resource-sharing',
            linkTitle: i18nString(UIStrings.CORS),
          }],
        };
      case IssueCode.PreflightMissingAllowExternal:
      case IssueCode.PreflightInvalidAllowExternal:
      case IssueCode.InvalidPrivateNetworkAccess:
      case IssueCode.UnexpectedPrivateNetworkAccess:
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
      return IssueKind.BreakingChange;
    }
    return IssueKind.PageError;
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
