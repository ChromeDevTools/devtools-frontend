import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import type { MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare const enum IssueCode {
    PERMISSION_POLICY_DISABLED = "AttributionReportingIssue::PermissionPolicyDisabled",
    UNTRUSTWORTHY_REPORTING_ORIGIN = "AttributionReportingIssue::UntrustworthyReportingOrigin",
    INSECURE_CONTEXT = "AttributionReportingIssue::InsecureContext",
    INVALID_REGISTER_SOURCE_HEADER = "AttributionReportingIssue::InvalidRegisterSourceHeader",
    INVALID_REGISTER_TRIGGER_HEADER = "AttributionReportingIssue::InvalidRegisterTriggerHeader",
    SOURCE_AND_TRIGGER_HEADERS = "AttributionReportingIssue::SourceAndTriggerHeaders",
    SOURCE_IGNORED = "AttributionReportingIssue::SourceIgnored",
    TRIGGER_IGNORED = "AttributionReportingIssue::TriggerIgnored",
    OS_SOURCE_IGNORED = "AttributionReportingIssue::OsSourceIgnored",
    OS_TRIGGER_IGNORED = "AttributionReportingIssue::OsTriggerIgnored",
    INVALID_REGISTER_OS_SOURCE_HEADER = "AttributionReportingIssue::InvalidRegisterOsSourceHeader",
    INVALID_REGISTER_OS_TRIGGER_HEADER = "AttributionReportingIssue::InvalidRegisterOsTriggerHeader",
    WEB_AND_OS_HEADERS = "AttributionReportingIssue::WebAndOsHeaders",
    NO_WEB_OR_OS_SUPPORT = "AttributionReportingIssue::NoWebOrOsSupport",
    NAVIGATION_REGISTRATION_WITHOUT_TRANSIENT_USER_ACTIVATION = "AttributionReportingIssue::NavigationRegistrationWithoutTransientUserActivation",
    INVALID_INFO_HEADER = "AttributionReportingIssue::InvalidInfoHeader",
    NO_REGISTER_SOURCE_HEADER = "AttributionReportingIssue::NoRegisterSourceHeader",
    NO_REGISTER_TRIGGER_HEADER = "AttributionReportingIssue::NoRegisterTriggerHeader",
    NO_REGISTER_OS_SOURCE_HEADER = "AttributionReportingIssue::NoRegisterOsSourceHeader",
    NO_REGISTER_OS_TRIGGER_HEADER = "AttributionReportingIssue::NoRegisterOsTriggerHeader",
    NAVIGATION_REGISTRATION_UNIQUE_SCOPE_ALREADY_SET = "AttributionReportingIssue::NavigationRegistrationUniqueScopeAlreadySet",
    UNKNOWN = "AttributionReportingIssue::Unknown"
}
export declare class AttributionReportingIssue extends Issue<Protocol.Audits.AttributionReportingIssueDetails, IssueCode> {
    constructor(issueDetails: Protocol.Audits.AttributionReportingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null);
    getCategory(): IssueCategory;
    getHeaderValidatorLink(name: string): {
        link: string;
        linkTitle: string;
    };
    getDescription(): MarkdownIssueDescription | null;
    primaryKey(): string;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): AttributionReportingIssue[];
}
