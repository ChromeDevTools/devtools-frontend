import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import { type MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare class UserReidentificationIssue extends Issue {
    #private;
    constructor(issueDetails: Protocol.Audits.UserReidentificationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null);
    primaryKey(): string;
    requests(): Iterable<Protocol.Audits.AffectedRequest>;
    getCategory(): IssueCategory;
    getDescription(): MarkdownIssueDescription | null;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): UserReidentificationIssue[];
}
