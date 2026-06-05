// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import {
  type LazyMarkdownIssueDescription,
  type MarkdownIssueDescription,
  resolveLazyDescription,
} from './MarkdownIssueDescription.js';

const UIStrings = {
  /**
   * @description Title for Email Verification Protocol specification url link
   */
  emailVerification: 'Email Verification Protocol',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/EmailVerificationRequestIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class EmailVerificationRequestIssue extends Issue<Protocol.Audits.EmailVerificationRequestIssueDetails> {
  constructor(
      issueDetails: Protocol.Audits.EmailVerificationRequestIssueDetails,
      issuesModel: SDK.IssuesModel.IssuesModel|null) {
    super(
        {
          code: Protocol.Audits.InspectorIssueCode.EmailVerificationRequestIssue,
          umaCode: [
            Protocol.Audits.InspectorIssueCode.EmailVerificationRequestIssue,
            issueDetails.emailVerificationRequestIssueReason,
          ].join('::'),
        },
        issueDetails, issuesModel);
  }

  getCategory(): IssueCategory {
    return IssueCategory.OTHER;
  }

  getDescription(): MarkdownIssueDescription|null {
    const description = issueDescriptions.get(this.details().emailVerificationRequestIssueReason);
    if (!description) {
      return null;
    }
    return resolveLazyDescription(description);
  }

  primaryKey(): string {
    return JSON.stringify(this.details());
  }

  getKind(): IssueKind {
    return IssueKind.PAGE_ERROR;
  }

  static fromInspectorIssue(
      issuesModel: SDK.IssuesModel.IssuesModel|null,
      inspectorIssue: Protocol.Audits.InspectorIssue): EmailVerificationRequestIssue[] {
    const details = inspectorIssue.details.emailVerificationRequestIssueDetails;
    if (!details) {
      console.warn('Email verification request issue without details received.');
      return [];
    }
    return [new EmailVerificationRequestIssue(details, issuesModel)];
  }
}

const issueDescriptions = new Map<Protocol.Audits.EmailVerificationRequestIssueReason, LazyMarkdownIssueDescription>([
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.InvalidEmail,
    {
      file: 'emailVerificationRequestInvalidEmail.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.DnsFetchFailed,
    {
      file: 'emailVerificationRequestDnsFetchFailed.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.DnsInvalidRecord,
    {
      file: 'emailVerificationRequestDnsInvalidRecord.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownHttpNotFound,
    {
      file: 'emailVerificationRequestWellKnownHttpNotFound.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownNoResponse,
    {
      file: 'emailVerificationRequestWellKnownNoResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownInvalidResponse,
    {
      file: 'emailVerificationRequestWellKnownInvalidResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownListEmpty,
    {
      file: 'emailVerificationRequestWellKnownListEmpty.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownInvalidContentType,
    {
      file: 'emailVerificationRequestWellKnownInvalidContentType.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownMissingIssuanceEndpoint,
    {
      file: 'emailVerificationRequestWellKnownMissingIssuanceEndpoint.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownIssuanceEndpointCrossOrigin,
    {
      file: 'emailVerificationRequestWellKnownIssuanceEndpointCrossOrigin.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownUnsupportedSigningAlgorithm,
    {
      file: 'emailVerificationRequestWellKnownUnsupportedSigningAlgorithm.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenHttpNotFound,
    {
      file: 'emailVerificationRequestTokenHttpNotFound.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenNoResponse,
    {
      file: 'emailVerificationRequestTokenNoResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidResponse,
    {
      file: 'emailVerificationRequestTokenInvalidResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidContentType,
    {
      file: 'emailVerificationRequestTokenInvalidContentType.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenMalformedSdJwt,
    {
      file: 'emailVerificationRequestTokenMalformedSdJwt.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidSdJwt,
    {
      file: 'emailVerificationRequestTokenInvalidSdJwt.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.KeyBindingSigningFailed,
    {
      file: 'emailVerificationRequestKeyBindingSigningFailed.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.RpOriginIsOpaque,
    {
      file: 'emailVerificationRequestRpOriginIsOpaque.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownMissingAccountsEndpoint,
    {
      file: 'emailVerificationRequestWellKnownMissingAccountsEndpoint.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.UserLoggedOut,
    {
      file: 'emailVerificationRequestUserLoggedOut.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownAccountsEndpointCrossOrigin,
    {
      file: 'emailVerificationRequestWellKnownAccountsEndpointCrossOrigin.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.AccountsHttpNotFound,
    {
      file: 'emailVerificationRequestAccountsHttpNotFound.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.AccountsNoResponse,
    {
      file: 'emailVerificationRequestAccountsNoResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.AccountsInvalidResponse,
    {
      file: 'emailVerificationRequestAccountsInvalidResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.AccountsInvalidContentType,
    {
      file: 'emailVerificationRequestAccountsInvalidContentType.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.AccountsEmptyList,
    {
      file: 'emailVerificationRequestAccountsEmptyList.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownHttpNotFound,
    {
      file: 'emailVerificationRequestEmailVerificationWellKnownHttpNotFound.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownNoResponse,
    {
      file: 'emailVerificationRequestEmailVerificationWellKnownNoResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownInvalidResponse,
    {
      file: 'emailVerificationRequestEmailVerificationWellKnownInvalidResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.EmailVerificationWellKnownInvalidContentType,
    {
      file: 'emailVerificationRequestEmailVerificationWellKnownInvalidContentType.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.JwksHttpNotFound,
    {
      file: 'emailVerificationRequestJwksHttpNotFound.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.JwksInvalidResponse,
    {
      file: 'emailVerificationRequestJwksInvalidResponse.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtUnsupportedHeaderAlg,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtUnsupportedHeaderAlg.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingIss,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtMissingIss.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingIat,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtMissingIat.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingCnf,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtMissingCnf.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtMissingEmail,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtMissingEmail.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidIssuedAt,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtInvalidIssuedAt.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidIssuer,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtInvalidIssuer.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtJwksMissingKeys,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtJwksMissingKeys.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtSignatureFailed,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtSignatureFailed.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidEmailVerified,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtInvalidEmailVerified.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidEmail,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtInvalidEmail.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationSdJwtInvalidHolderKey,
    {
      file: 'emailVerificationRequestTokenVerificationSdJwtInvalidHolderKey.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidTyp,
    {
      file: 'emailVerificationRequestTokenVerificationKbInvalidTyp.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingAud,
    {
      file: 'emailVerificationRequestTokenVerificationKbMissingAud.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingNonce,
    {
      file: 'emailVerificationRequestTokenVerificationKbMissingNonce.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingIat,
    {
      file: 'emailVerificationRequestTokenVerificationKbMissingIat.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingSdHash,
    {
      file: 'emailVerificationRequestTokenVerificationKbMissingSdHash.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidIssuedAt,
    {
      file: 'emailVerificationRequestTokenVerificationKbInvalidIssuedAt.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidAudience,
    {
      file: 'emailVerificationRequestTokenVerificationKbInvalidAudience.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidNonce,
    {
      file: 'emailVerificationRequestTokenVerificationKbInvalidNonce.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbInvalidSdHash,
    {
      file: 'emailVerificationRequestTokenVerificationKbInvalidSdHash.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbMissingCnf,
    {
      file: 'emailVerificationRequestTokenVerificationKbMissingCnf.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
  [
    Protocol.Audits.EmailVerificationRequestIssueReason.TokenVerificationKbSignatureFailed,
    {
      file: 'emailVerificationRequestTokenVerificationKbSignatureFailed.md',
      links: [{
        link: 'https://github.com/WICG/email-verification-protocol',
        linkTitle: i18nLazyString(UIStrings.emailVerification),
      }],
    },
  ],
]);
