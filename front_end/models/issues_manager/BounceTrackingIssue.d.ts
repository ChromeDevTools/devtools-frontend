import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import type { MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare class BounceTrackingIssue extends Issue {
    #private;
    constructor(issueDetails: Protocol.Audits.BounceTrackingIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null);
    getCategory(): IssueCategory;
    getDescription(): MarkdownIssueDescription;
    details(): Protocol.Audits.BounceTrackingIssueDetails;
    getKind(): IssueKind;
    primaryKey(): string;
    trackingSites(): Iterable<string>;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): BounceTrackingIssue[];
}
