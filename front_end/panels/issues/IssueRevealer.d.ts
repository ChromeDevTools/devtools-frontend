import type * as Common from '../../core/common/common.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
export declare class IssueRevealer implements Common.Revealer.Revealer<IssuesManager.Issue.Issue> {
    reveal(issue: IssuesManager.Issue.Issue): Promise<void>;
}
