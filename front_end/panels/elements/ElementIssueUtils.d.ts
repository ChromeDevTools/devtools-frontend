import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
export interface ElementIssueDetails {
    tooltip: string;
    nodeId?: Protocol.DOM.BackendNodeId;
    attribute?: string;
}
export declare function getElementIssueDetails(issue: IssuesManager.Issue.Issue): ElementIssueDetails | undefined;
