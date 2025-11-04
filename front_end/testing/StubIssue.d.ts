import * as Protocol from '../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from '../models/issues_manager/Issue.js';
export declare class StubIssue extends Issue {
    private requestIds;
    private cookieNames;
    private issueKind;
    private locations;
    private mockIssueId?;
    private mockIssueCategory?;
    constructor(code: string, requestIds: string[], cookieNames: string[], issueKind?: IssueKind);
    getDescription(): {
        file: string;
        links: never[];
    };
    primaryKey(): string;
    requests(): {
        requestId: Protocol.Network.RequestId;
        url: string;
    }[];
    getCategory(): IssueCategory;
    sources(): Protocol.Audits.SourceCodeLocation[];
    getKind(): IssueKind;
    cookies(): {
        name: string;
        domain: string;
        path: string;
    }[];
    getIssueId(): Protocol.Audits.IssueId | undefined;
    static createFromRequestIds(requestIds: string[]): StubIssue;
    static createFromCookieNames(cookieNames: string[]): StubIssue;
    static createFromIssueKinds(issueKinds: IssueKind[]): StubIssue[];
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
