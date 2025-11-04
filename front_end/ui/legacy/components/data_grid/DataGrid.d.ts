import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';
import type { DataGridInternalToken } from './DataGridElement.js';
export declare class DataGridImpl<T> extends Common.ObjectWrapper.ObjectWrapper<EventTypes<T>> {
    #private;
    element: HTMLDivElement;
    displayName: string;
    private editCallback;
    deleteCallback: ((arg0: any) => void) | undefined;
    refreshCallback: (() => void) | undefined;
    private dataTableHeaders;
    scrollContainerInternal: Element;
    private readonly dataTable;
    protected inline: boolean;
    private columnsArray;
    columns: Record<string, ColumnDescriptor>;
    visibleColumnsArray: ColumnDescriptor[];
    cellClass: string | null;
    private readonly headerRow;
    private readonly dataTableColumnGroup;
    dataTableBody: Element;
    topFillerRow: HTMLElement;
    private bottomFillerRow;
    private editing;
    selectedNode: DataGridNode<T> | null;
    expandNodesWhenArrowing: boolean;
    indentWidth: number;
    private resizers;
    private columnWidthsInitialized;
    private cornerWidth;
    private resizeMethod;
    private headerContextMenuCallback;
    private rowContextMenuCallback;
    elementToDataGridNode: WeakMap<Node, DataGridNode<T>>;
    disclosureColumnId?: string;
    private sortColumnCell?;
    private editingNode?;
    private columnWeightsSetting?;
    creationNode?: DataGridNode<any>;
    private currentResizer?;
    private dataGridWidget?;
    constructor(dataGridParameters: Parameters);
    setEditCallback(editCallback: ((node: any, columnId: string, valueBeforeEditing: any, newText: any, moveDirection?: string) => void) | undefined, _internalToken: DataGridInternalToken): void;
    private firstSelectableNode;
    private lastSelectableNode;
    setElementContent(element: Element, value: string): void;
    static setElementText(element: Element, newText: string, longText: boolean, gridNode?: DataGridNode<string>): void;
    static setElementBoolean(element: Element, value: boolean, gridNode?: DataGridNode<string>): void;
    static updateNodeAccessibleText(gridNode: DataGridNode<string>): void;
    setStriped(isStriped: boolean): void;
    setFocusable(focusable: boolean): void;
    setHasSelection(hasSelected: boolean): void;
    announceSelectedGridNode(): void;
    protected getNumberOfRows(): number;
    updateGridAccessibleNameOnFocus(): void;
    addColumn(column: ColumnDescriptor, position?: number): void;
    removeColumn(columnId: string): void;
    setCellClass(cellClass: string): void;
    private refreshHeader;
    protected setVerticalPadding(top: number, bottom: number, isConstructorTime?: boolean): void;
    protected setRootNode(rootNode: DataGridNode<T>): void;
    rootNode(): DataGridNode<T>;
    isColumnEditable(columnId: string): boolean;
    private ondblclick;
    private startEditingColumnOfDataGridNode;
    startEditingNextEditableColumnOfDataGridNode(node: DataGridNode<T>, columnIdentifier: string, inclusive?: boolean): void;
    private startEditing;
    renderInline(): void;
    private startEditingConfig;
    private editingCommitted;
    private editingCancelled;
    private nextEditableColumn;
    sortColumnId(): string | null;
    sortOrder(): string | null;
    isSortOrderAscending(): boolean;
    private autoSizeWidths;
    /**
     * The range of |minPercent| and |maxPercent| is [0, 100].
     *
     * FYI: Only used in test: chromium/src/third_party/blink/web_tests/http/tests/devtools/components/datagrid.js
     */
    autoSizeColumns(minPercent: number, maxPercent?: number, maxDescentLevel?: number): void;
    private enumerateChildren;
    onResize(): void;
    updateWidths(): void;
    indexOfVisibleColumn(columnId: string): number;
    setName(name: string): void;
    private resetColumnWeights;
    private loadColumnWeights;
    private saveColumnWeights;
    wasShown(): void;
    willHide(): void;
    private getPreferredWidth;
    private applyColumnWeights;
    setColumnsVisibility(columnsVisibility: Set<string>): void;
    get scrollContainer(): HTMLElement;
    private positionResizers;
    addCreationNode(hasChildren?: boolean): void;
    private keyDown;
    updateSelectionBeforeRemoval(root: DataGridNode<T> | null, _onlyAffectsSubtree: boolean): void;
    dataGridNodeFromNode(target: Node): DataGridNode<T> | null;
    columnIdFromNode(target: Node): string | null;
    /**
     * Mark the data-grid as inert, meaning that it will not capture any user interactions.
     * Useful in some panels where the empty state is actually an absolutely
     * positioned div put over the panel, and in that case we need to ensure the
     * hidden, empty data grid, does not capture any user interaction - in particular if they tab through the UI.
     */
    setInert(isInert: boolean): void;
    private clickInHeaderCell;
    private keydownHeaderCell;
    /**
     * Sorts by column header cell.
     * Additionally applies the aria-sort label to a column's th.
     * Guidance on values of attribute taken from
     * https://www.w3.org/TR/wai-aria-practices/examples/grid/dataGrids.html.
     */
    private sortByColumnHeaderCell;
    markColumnAsSortedBy(columnId: string, sortOrder: Order): void;
    headerTableHeader(columnId: string): Element;
    private mouseDownInDataTable;
    setHeaderContextMenuCallback(callback: ((arg0: UI.ContextMenu.SubMenu) => void) | null): void;
    setRowContextMenuCallback(callback: ((arg0: UI.ContextMenu.ContextMenu, arg1: DataGridNode<T>) => void) | null): void;
    private contextMenu;
    private clickInDataTable;
    setResizeMethod(method: ResizeMethod): void;
    private startResizerDragging;
    private endResizerDragging;
    private resizerDragging;
    private setPreferredWidth;
    columnOffset(columnId: string): number;
    asWidget(element?: HTMLElement): DataGridWidget<T>;
    topFillerRowElement(): HTMLElement;
    protected headerHeightInScroller(): number;
    headerHeight(): number;
    revealNode(element: HTMLElement): void;
}
/** Keep in sync with .data-grid col.corner style rule. **/
export declare const CornerWidth = 14;
export declare const enum Events {
    SELECTED_NODE = "SelectedNode",
    DESELECTED_NODE = "DeselectedNode",
    OPENED_NODE = "OpenedNode",
    SORTING_CHANGED = "SortingChanged",
    PADDING_CHANGED = "PaddingChanged"
}
export interface EventTypes<T> {
    [Events.SELECTED_NODE]: DataGridNode<T>;
    [Events.DESELECTED_NODE]: void;
    [Events.OPENED_NODE]: DataGridNode<T>;
    [Events.SORTING_CHANGED]: void;
    [Events.PADDING_CHANGED]: void;
}
export declare enum Order {
    Ascending = "sort-ascending",
    Descending = "sort-descending"
}
export declare const enum Align {
    CENTER = "center",
    RIGHT = "right"
}
export declare const enum DataType {
    STRING = "String",
    BOOLEAN = "Boolean"
}
export declare const ColumnResizePadding = 30;
export declare const CenterResizerOverBorderAdjustment = 3;
export declare const enum ResizeMethod {
    NEAREST = "nearest",
    FIRST = "first",
    LAST = "last"
}
export type DataGridData = Record<string, any>;
export declare class DataGridNode<T> {
    #private;
    elementInternal: HTMLElement | null;
    expandedInternal: boolean;
    private dirty;
    private inactive;
    private highlighted;
    revealedInternal: boolean | undefined;
    protected attachedInternal: boolean;
    private savedPosition;
    children: Array<DataGridNode<T>>;
    dataGrid: DataGridImpl<T> | null;
    parent: DataGridNode<T> | null;
    previousSibling: DataGridNode<T> | null;
    nextSibling: DataGridNode<T> | null;
    selectable: boolean;
    isRoot: boolean;
    nodeAccessibleText: string;
    cellAccessibleTextMap: Map<string, string>;
    isCreationNode: boolean;
    constructor(data?: DataGridData | null, hasChildren?: boolean);
    element(): Element;
    protected createElement(): HTMLElement;
    existingElement(): HTMLElement | null;
    protected resetElement(): void;
    protected createCells(element: Element): void;
    get data(): DataGridData;
    set data(x: DataGridData);
    get revealed(): boolean;
    set revealed(x: boolean);
    isDirty(): boolean;
    setDirty(dirty: boolean): void;
    setInactive(inactive: boolean): void;
    setHighlighted(highlighted: boolean): void;
    hasChildren(): boolean;
    setHasChildren(x: boolean): void;
    get depth(): number;
    get leftPadding(): number;
    get shouldRefreshChildren(): boolean;
    set shouldRefreshChildren(x: boolean);
    get selected(): boolean;
    set selected(x: boolean);
    get expanded(): boolean;
    set expanded(x: boolean);
    refresh(): void;
    createTDWithClass(className: string): HTMLElement;
    createTD(columnId: string): HTMLElement;
    createCell(columnId: string): HTMLElement;
    setCellAccessibleName(name: string, cell: Element, columnId: string): void;
    nodeSelfHeight(): number;
    appendChild(child: DataGridNode<T>): void;
    resetNode(onlyCaches?: boolean): void;
    insertChild(child: DataGridNode<T>, index: number): void;
    remove(): void;
    removeChild(child: DataGridNode<T>): void;
    removeChildren(): void;
    recalculateSiblings(myIndex: number): void;
    collapse(): void;
    collapseRecursively(): void;
    populate(): void;
    expand(): void;
    expandRecursively(): void;
    reveal(): void;
    select(supressSelectedEvent?: boolean): void;
    revealAndSelect(): void;
    deselect(supressDeselectedEvent?: boolean): void;
    traverseNextNode(skipHidden: boolean, stayWithin?: DataGridNode<T> | null, dontPopulate?: boolean, info?: {
        depthChange: number;
    }): DataGridNode<T> | null;
    traversePreviousNode(skipHidden: boolean, dontPopulate?: boolean): DataGridNode<T> | null;
    isEventWithinDisclosureTriangle(event: MouseEvent): boolean;
    private attach;
    private detach;
    savePosition(): void;
    restorePosition(): void;
}
export declare class CreationDataGridNode<T> extends DataGridNode<T> {
    isCreationNode: boolean;
    constructor(data?: Record<string, any> | null, hasChildren?: boolean);
}
export declare class DataGridWidget<T> extends UI.Widget.VBox {
    readonly dataGrid: DataGridImpl<T>;
    constructor(dataGrid: DataGridImpl<T>, element?: HTMLElement);
    wasShown(): void;
    willHide(): void;
    onResize(): void;
    elementsToRestoreScrollPositionsFor(): Element[];
}
export interface Parameters {
    displayName: string;
    columns: ColumnDescriptor[];
    deleteCallback?: ((arg0: any) => void);
    refreshCallback?: (() => void);
}
export interface ColumnDescriptor {
    id: Lowercase<string>;
    title?: Common.UIString.LocalizedString;
    titleDOMFragment?: DocumentFragment | null;
    sortable: boolean;
    sort?: Order | null;
    align?: Align | null;
    width?: string;
    fixedWidth?: boolean;
    editable?: boolean;
    nonSelectable?: boolean;
    longText?: boolean;
    disclosure?: boolean;
    weight?: number;
    allowInSortByEvenWhenHidden?: boolean;
    dataType?: DataType | null;
    defaultWeight?: number;
}
