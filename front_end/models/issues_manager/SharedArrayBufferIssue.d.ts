import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import type { MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare class SharedArrayBufferIssue extends Issue {
    #private;
    constructor(issueDetails: Protocol.Audits.SharedArrayBufferIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null);
    getCategory(): IssueCategory;
    details(): Protocol.Audits.SharedArrayBufferIssueDetails;
    getDescription(): MarkdownIssueDescription;
    primaryKey(): string;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): SharedArrayBufferIssue[];
}
