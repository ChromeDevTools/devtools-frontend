import * as Common from '../core/common/common.js';
import type * as SDK from '../core/sdk/sdk.js';
import type * as IssuesManager from '../models/issues_manager/issues_manager.js';
export declare class MockIssuesModel extends Common.ObjectWrapper.ObjectWrapper<SDK.IssuesModel.EventTypes> {
    private mockIssues;
    constructor(issues: Iterable<IssuesManager.Issue.Issue>);
    issues(): Iterable<IssuesManager.Issue.Issue<string>>;
    target(): {
        id: () => string;
    };
}
