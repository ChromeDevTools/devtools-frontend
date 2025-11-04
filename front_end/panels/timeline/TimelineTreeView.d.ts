import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { TimelineRegExp } from './TimelineFilters.js';
import { type TimelineSelection } from './TimelineSelection.js';
declare const TimelineTreeView_base: (new (...args: any[]) => {
    addEventListener<T extends keyof TimelineTreeView.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<TimelineTreeView.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<TimelineTreeView.EventTypes, T>;
    once<T extends keyof TimelineTreeView.EventTypes>(eventType: T): Promise<TimelineTreeView.EventTypes[T]>;
    removeEventListener<T extends keyof TimelineTreeView.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<TimelineTreeView.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof TimelineTreeView.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof TimelineTreeView.EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<TimelineTreeView.EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
/**
 * For an overview, read: https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/main/front_end/panels/timeline/README.md#timeline-tree-views
 */
export declare class TimelineTreeView extends TimelineTreeView_base implements UI.SearchableView.Searchable {
    #private;
    private searchResults;
    linkifier: Components.Linkifier.Linkifier;
    dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
    private lastHoveredProfileNode;
    private textFilterInternal;
    private taskFilter;
    protected startTime: Trace.Types.Timing.Milli;
    protected endTime: Trace.Types.Timing.Milli;
    splitWidget: UI.SplitWidget.SplitWidget;
    detailsView: UI.Widget.Widget;
    private searchableView;
    private currentThreadSetting?;
    private lastSelectedNodeInternal?;
    private root?;
    private currentResult?;
    textFilterUI?: UI.Toolbar.ToolbarInput;
    private caseSensitiveButton;
    private regexButton;
    private matchWholeWord;
    eventToTreeNode: WeakMap<Trace.Types.Events.Event, Trace.Extras.TraceTree.Node>;
    /**
     * Determines if the first child in the data grid will be selected
     * by default when refreshTree() gets called.
     */
    protected autoSelectFirstChildOnRefresh: boolean;
    constructor();
    setSearchableView(searchableView: UI.SearchableView.SearchableView): void;
    setModelWithEvents(selectedEvents: Trace.Types.Events.Event[] | null, parsedTrace?: Trace.TraceModel.ParsedTrace | null, entityMappings?: Trace.EntityMapper.EntityMapper | null): void;
    entityMapper(): Trace.EntityMapper.EntityMapper | null;
    parsedTrace(): Trace.TraceModel.ParsedTrace | null;
    init(): void;
    lastSelectedNode(): Trace.Extras.TraceTree.Node | null | undefined;
    updateContents(selection: TimelineSelection): void;
    setRange(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void;
    highlightEventInTree(event: Trace.Types.Events.Event | null): void;
    filters(): Trace.Extras.TraceFilter.TraceFilter[];
    filtersWithoutTextFilter(): Trace.Extras.TraceFilter.TraceFilter[];
    textFilter(): TimelineRegExp;
    exposePercentages(): boolean;
    populateToolbar(toolbar: UI.Toolbar.Toolbar): void;
    selectedEvents(): Trace.Types.Events.Event[];
    appendContextMenuItems(_contextMenu: UI.ContextMenu.ContextMenu, _node: Trace.Extras.TraceTree.Node): void;
    selectProfileNode(treeNode: Trace.Extras.TraceTree.Node, suppressSelectedEvent: boolean): void;
    refreshTree(): void;
    buildTree(): Trace.Extras.TraceTree.Node;
    buildTopDownTree(doNotAggregate: boolean, eventGroupIdCallback: ((arg0: Trace.Types.Events.Event) => string) | null): Trace.Extras.TraceTree.Node;
    populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void;
    sortingChanged(): void;
    getSortingFunction(columnId: string): ((a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>, b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>) => number) | null;
    private onShowModeChanged;
    protected updateDetailsForSelection(): void;
    showDetailsForNode(_node: Trace.Extras.TraceTree.Node): boolean;
    private onMouseMove;
    onHover(node: Trace.Extras.TraceTree.Node | null): void;
    onClick(node: Trace.Extras.TraceTree.Node | null): void;
    wasShown(): void;
    childWasDetached(_widget: UI.Widget.Widget): void;
    onGridNodeOpened(): void;
    private onContextMenu;
    dataGridElementForEvent(event: Trace.Types.Events.Event | null): HTMLElement | null;
    dataGridNodeForTreeNode(treeNode: Trace.Extras.TraceTree.Node): GridNode | null;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export declare namespace TimelineTreeView {
    const enum Events {
        TREE_ROW_HOVERED = "TreeRowHovered",
        BOTTOM_UP_BUTTON_CLICKED = "BottomUpButtonClicked",
        TREE_ROW_CLICKED = "TreeRowClicked"
    }
    interface EventTypes {
        [Events.TREE_ROW_HOVERED]: {
            node: Trace.Extras.TraceTree.Node | null;
            events?: Trace.Types.Events.Event[];
        };
        [Events.BOTTOM_UP_BUTTON_CLICKED]: Trace.Extras.TraceTree.Node | null;
        [Events.TREE_ROW_CLICKED]: {
            node: Trace.Extras.TraceTree.Node | null;
            events?: Trace.Types.Events.Event[];
        };
    }
}
/**
 * GridNodes are 1:1 with `TraceTree.Node`s but represent them within the DataGrid. It handles the representation as a row.
 * `TreeGridNode` extends this to maintain relationship to the tree, and handles populate().
 *
 * `TimelineStackView` (aka heaviest stack) uses GridNode directly (as there's no hierarchy there), otherwise these TreeGridNode could probably be consolidated.
 */
export declare class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode<GridNode> {
    #private;
    protected populated: boolean;
    profileNode: Trace.Extras.TraceTree.Node;
    protected treeView: TimelineTreeView;
    protected grandTotalTime: number;
    protected maxSelfTime: number;
    protected maxTotalTime: number;
    linkElement: Element | null;
    constructor(profileNode: Trace.Extras.TraceTree.Node, grandTotalTime: number, maxSelfTime: number, maxTotalTime: number, treeView: TimelineTreeView);
    createCell(columnId: string): HTMLElement;
    private createNameCell;
    private createValueCell;
    private generateBottomUpButton;
}
/**
 * `TreeGridNode` lets a `GridNode` (row) populate based on its tree children.
 */
export declare class TreeGridNode extends GridNode {
    constructor(profileNode: Trace.Extras.TraceTree.Node, grandTotalTime: number, maxSelfTime: number, maxTotalTime: number, treeView: TimelineTreeView);
    populate(): void;
}
export declare class AggregatedTimelineTreeView extends TimelineTreeView {
    #private;
    protected readonly groupBySetting: Common.Settings.Setting<AggregatedTimelineTreeView.GroupBy>;
    readonly stackView: TimelineStackView;
    constructor();
    setGroupBySetting(groupBy: AggregatedTimelineTreeView.GroupBy): void;
    updateContents(selection: TimelineSelection): void;
    private beautifyDomainName;
    displayInfoForGroupNode(node: Trace.Extras.TraceTree.Node): {
        name: string;
        color: string;
        icon: (Element | undefined);
    };
    populateToolbar(toolbar: UI.Toolbar.Toolbar): void;
    private buildHeaviestStack;
    exposePercentages(): boolean;
    private onStackViewSelectionChanged;
    showDetailsForNode(node: Trace.Extras.TraceTree.Node): boolean;
    protected groupingFunction(groupBy: AggregatedTimelineTreeView.GroupBy): ((arg0: Trace.Types.Events.Event) => string) | null;
    private domainByEvent;
    private static isExtensionInternalURL;
    private static isV8NativeURL;
    private static readonly extensionInternalPrefix;
    private static readonly v8NativePrefix;
    onHover(node: Trace.Extras.TraceTree.Node | null): void;
    onClick(node: Trace.Extras.TraceTree.Node | null): void;
}
export declare namespace AggregatedTimelineTreeView {
    enum GroupBy {
        None = "None",
        EventName = "EventName",
        Category = "Category",
        Domain = "Domain",
        Subdomain = "Subdomain",
        URL = "URL",
        Frame = "Frame",
        ThirdParties = "ThirdParties"
    }
}
export declare class CallTreeTimelineTreeView extends AggregatedTimelineTreeView {
    constructor();
    buildTree(): Trace.Extras.TraceTree.Node;
}
export declare class BottomUpTimelineTreeView extends AggregatedTimelineTreeView {
    constructor();
    buildTree(): Trace.Extras.TraceTree.Node;
}
declare const TimelineStackView_base: (new (...args: any[]) => {
    addEventListener<T extends keyof TimelineStackView.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<TimelineStackView.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<TimelineStackView.EventTypes, T>;
    once<T extends keyof TimelineStackView.EventTypes>(eventType: T): Promise<TimelineStackView.EventTypes[T]>;
    removeEventListener<T extends keyof TimelineStackView.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<TimelineStackView.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof TimelineStackView.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof TimelineStackView.EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<TimelineStackView.EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class TimelineStackView extends TimelineStackView_base {
    private readonly treeView;
    private readonly dataGrid;
    constructor(treeView: TimelineTreeView);
    setStack(stack: Trace.Extras.TraceTree.Node[], selectedNode: Trace.Extras.TraceTree.Node): void;
    onMouseMove(event: Event): void;
    selectedTreeNode(): Trace.Extras.TraceTree.Node | null;
    private onSelectionChanged;
}
export declare namespace TimelineStackView {
    const enum Events {
        SELECTION_CHANGED = "SelectionChanged",
        TREE_ROW_HOVERED = "TreeRowHovered"
    }
    interface EventTypes {
        [Events.TREE_ROW_HOVERED]: Trace.Extras.TraceTree.Node | null;
        [Events.SELECTION_CHANGED]: void;
    }
}
export {};
