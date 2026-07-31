import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import type { BinaryResourceView } from './BinaryResourceView.js';
export interface GridRow {
    chunk: unknown;
    item: DataGridItem;
    selected: boolean;
    cssClass?: string;
    index: number;
    timeTooltip: string;
    timeText: string;
}
export interface ViewInput {
    onClear: () => void;
    selectedFilterType: string;
    onFilterTypeChange: (event: Event) => void;
    filterUsingRegexHint: Common.UIString.LocalizedString;
    filterText: string;
    onFilterTextChange: (event: Event) => void;
    splitWidgetSettingKey: string;
    dataGridDisplayName: Common.UIString.LocalizedString;
    columns: DataGrid.DataGrid.ColumnDescriptor[];
    headerTemplate: Lit.TemplateResult;
    rows: GridRow[];
    onSelect: (event: CustomEvent<HTMLElement>) => void;
    onDeselect: () => void;
    onContextMenu: (item: DataGridItem, menu: UI.ContextMenu.ContextMenu) => void;
    sidebarWidget: UI.Widget.Widget | null;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare function defaultHeaderTemplate(): Lit.TemplateResult;
export declare const DEFAULT_VIEW: View;
export declare abstract class ResourceChunkView<Chunk> extends UI.Widget.VBox {
    #private;
    protected filterType: string | null;
    private filterText;
    protected filterRegex: RegExp | null;
    private selectedChunk;
    private currentSelectedNode?;
    readonly request: SDK.NetworkRequest.NetworkRequest;
    private readonly messageFilterSetting;
    private sidebarWidget;
    private readonly splitWidgetSettingKey;
    private readonly dataGridDisplayName;
    private readonly filterUsingRegexHint;
    protected get headerTemplate(): Lit.TemplateResult;
    abstract getRequestChunks(): Chunk[];
    abstract createGridItem(chunk: Chunk): DataGridItem;
    abstract chunkFilter(chunk: Chunk): boolean;
    constructor(request: SDK.NetworkRequest.NetworkRequest, messageFilterSettingKey: string, splitWidgetSettingKey: string, dataGridDisplayName: Common.UIString.LocalizedString, filterUsingRegexHint: Common.UIString.LocalizedString, opts?: UI.Widget.WidgetOptions, view?: View);
    private onRowContextMenu;
    getColumns(): DataGrid.DataGrid.ColumnDescriptor[];
    chunkAdded(chunk: Chunk): void;
    private clearChunks;
    private onFilterTypeChanged;
    private onFilterTextChanged;
    private applyFilter;
    private onChunkSelected;
    private onChunkDeselected;
    updateSidebar(): Promise<void>;
    performUpdate(): void;
    getSplitWidgetForTest(): UI.Widget.Widget | null;
}
export declare abstract class DataGridItem {
    abstract data: Record<string, string | HTMLElement>;
    abstract cssClass?: string;
    abstract binaryView(): BinaryResourceView | null;
    abstract getTime(): number;
    abstract dataText(): string;
    abstract readonly isTextFrame: boolean;
}
