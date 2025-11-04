import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import type { MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare const enum IssueCode {
    INSECURE_PRIVATE_NETWORK = "CorsIssue::InsecurePrivateNetwork",
    INVALID_HEADER_VALUES = "CorsIssue::InvalidHeaders",
    WILDCARD_ORIGN_NOT_ALLOWED = "CorsIssue::WildcardOriginWithCredentials",
    PREFLIGHT_RESPONSE_INVALID = "CorsIssue::PreflightResponseInvalid",
    ORIGIN_MISMATCH = "CorsIssue::OriginMismatch",
    ALLOW_CREDENTIALS_REQUIRED = "CorsIssue::AllowCredentialsRequired",
    METHOD_DISALLOWED_BY_PREFLIGHT_RESPONSE = "CorsIssue::MethodDisallowedByPreflightResponse",
    HEADER_DISALLOWED_BY_PREFLIGHT_RESPONSE = "CorsIssue::HeaderDisallowedByPreflightResponse",
    REDIRECT_CONTAINS_CREDENTIALS = "CorsIssue::RedirectContainsCredentials",
    DISALLOWED_BY_MODE = "CorsIssue::DisallowedByMode",
    CORS_DISABLED_SCHEME = "CorsIssue::CorsDisabledScheme",
    PREFLIGHT_MISSING_ALLOW_EXTERNAL = "CorsIssue::PreflightMissingAllowExternal",
    PREFLIGHT_INVALID_ALLOW_EXTERNAL = "CorsIssue::PreflightInvalidAllowExternal",
    NO_CORS_REDIRECT_MODE_NOT_FOLLOW = "CorsIssue::NoCorsRedirectModeNotFollow",
    INVALID_PRIVATE_NETWORK_ACCESS = "CorsIssue::InvalidPrivateNetworkAccess",
    UNEXPECTED_PRIVATE_NETWORK_ACCESS = "CorsIssue::UnexpectedPrivateNetworkAccess",
    PREFLIGHT_ALLOW_PRIVATE_NETWORK_ERROR = "CorsIssue::PreflightAllowPrivateNetworkError",
    PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_ID = "CorsIssue::PreflightMissingPrivateNetworkAccessId",
    PREFLIGHT_MISSING_PRIVATE_NETWORK_ACCESS_NAME = "CorsIssue::PreflightMissingPrivateNetworkAccessName",
    PRIVATE_NETWORK_ACCESS_PERMISSION_UNAVAILABLE = "CorsIssue::PrivateNetworkAccessPermissionUnavailable",
    PRIVATE_NETWORK_ACCESS_PERMISSION_DENIED = "CorsIssue::PrivateNetworkAccessPermissionDenied",
    LOCAL_NETWORK_ACCESS_PERMISSION_DENIED = "CorsIssue::LocalNetworkAccessPermissionDenied"
}
export declare class CorsIssue extends Issue<IssueCode> {
    #private;
    constructor(issueDetails: Protocol.Audits.CorsIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null, issueId: Protocol.Audits.IssueId | undefined);
    getCategory(): IssueCategory;
    details(): Protocol.Audits.CorsIssueDetails;
    getDescription(): MarkdownIssueDescription | null;
    primaryKey(): string;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): CorsIssue[];
}
