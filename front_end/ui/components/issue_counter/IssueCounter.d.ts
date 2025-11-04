import '../icon_button/icon_button.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
export declare function getIssueKindIconName(issueKind: IssuesManager.Issue.IssueKind): string;
export declare const enum DisplayMode {
    OMIT_EMPTY = "OmitEmpty",
    SHOW_ALWAYS = "ShowAlways",
    ONLY_MOST_IMPORTANT = "OnlyMostImportant"
}
export interface IssueCounterData {
    clickHandler?: () => void;
    tooltipCallback?: () => void;
    leadingText?: string;
    displayMode?: DisplayMode;
    issuesManager: IssuesManager.IssuesManager.IssuesManager;
    throttlerTimeout?: number;
    accessibleName?: string;
    compact?: boolean;
}
export declare function getIssueCountsEnumeration(issuesManager: IssuesManager.IssuesManager.IssuesManager, omitEmpty?: boolean): string;
export declare class IssueCounter extends HTMLElement {
    #private;
    scheduleUpdate(): void;
    set data(data: IssueCounterData);
    get data(): IssueCounterData;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-issue-counter': IssueCounter;
    }
}
