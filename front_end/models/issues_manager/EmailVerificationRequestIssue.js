// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { Issue } from './Issue.js';
import { resolveLazyDescription, } from './MarkdownIssueDescription.js';
const UIStrings = {
    /**
     * @description Title for Email Verification Protocol specification url link
     */
    emailVerification: 'Email Verification Protocol',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/EmailVerificationRequestIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class EmailVerificationRequestIssue extends Issue {
    constructor(issueDetails, issuesModel) {
        super({
            code: "EmailVerificationRequestIssue" /* Protocol.Audits.InspectorIssueCode.EmailVerificationRequestIssue */,
            umaCode: [
                "EmailVerificationRequestIssue" /* Protocol.Audits.InspectorIssueCode.EmailVerificationRequestIssue */,
                issueDetails.emailVerificationRequestIssueReason,
            ].join('::'),
        }, issueDetails, issuesModel);
    }
    getCategory() {
        return "Other" /* IssueCategory.OTHER */;
    }
    getDescription() {
        const description = issueDescriptions.get(this.details().emailVerificationRequestIssueReason);
        if (!description) {
            return null;
        }
        return resolveLazyDescription(description);
    }
    primaryKey() {
        return JSON.stringify(this.details());
    }
    getKind() {
        return "PageError" /* IssueKind.PAGE_ERROR */;
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const details = inspectorIssue.details.emailVerificationRequestIssueDetails;
        if (!details) {
            console.warn('Email verification request issue without details received.');
            return [];
        }
        return [new EmailVerificationRequestIssue(details, issuesModel)];
    }
}
const issueDescriptions = new Map([
    [
        "InvalidEmail" /* Protocol.Audits.EmailVerificationRequestIssueReason.InvalidEmail */,
        {
            file: 'emailVerificationRequestInvalidEmail.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "DnsFetchFailed" /* Protocol.Audits.EmailVerificationRequestIssueReason.DnsFetchFailed */,
        {
            file: 'emailVerificationRequestDnsFetchFailed.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "DnsInvalidRecord" /* Protocol.Audits.EmailVerificationRequestIssueReason.DnsInvalidRecord */,
        {
            file: 'emailVerificationRequestDnsInvalidRecord.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownHttpNotFound" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownHttpNotFound */,
        {
            file: 'emailVerificationRequestWellKnownHttpNotFound.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownNoResponse" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownNoResponse */,
        {
            file: 'emailVerificationRequestWellKnownNoResponse.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownInvalidResponse" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownInvalidResponse */,
        {
            file: 'emailVerificationRequestWellKnownInvalidResponse.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownListEmpty" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownListEmpty */,
        {
            file: 'emailVerificationRequestWellKnownListEmpty.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownInvalidContentType" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownInvalidContentType */,
        {
            file: 'emailVerificationRequestWellKnownInvalidContentType.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownMissingIssuanceEndpoint" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownMissingIssuanceEndpoint */,
        {
            file: 'emailVerificationRequestWellKnownMissingIssuanceEndpoint.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownIssuanceEndpointCrossOrigin" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownIssuanceEndpointCrossOrigin */,
        {
            file: 'emailVerificationRequestWellKnownIssuanceEndpointCrossOrigin.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownUnsupportedSigningAlgorithm" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownUnsupportedSigningAlgorithm */,
        {
            file: 'emailVerificationRequestWellKnownUnsupportedSigningAlgorithm.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenHttpNotFound" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenHttpNotFound */,
        {
            file: 'emailVerificationRequestTokenHttpNotFound.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenNoResponse" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenNoResponse */,
        {
            file: 'emailVerificationRequestTokenNoResponse.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenInvalidResponse" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidResponse */,
        {
            file: 'emailVerificationRequestTokenInvalidResponse.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenInvalidContentType" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidContentType */,
        {
            file: 'emailVerificationRequestTokenInvalidContentType.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenMalformedSdJwt" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenMalformedSdJwt */,
        {
            file: 'emailVerificationRequestTokenMalformedSdJwt.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "TokenInvalidSdJwt" /* Protocol.Audits.EmailVerificationRequestIssueReason.TokenInvalidSdJwt */,
        {
            file: 'emailVerificationRequestTokenInvalidSdJwt.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "KeyBindingSigningFailed" /* Protocol.Audits.EmailVerificationRequestIssueReason.KeyBindingSigningFailed */,
        {
            file: 'emailVerificationRequestKeyBindingSigningFailed.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "RpOriginIsOpaque" /* Protocol.Audits.EmailVerificationRequestIssueReason.RpOriginIsOpaque */,
        {
            file: 'emailVerificationRequestRpOriginIsOpaque.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownMissingAccountsEndpoint" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownMissingAccountsEndpoint */,
        {
            file: 'emailVerificationRequestWellKnownMissingAccountsEndpoint.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "UserLoggedOut" /* Protocol.Audits.EmailVerificationRequestIssueReason.UserLoggedOut */,
        {
            file: 'emailVerificationRequestUserLoggedOut.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
    [
        "WellKnownAccountsEndpointCrossOrigin" /* Protocol.Audits.EmailVerificationRequestIssueReason.WellKnownAccountsEndpointCrossOrigin */,
        {
            file: 'emailVerificationRequestWellKnownAccountsEndpointCrossOrigin.md',
            links: [{
                    link: 'https://github.com/WICG/email-verification-protocol',
                    linkTitle: i18nLazyString(UIStrings.emailVerification),
                }],
        },
    ],
]);
//# sourceMappingURL=EmailVerificationRequestIssue.js.map