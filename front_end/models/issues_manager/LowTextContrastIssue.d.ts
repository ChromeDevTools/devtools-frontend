import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import type { MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare class LowTextContrastIssue extends Issue<Protocol.Audits.LowTextContrastIssueDetails> {
    constructor(issueDetails: Protocol.Audits.LowTextContrastIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null);
    primaryKey(): string;
    getCategory(): IssueCategory;
    getDescription(): MarkdownIssueDescription;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): LowTextContrastIssue[];
}
