import * as Protocol from '../generated/protocol.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
export declare class StubIssue extends IssuesManager.Issue.Issue {
    private requestIds;
    private cookieNames;
    private issueKind;
    private locations;
    private mockIssueId?;
    private mockIssueCategory?;
    constructor(code: string, requestIds: string[], cookieNames: string[], issueKind?: IssuesManager.Issue.IssueKind);
    getDescription(): IssuesManager.MarkdownIssueDescription.MarkdownIssueDescription;
    primaryKey(): string;
    requests(): Protocol.Audits.AffectedRequest[];
    getCategory(): IssuesManager.Issue.IssueCategory;
    sources(): Protocol.Audits.SourceCodeLocation[];
    getKind(): IssuesManager.Issue.IssueKind;
    cookies(): Protocol.Audits.AffectedCookie[];
    getIssueId(): Protocol.Audits.IssueId | undefined;
    static createFromRequestIds(requestIds: string[]): StubIssue;
    static createFromCookieNames(cookieNames: string[]): StubIssue;
    static createFromIssueKinds(issueKinds: IssuesManager.Issue.IssueKind[]): StubIssue[];
    static createFromAffectedLocations(locations: Protocol.Audits.SourceCodeLocation[]): StubIssue;
    static createFromIssueId(issueId: Protocol.Audits.IssueId): StubIssue;
    static createCookieIssue(code: string): StubIssue;
}
export declare class ThirdPartyStubIssue extends StubIssue {
    private isThirdParty;
    constructor(code: string, isThirdParty: boolean);
    isCausedByThirdParty(): boolean;
}
export declare function mkInspectorCspIssue(blockedURL: string): Protocol.Audits.InspectorIssue;
