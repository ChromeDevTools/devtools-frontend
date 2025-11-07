import * as Platform from '../../core/platform/platform.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import { AffectedResourcesView } from './AffectedResourcesView.js';
import type { IssueView } from './IssueView.js';
export declare class CorsIssueDetailsView extends AffectedResourcesView {
    #private;
    constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string);
    protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString;
    private static getHeaderFromError;
    private static getProblemFromError;
    update(): void;
}
