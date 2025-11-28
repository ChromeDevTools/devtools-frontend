import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import { type MarkdownIssueDescription } from './MarkdownIssueDescription.js';
/** The enum string values need to match the IssueExpanded enum values in UserMetrics.ts. **/
export declare const enum CookieIssueSubCategory {
    GENERIC_COOKIE = "GenericCookie",
    SAME_SITE_COOKIE = "SameSiteCookie",
    THIRD_PARTY_PHASEOUT_COOKIE = "ThirdPartyPhaseoutCookie"
}
/** Enum to show cookie status from the security panel's third-party cookie report tool **/
export declare const enum CookieStatus {
    BLOCKED = 0,
    ALLOWED = 1,
    ALLOWED_BY_GRACE_PERIOD = 2,
    ALLOWED_BY_HEURISTICS = 3
}
export interface CookieReportInfo {
    name: string;
    domain: string;
    type?: string;
    platform?: string;
    status: CookieStatus;
    insight?: Protocol.Audits.CookieIssueInsight;
}
export declare class CookieIssue extends Issue<Protocol.Audits.CookieIssueDetails> {
    cookieId(): string;
    primaryKey(): string;
    /**
     * Returns an array of issues from a given CookieIssueDetails.
     */
    static createIssuesFromCookieIssueDetails(cookieIssueDetails: Protocol.Audits.CookieIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null, issueId: Protocol.Audits.IssueId | undefined): CookieIssue[];
    /**
     * Calculates an issue code from a reason, an operation, and an array of warningReasons. All these together
     * can uniquely identify a specific cookie issue.
     * warningReasons is only needed for some CookieExclusionReason in order to determine if an issue should be raised.
     * It is not required if reason is a CookieWarningReason.
     *
     * The issue code will be mapped to a CookieIssueSubCategory enum for metric purpose.
     */
    static codeForCookieIssueDetails(reason: Protocol.Audits.CookieExclusionReason | Protocol.Audits.CookieWarningReason, warningReasons: Protocol.Audits.CookieWarningReason[], operation: Protocol.Audits.CookieOperation, cookieUrl?: Platform.DevToolsPath.UrlString): string | null;
    cookies(): Iterable<Protocol.Audits.AffectedCookie>;
    rawCookieLines(): Iterable<string>;
    requests(): Iterable<Protocol.Audits.AffectedRequest>;
    getCategory(): IssueCategory;
    getDescription(): MarkdownIssueDescription | null;
    isCausedByThirdParty(): boolean;
    getKind(): IssueKind;
    makeCookieReportEntry(): CookieReportInfo | undefined;
    static getCookieStatus(cookieIssueDetails: Protocol.Audits.CookieIssueDetails): CookieStatus | undefined;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): CookieIssue[];
    static getSubCategory(code: string): CookieIssueSubCategory;
    static isThirdPartyCookiePhaseoutRelatedIssue(issue: Issue): boolean;
    maybeCreateConsoleMessage(): SDK.ConsoleModel.ConsoleMessage | undefined;
}
/**
 * Exported for unit test.
 */
export declare function isCausedByThirdParty(outermostFrame: SDK.ResourceTreeModel.ResourceTreeFrame | null, cookieUrl?: string, siteForCookies?: string): boolean;
