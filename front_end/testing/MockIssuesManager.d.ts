import * as Common from '../core/common/common.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import type { StubIssue } from './StubIssue.js';
export declare class MockIssuesManager extends Common.ObjectWrapper.ObjectWrapper<IssuesManager.IssuesManager.EventTypes> {
    private mockIssues;
    private issueCounts;
    private mockModel;
    constructor(issues: Iterable<IssuesManager.Issue.Issue>);
    issues(): IssuesManager.Issue.Issue<IssuesManager.Issue.ValidIssueDetails | null, string>[];
    getIssueById(id: string): IssuesManager.Issue.Issue | null;
    numberOfIssues(kind?: IssuesManager.Issue.IssueKind): number;
    setNumberOfIssues(counts: Map<IssuesManager.Issue.IssueKind, number>): void;
    incrementIssueCountsOfAllKinds(): void;
    addIssue(mockIssue: StubIssue): void;
}
