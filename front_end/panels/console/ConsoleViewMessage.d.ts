import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import { Icon } from '../../ui/kit/kit.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
import * as Elements from '../elements/elements.js';
import type { ConsoleViewportElement } from './ConsoleViewport.js';
export declare const getMessageForElement: (element: Element) => ConsoleViewMessage | undefined;
interface NodeParamViewInput {
    node: SDK.DOMModel.DOMNode | null;
    /** Rendered instead of the DOM tree once the node turns out to be unresolvable. */
    fallback: LitTemplate | null;
    onTreeResized: () => void;
    onDOMTreeCreated: (domTree: Elements.DOMTreeWidget.DOMTreeWidget) => void;
}
type NodeParamView = (input: NodeParamViewInput, output: undefined, target: HTMLElement) => void;
export declare const NODE_PARAM_VIEW: NodeParamView;
/**
 * A logged DOM node. Resolves the node itself and shows it as a DOM tree, or
 * falls back to `renderFallback` if the node can't be resolved.
 */
export declare class ConsoleNodeParam extends UI.Widget.Widget {
    #private;
    renderFallback: (object: SDK.RemoteObject.RemoteObject) => LitTemplate;
    onDimensionChange: (element: HTMLElement) => void;
    onNodeResolved: () => void;
    constructor(element?: HTMLElement, view?: NodeParamView);
    set remoteObject(remoteObject: SDK.RemoteObject.RemoteObject);
    /**
     * Whether the message is visible. The DOM tree registers global listeners
     * while it is shown, so it only stays shown while the message is visible.
     */
    set visible(visible: boolean);
    performUpdate(): void;
}
interface ErrorParamViewInput {
    error: Bindings.SymbolizedError.SymbolizedError | null;
    ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager;
}
type ErrorParamView = (input: ErrorParamViewInput, output: undefined, target: HTMLElement) => void;
export declare const ERROR_PARAM_VIEW: ErrorParamView;
/** A logged error, symbolized against its source maps before it is shown. */
export declare class ConsoleErrorParam extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: ErrorParamView);
    set remoteObject(remoteObject: SDK.RemoteObject.RemoteObject);
    set exceptionDetails(exceptionDetails: Protocol.Runtime.ExceptionDetails | undefined);
    /** Resolves once the error is symbolized and rendered. */
    get symbolizedForTest(): Promise<void>;
    performUpdate(): void;
}
interface AccessorParamViewInput {
    /** The getter's value, once the user invoked it. */
    result: LitTemplate | null;
    /** Invokes the getter; null when there is no object to invoke it on. */
    onInvoke: (() => void) | null;
}
type AccessorParamView = (input: AccessorParamViewInput, output: undefined, target: HTMLElement) => void;
export declare const ACCESSOR_PARAM_VIEW: AccessorParamView;
/** An accessor property whose value is shown once the user invokes its getter. */
export declare class ConsoleAccessorParam extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: AccessorParamView);
    set object(object: SDK.RemoteObject.RemoteObject | null);
    set propertyPath(propertyPath: string[]);
    /** Renders the getter's result, or returns null to keep showing the invoke button. */
    set renderResult(renderResult: (result: SDK.RemoteObject.CallFunctionResult) => LitTemplate | null);
    performUpdate(): void;
}
export declare class ConsoleViewMessage implements ConsoleViewportElement {
    #private;
    protected message: SDK.ConsoleModel.ConsoleMessage;
    private readonly linkifier;
    private repeatCountInternal;
    private closeGroupDecorationCount;
    private consoleGroupInternal;
    private readonly stackTracePreviews;
    private readonly messageResized;
    protected elementInternal: HTMLElement | null;
    protected consoleRowWrapper: HTMLElement | null;
    protected readonly previewFormatter: ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter;
    private searchRegexInternal;
    protected messageIcon: Icon | null;
    private traceExpanded;
    private expandTrace;
    private hasStackTrace;
    protected anchorElement: HTMLElement | null;
    protected contentElementInternal: HTMLElement | null;
    private nestingLevelMarkers;
    private searchHighlightNodes;
    private searchHighlightNodeChanges;
    private isVisibleInternal;
    private cachedHeight;
    private messagePrefix;
    private timestampElement;
    private inSimilarGroup;
    private similarGroupMarker;
    private lastInSimilarGroup;
    private groupKeyInternal;
    protected repeatCountElement: UI.UIUtils.DevToolsSmallBubble | null;
    private requestResolver;
    private issueResolver;
    constructor(consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier, requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver, onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement | UI.TreeOutline.TreeElement>) => void);
    setInsight(insight: LitTemplate): void;
    element(): HTMLElement;
    wasShown(): void;
    onResize(): void;
    willHide(): void;
    isVisible(): boolean;
    fastHeight(): number;
    approximateFastHeight(): number;
    consoleMessage(): SDK.ConsoleModel.ConsoleMessage;
    formatErrorStackPromiseForTest(): Promise<void>;
    protected buildMessage(): HTMLElement;
    private formatAsNetworkRequest;
    private createAffectedResourceLinks;
    protected buildMessageAnchor(): HTMLElement | null;
    private buildMessageWithStackTrace;
    private buildMessageWithIgnoreLinks;
    private buildMessageHelper;
    private format;
    protected formatParameter(output: SDK.RemoteObject.RemoteObject, forceObjectFormat?: boolean, includePreview?: boolean): LitTemplate;
    private formatParameterAsValue;
    private formatParameterAsTrustedType;
    private formatParameterAsObject;
    private formatParameterAsFunction;
    private formattedParameterAsFunctionForTest;
    private contextMenuEventFired;
    protected renderPropertyPreviewOrAccessor(object: SDK.RemoteObject.RemoteObject | null, property: Protocol.Runtime.PropertyPreview, propertyPath: Array<{
        name: (string | symbol);
    }>): LitTemplate;
    private formatParameterAsNode;
    private formattedParameterAsNodeForTest;
    private formatParameterAsString;
    private renderSymbolizedError;
    private renderPropertyPreview;
    private formatAsAccessorProperty;
    private formatWithSubstitutionString;
    matchesFilterRegex(regexObject: RegExp): boolean;
    matchesFilterText(filter: string): boolean;
    updateTimestamp(): void;
    nestingLevel(): number;
    setConsoleGroup(group: ConsoleGroupViewMessage): void;
    clearConsoleGroup(): void;
    consoleGroup(): ConsoleGroupViewMessage | null;
    isTraceExpanded(): boolean;
    isExpandableTrace(): boolean;
    setTraceExpanded(expanded: boolean): void;
    setInSimilarGroup(inSimilarGroup: boolean, isLast?: boolean): void;
    isLastInSimilarGroup(): boolean;
    resetCloseGroupDecorationCount(): void;
    incrementCloseGroupDecorationCount(): void;
    private updateCloseGroupDecorations;
    private get selectableChildren();
    protected focusedChildIndex(): number;
    private onKeyDown;
    maybeHandleOnKeyDown(event: KeyboardEvent): boolean;
    private selectNearestVisibleChild;
    private nearestVisibleChild;
    focusLastChildOrSelf(): void;
    setContentElement(element: HTMLElement): void;
    getContentElement(): HTMLElement | null;
    contentElement(): HTMLElement;
    toMessageElement(): HTMLElement;
    updateMessageElement(): void;
    shouldShowInsights(): boolean;
    shouldShowTeaser(): boolean;
    getExplainLabel(): string;
    getExplainActionId(): string;
    private shouldRenderAsWarning;
    private updateMessageIcon;
    setAdjacentUserCommandResult(adjacentUserCommandResult: boolean): void;
    repeatCount(): number;
    resetIncrementRepeatCount(): void;
    incrementRepeatCount(): void;
    setRepeatCount(repeatCount: number): void;
    showRepeatCountElement(): void;
    get text(): string;
    toString(): string;
    toExportString(): string;
    toMessageTextString(): string;
    setSearchRegex(regex: RegExp | null): void;
    searchRegex(): RegExp | null;
    searchCount(): number;
    searchHighlightNode(index: number): Element;
    static linkifyWithCustomLinkifier(string: string, linkifier: (arg0: string, arg1: Platform.DevToolsPath.UrlString, arg2?: number, arg3?: number) => Node): DocumentFragment | UI.Widget.Widget;
    /**
     * The frame or worker that this message came from, which the browser attributes opening one of the message's
     * URLs in a new tab to; see {@link Components.Linkifier.openInNewTabInitiatorId}. That is the frame of the
     * request for messages about a request, and the frame of the execution context otherwise, as long as that
     * context still exists. Messages whose context is gone (e.g. from a document that has since been navigated
     * away from, kept with "Preserve log") are not attributed to anything. Determined when a link is opened rather
     * than when the message is rendered, as the context may be destroyed in between.
     */
    private initiatorId;
    private linkifyStringAsFragment;
    groupKey(): string;
    groupTitle(): string;
}
export declare class ConsoleGroupViewMessage extends ConsoleViewMessage {
    private collapsedInternal;
    private expandGroupIcon;
    private readonly onToggle;
    private groupEndMessageInternal;
    constructor(consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier, requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver, onToggle: () => void, onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement | UI.TreeOutline.TreeElement>) => void);
    setCollapsed(collapsed: boolean): void;
    setCollapsedSilent(collapsed: boolean): void;
    collapsed(): boolean;
    maybeHandleOnKeyDown(event: KeyboardEvent): boolean;
    toMessageElement(): HTMLElement;
    showRepeatCountElement(): void;
    messagesHidden(): boolean;
    setGroupEnd(viewMessage: ConsoleViewMessage): void;
    groupEnd(): ConsoleViewMessage | null;
}
export declare class ConsoleCommand extends ConsoleViewMessage {
    private formattedCommand;
    constructor(consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier, requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver, onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement | UI.TreeOutline.TreeElement>) => void);
    contentElement(): HTMLElement;
    private updateSearch;
}
export declare class ConsoleCommandResult extends ConsoleViewMessage {
    contentElement(): HTMLElement;
}
export declare class ConsoleTableMessageView extends ConsoleViewMessage {
    private dataGrid;
    constructor(consoleMessage: SDK.ConsoleModel.ConsoleMessage, linkifier: Components.Linkifier.Linkifier, requestResolver: Logs.RequestResolver.RequestResolver, issueResolver: IssuesManager.IssueResolver.IssueResolver, onResize: (arg0: Common.EventTarget.EventTargetEvent<HTMLElement | UI.TreeOutline.TreeElement>) => void);
    wasShown(): void;
    onResize(): void;
    contentElement(): HTMLElement;
    private buildTableMessage;
    approximateFastHeight(): number;
    private populateTableContextMenu;
    private copyTableAsMarkdown;
    private copyTableAsCSV;
    getDataGridForTest(): DataGrid.SortableDataGrid.SortableDataGrid<unknown> | null;
    populateTableContextMenuForTest(contextMenu: UI.ContextMenu.ContextMenu): void;
}
export declare const getMaxTokenizableStringLength: () => number;
export declare const setMaxTokenizableStringLength: (length: number) => void;
export declare const getLongStringVisibleLength: () => number;
export declare const setLongStringVisibleLength: (length: number) => void;
export {};
