// Copyright 2022 The Chromium Authors. All rights reserved.
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
  fedCm: 'Federated Credential Management API',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/FederatedAuthRequestIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class FederatedAuthRequestIssue extends Issue {
  readonly #issueDetails: Protocol.Audits.FederatedAuthRequestIssueDetails;

  constructor(
      issueDetails: Protocol.Audits.FederatedAuthRequestIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    super(
        {
          code: Protocol.Audits.InspectorIssueCode.FederatedAuthRequestIssue,
          umaCode: [
            Protocol.Audits.InspectorIssueCode.FederatedAuthRequestIssue,
            issueDetails.federatedAuthRequestIssueReason,
          ].join('::'),
        },
        issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.FederatedAuthRequestIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.#issueDetails.federatedAuthRequestIssueReason);
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
      FederatedAuthRequestIssue[] {
    const details = inspectorIssue.details.federatedAuthRequestIssueDetails;
    if (!details) {
      console.warn('Federated auth request issue without details received.');
      return [];
    }
    return [new FederatedAuthRequestIssue(details, issuesModel)];
  }
}

const issueDescriptions: Map<Protocol.Audits.FederatedAuthRequestIssueReason, LazyMarkdownIssueDescription> = new Map([
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.TooManyRequests,
    {
      file: 'federatedAuthRequestTooManyRequests.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ConfigHttpNotFound,
    {
      file: 'federatedAuthRequestManifestHttpNotFound.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ConfigNoResponse,
    {
      file: 'federatedAuthRequestManifestNoResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ConfigInvalidResponse,
    {
      file: 'federatedAuthRequestManifestInvalidResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ClientMetadataHttpNotFound,
    {
      file: 'federatedAuthRequestClientMetadataHttpNotFound.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ClientMetadataNoResponse,
    {
      file: 'federatedAuthRequestClientMetadataNoResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ClientMetadataInvalidResponse,
    {
      file: 'federatedAuthRequestClientMetadataInvalidResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ErrorFetchingSignin,
    {
      file: 'federatedAuthRequestErrorFetchingSignin.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.InvalidSigninResponse,
    {
      file: 'federatedAuthRequestInvalidSigninResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.AccountsHttpNotFound,
    {
      file: 'federatedAuthRequestAccountsHttpNotFound.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.AccountsNoResponse,
    {
      file: 'federatedAuthRequestAccountsNoResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.AccountsInvalidResponse,
    {
      file: 'federatedAuthRequestAccountsInvalidResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.IdTokenHttpNotFound,
    {
      file: 'federatedAuthRequestIdTokenHttpNotFound.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.IdTokenNoResponse,
    {
      file: 'federatedAuthRequestIdTokenNoResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.IdTokenInvalidResponse,
    {
      file: 'federatedAuthRequestIdTokenInvalidResponse.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.IdTokenInvalidRequest,
    {
      file: 'federatedAuthRequestIdTokenInvalidRequest.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.ErrorIdToken,
    {
      file: 'federatedAuthRequestErrorIdToken.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
  [
    Protocol.Audits.FederatedAuthRequestIssueReason.Canceled,
    {
      file: 'federatedAuthRequestCanceled.md',
      links: [{
        link: 'https://fedidcg.github.io/FedCM/',
        linkTitle: i18nLazyString(UIStrings.fedCm),
      }],
    },
  ],
]);
