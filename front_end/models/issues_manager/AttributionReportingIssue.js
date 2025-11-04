// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Issue } from './Issue.js';
function getIssueCode(details) {
    switch (details.violationType) {
        case "PermissionPolicyDisabled" /* Protocol.Audits.AttributionReportingIssueType.PermissionPolicyDisabled */:
            return "AttributionReportingIssue::PermissionPolicyDisabled" /* IssueCode.PERMISSION_POLICY_DISABLED */;
        case "UntrustworthyReportingOrigin" /* Protocol.Audits.AttributionReportingIssueType.UntrustworthyReportingOrigin */:
            return "AttributionReportingIssue::UntrustworthyReportingOrigin" /* IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN */;
        case "InsecureContext" /* Protocol.Audits.AttributionReportingIssueType.InsecureContext */:
            return "AttributionReportingIssue::InsecureContext" /* IssueCode.INSECURE_CONTEXT */;
        case "InvalidHeader" /* Protocol.Audits.AttributionReportingIssueType.InvalidHeader */:
            return "AttributionReportingIssue::InvalidRegisterSourceHeader" /* IssueCode.INVALID_REGISTER_SOURCE_HEADER */;
        case "InvalidRegisterTriggerHeader" /* Protocol.Audits.AttributionReportingIssueType.InvalidRegisterTriggerHeader */:
            return "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* IssueCode.INVALID_REGISTER_TRIGGER_HEADER */;
        case "SourceAndTriggerHeaders" /* Protocol.Audits.AttributionReportingIssueType.SourceAndTriggerHeaders */:
            return "AttributionReportingIssue::SourceAndTriggerHeaders" /* IssueCode.SOURCE_AND_TRIGGER_HEADERS */;
        case "SourceIgnored" /* Protocol.Audits.AttributionReportingIssueType.SourceIgnored */:
            return "AttributionReportingIssue::SourceIgnored" /* IssueCode.SOURCE_IGNORED */;
        case "TriggerIgnored" /* Protocol.Audits.AttributionReportingIssueType.TriggerIgnored */:
            return "AttributionReportingIssue::TriggerIgnored" /* IssueCode.TRIGGER_IGNORED */;
        case "OsSourceIgnored" /* Protocol.Audits.AttributionReportingIssueType.OsSourceIgnored */:
            return "AttributionReportingIssue::OsSourceIgnored" /* IssueCode.OS_SOURCE_IGNORED */;
        case "OsTriggerIgnored" /* Protocol.Audits.AttributionReportingIssueType.OsTriggerIgnored */:
            return "AttributionReportingIssue::OsTriggerIgnored" /* IssueCode.OS_TRIGGER_IGNORED */;
        case "InvalidRegisterOsSourceHeader" /* Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsSourceHeader */:
            return "AttributionReportingIssue::InvalidRegisterOsSourceHeader" /* IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER */;
        case "InvalidRegisterOsTriggerHeader" /* Protocol.Audits.AttributionReportingIssueType.InvalidRegisterOsTriggerHeader */:
            return "AttributionReportingIssue::InvalidRegisterOsTriggerHeader" /* IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER */;
        case "WebAndOsHeaders" /* Protocol.Audits.AttributionReportingIssueType.WebAndOsHeaders */:
            return "AttributionReportingIssue::WebAndOsHeaders" /* IssueCode.WEB_AND_OS_HEADERS */;
        case "NoWebOrOsSupport" /* Protocol.Audits.AttributionReportingIssueType.NoWebOrOsSupport */:
            return "AttributionReportingIssue::NoWebOrOsSupport" /* IssueCode.NO_WEB_OR_OS_SUPPORT */;
        case "NavigationRegistrationWithoutTransientUserActivation" /* Protocol.Audits.AttributionReportingIssueType.NavigationRegistrationWithoutTransientUserActivation */:
            return "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation" /* IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION */;
        case "InvalidInfoHeader" /* Protocol.Audits.AttributionReportingIssueType.InvalidInfoHeader */:
            return "AttributionReportingIssue::InvalidInfoHeader" /* IssueCode.INVALID_INFO_HEADER */;
        case "NoRegisterSourceHeader" /* Protocol.Audits.AttributionReportingIssueType.NoRegisterSourceHeader */:
            return "AttributionReportingIssue::NoRegisterSourceHeader" /* IssueCode.NO_REGISTER_SOURCE_HEADER */;
        case "NoRegisterTriggerHeader" /* Protocol.Audits.AttributionReportingIssueType.NoRegisterTriggerHeader */:
            return "AttributionReportingIssue::NoRegisterTriggerHeader" /* IssueCode.NO_REGISTER_TRIGGER_HEADER */;
        case "NoRegisterOsSourceHeader" /* Protocol.Audits.AttributionReportingIssueType.NoRegisterOsSourceHeader */:
            return "AttributionReportingIssue::NoRegisterOsSourceHeader" /* IssueCode.NO_REGISTER_OS_SOURCE_HEADER */;
        case "NoRegisterOsTriggerHeader" /* Protocol.Audits.AttributionReportingIssueType.NoRegisterOsTriggerHeader */:
            return "AttributionReportingIssue::NoRegisterOsTriggerHeader" /* IssueCode.NO_REGISTER_OS_TRIGGER_HEADER */;
        case "NavigationRegistrationUniqueScopeAlreadySet" /* Protocol.Audits.AttributionReportingIssueType.NavigationRegistrationUniqueScopeAlreadySet */:
            return "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet" /* IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET */;
        default:
            return "AttributionReportingIssue::Unknown" /* IssueCode.UNKNOWN */;
    }
}
const structuredHeaderLink = {
    link: 'https://tools.ietf.org/id/draft-ietf-httpbis-header-structure-15.html#rfc.section.4.2.2',
    linkTitle: 'Structured Headers RFC',
};
export class AttributionReportingIssue extends Issue {
    issueDetails;
    constructor(issueDetails, issuesModel) {
        super(getIssueCode(issueDetails), issuesModel);
        this.issueDetails = issueDetails;
    }
    getCategory() {
        return "AttributionReporting" /* IssueCategory.ATTRIBUTION_REPORTING */;
    }
    getHeaderValidatorLink(name) {
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
    getDescription() {
        switch (this.code()) {
            case "AttributionReportingIssue::PermissionPolicyDisabled" /* IssueCode.PERMISSION_POLICY_DISABLED */:
                return {
                    file: 'arPermissionPolicyDisabled.md',
                    links: [],
                };
            case "AttributionReportingIssue::UntrustworthyReportingOrigin" /* IssueCode.UNTRUSTWORTHY_REPORTING_ORIGIN */:
                return {
                    file: 'arUntrustworthyReportingOrigin.md',
                    links: [],
                };
            case "AttributionReportingIssue::InsecureContext" /* IssueCode.INSECURE_CONTEXT */:
                return {
                    file: 'arInsecureContext.md',
                    links: [],
                };
            case "AttributionReportingIssue::InvalidRegisterSourceHeader" /* IssueCode.INVALID_REGISTER_SOURCE_HEADER */:
                return {
                    file: 'arInvalidRegisterSourceHeader.md',
                    links: [this.getHeaderValidatorLink('source')],
                };
            case "AttributionReportingIssue::InvalidRegisterTriggerHeader" /* IssueCode.INVALID_REGISTER_TRIGGER_HEADER */:
                return {
                    file: 'arInvalidRegisterTriggerHeader.md',
                    links: [this.getHeaderValidatorLink('trigger')],
                };
            case "AttributionReportingIssue::InvalidRegisterOsSourceHeader" /* IssueCode.INVALID_REGISTER_OS_SOURCE_HEADER */:
                return {
                    file: 'arInvalidRegisterOsSourceHeader.md',
                    links: [this.getHeaderValidatorLink('os-source')],
                };
            case "AttributionReportingIssue::InvalidRegisterOsTriggerHeader" /* IssueCode.INVALID_REGISTER_OS_TRIGGER_HEADER */:
                return {
                    file: 'arInvalidRegisterOsTriggerHeader.md',
                    links: [this.getHeaderValidatorLink('os-trigger')],
                };
            case "AttributionReportingIssue::SourceAndTriggerHeaders" /* IssueCode.SOURCE_AND_TRIGGER_HEADERS */:
                return {
                    file: 'arSourceAndTriggerHeaders.md',
                    links: [],
                };
            case "AttributionReportingIssue::WebAndOsHeaders" /* IssueCode.WEB_AND_OS_HEADERS */:
                return {
                    file: 'arWebAndOsHeaders.md',
                    links: [],
                };
            case "AttributionReportingIssue::SourceIgnored" /* IssueCode.SOURCE_IGNORED */:
                return {
                    file: 'arSourceIgnored.md',
                    links: [structuredHeaderLink],
                };
            case "AttributionReportingIssue::TriggerIgnored" /* IssueCode.TRIGGER_IGNORED */:
                return {
                    file: 'arTriggerIgnored.md',
                    links: [structuredHeaderLink],
                };
            case "AttributionReportingIssue::OsSourceIgnored" /* IssueCode.OS_SOURCE_IGNORED */:
                return {
                    file: 'arOsSourceIgnored.md',
                    links: [structuredHeaderLink],
                };
            case "AttributionReportingIssue::OsTriggerIgnored" /* IssueCode.OS_TRIGGER_IGNORED */:
                return {
                    file: 'arOsTriggerIgnored.md',
                    links: [structuredHeaderLink],
                };
            case "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation" /* IssueCode.NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION */:
                return {
                    file: 'arNavigationRegistrationWithoutTransientUserActivation.md',
                    links: [],
                };
            case "AttributionReportingIssue::NoWebOrOsSupport" /* IssueCode.NO_WEB_OR_OS_SUPPORT */:
                return {
                    file: 'arNoWebOrOsSupport.md',
                    links: [],
                };
            case "AttributionReportingIssue::InvalidInfoHeader" /* IssueCode.INVALID_INFO_HEADER */:
                return {
                    file: 'arInvalidInfoHeader.md',
                    links: [],
                };
            case "AttributionReportingIssue::NoRegisterSourceHeader" /* IssueCode.NO_REGISTER_SOURCE_HEADER */:
                return {
                    file: 'arNoRegisterSourceHeader.md',
                    links: [],
                };
            case "AttributionReportingIssue::NoRegisterTriggerHeader" /* IssueCode.NO_REGISTER_TRIGGER_HEADER */:
                return {
                    file: 'arNoRegisterTriggerHeader.md',
                    links: [],
                };
            case "AttributionReportingIssue::NoRegisterOsSourceHeader" /* IssueCode.NO_REGISTER_OS_SOURCE_HEADER */:
                return {
                    file: 'arNoRegisterOsSourceHeader.md',
                    links: [],
                };
            case "AttributionReportingIssue::NoRegisterOsTriggerHeader" /* IssueCode.NO_REGISTER_OS_TRIGGER_HEADER */:
                return {
                    file: 'arNoRegisterOsTriggerHeader.md',
                    links: [],
                };
            case "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet" /* IssueCode.NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET */:
                return {
                    file: 'arNavigationRegistrationUniqueScopeAlreadySet.md',
                    links: [],
                };
            case "AttributionReportingIssue::Unknown" /* IssueCode.UNKNOWN */:
                return null;
        }
    }
    primaryKey() {
        return JSON.stringify(this.issueDetails);
    }
    getKind() {
        return "PageError" /* IssueKind.PAGE_ERROR */;
    }
    static fromInspectorIssue(issuesModel, inspectorIssue) {
        const { attributionReportingIssueDetails } = inspectorIssue.details;
        if (!attributionReportingIssueDetails) {
            console.warn('Attribution Reporting issue without details received.');
            return [];
        }
        return [new AttributionReportingIssue(attributionReportingIssueDetails, issuesModel)];
    }
}
//# sourceMappingURL=AttributionReportingIssue.js.map