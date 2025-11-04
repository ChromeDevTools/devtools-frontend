import * as Workspace from '../../models/workspace/workspace.js';
import { type IssueKind } from './Issue.js';
import type { IssuesManager } from './IssuesManager.js';
export declare class SourceFrameIssuesManager {
    #private;
    private readonly issuesManager;
    constructor(issuesManager: IssuesManager);
}
export declare class IssueMessage extends Workspace.UISourceCode.Message {
    #private;
    constructor(title: string, kind: IssueKind, clickHandler: () => void);
    getIssueKind(): IssueKind;
}
