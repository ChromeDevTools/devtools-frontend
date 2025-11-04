import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import type * as NetworkForward from '../../panels/network/forward/forward.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { AggregatedIssue } from './IssueAggregator.js';
import type { IssueView } from './IssueView.js';
export declare const enum AffectedItem {
    COOKIE = "Cookie",
    DIRECTIVE = "Directive",
    ELEMENT = "Element",
    REQUEST = "Request",
    SOURCE = "Source"
}
export declare const extractShortPath: (path: Platform.DevToolsPath.UrlString) => string;
export interface CreateRequestCellOptions {
    linkToPreflight?: boolean;
    highlightHeader?: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        name: string;
    };
    networkTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
    additionalOnClickAction?: () => void;
}
/**
 * The base class for all affected resource views. It provides basic scaffolding
 * as well as machinery for resolving request and frame ids to SDK objects.
 */
export declare abstract class AffectedResourcesView extends UI.TreeOutline.TreeElement {
    #private;
    protected issue: AggregatedIssue;
    protected affectedResourcesCountElement: HTMLElement;
    protected affectedResources: HTMLElement;
    protected requestResolver: Logs.RequestResolver.RequestResolver;
    constructor(parent: IssueView, issue: AggregatedIssue, jslogContext: string);
    /**
     * Sets the issue to take the resources from. Does not
     * trigger an update, the caller needs to do that explicitly.
     */
    setIssue(issue: AggregatedIssue): void;
    createAffectedResourcesCounter(): HTMLElement;
    createAffectedResources(): HTMLElement;
    protected abstract getResourceNameWithCount(count: number): string;
    protected updateAffectedResourceCount(count: number): void;
    isEmpty(): boolean;
    clear(): void;
    expandIfOneResource(): void;
    protected createFrameCell(frameId: Protocol.Page.FrameId, issueCategory: IssuesManager.Issue.IssueCategory): HTMLElement;
    protected createRequestCell(affectedRequest: Protocol.Audits.AffectedRequest, options?: CreateRequestCellOptions): HTMLElement;
    protected createElementCell({ backendNodeId, nodeName, target }: IssuesManager.Issue.AffectedElement, issueCategory: IssuesManager.Issue.IssueCategory): Promise<Element>;
    protected appendSourceLocation(element: HTMLElement, sourceLocation: {
        url: string;
        lineNumber: number;
        scriptId?: Protocol.Runtime.ScriptId;
        columnNumber?: number;
    } | undefined, target: SDK.Target.Target | null | undefined): void;
    protected appendColumnTitle(header: HTMLElement, title: string, additionalClass?: string | null): void;
    protected createIssueDetailCell(textContent: string | HTMLElement, additionalClass?: string | null): HTMLTableDataCellElement;
    protected appendIssueDetailCell(element: HTMLElement, textContent: string | HTMLElement, additionalClass?: string | null): HTMLTableDataCellElement;
    abstract update(): void;
}
