// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';

import {
  resolveLazyDescription,
  type MarkdownIssueDescription,
  type LazyMarkdownIssueDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   *@description Title for Client Hint specification url link
   */
  fedCmUserInfo: 'Federated Credential Management User Info API',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/FederatedAuthUserInfoRequestIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class FederatedAuthUserInfoRequestIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.FederatedAuthUserInfoRequestIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.FederatedAuthUserInfoRequestIssueDetails,
      issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          code: Protocol.Audits.InspectorIssueCode.FederatedAuthUserInfoRequestIssue,
          umaCode: [
            Protocol.Audits.InspectorIssueCode.FederatedAuthUserInfoRequestIssue,
            issueDetails.federatedAuthUserInfoRequestIssueReason,
          ].join('::'),
        },
        issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.FederatedAuthUserInfoRequestIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.federatedAuthUserInfoRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.PageError;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      FederatedAuthUserInfoRequestIssue[] {
    const details = inspectorIssue.details.federatedAuthUserInfoRequestIssueDetails;
    if (!details) {
      console.warn('Federated auth user info request issue without details received.');
      return [];
    }
    return [new FederatedAuthUserInfoRequestIssue(details, issuesModel)];
  }
}

const issueDescriptions: Map<Protocol.Audits.FederatedAuthUserInfoRequestIssueReason, LazyMarkdownIssueDescription> =
    new Map([
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotSameOrigin,
        {
          file: 'federatedAuthUserInfoRequestNotSameOrigin.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotIframe,
        {
          file: 'federatedAuthUserInfoRequestNotIframe.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotPotentiallyTrustworthy,
        {
          file: 'federatedAuthUserInfoRequestNotPotentiallyTrustworthy.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoAPIPermission,
        {
          file: 'federatedAuthUserInfoRequestNoApiPermission.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NotSignedInWithIdp,
        {
          file: 'federatedAuthUserInfoRequestNotSignedInWithIdp.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoAccountSharingPermission,
        {
          file: 'federatedAuthUserInfoRequestNoAccountSharingPermission.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.InvalidConfigOrWellKnown,
        {
          file: 'federatedAuthUserInfoRequestInvalidConfigOrWellKnown.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.InvalidAccountsResponse,
        {
          file: 'federatedAuthUserInfoRequestInvalidAccountsResponse.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
      [
        Protocol.Audits.FederatedAuthUserInfoRequestIssueReason.NoReturningUserFromFetchedAccounts,
        {
          file: 'federatedAuthUserInfoRequestNoReturningUserFromFetchedAccounts.md',
          links: [{
            link: 'https://fedidcg.github.io/FedCM/',
            linkTitle: i18nLazyString(UIStrings.fedCmUserInfo),
          }],
        },
      ],
    ]);
