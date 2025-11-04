import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { BinaryResourceView } from './BinaryResourceView.js';
export declare abstract class ResourceChunkView<Chunk> extends UI.Widget.VBox {
    private readonly splitWidget;
    private dataGrid;
    private readonly timeComparator;
    private readonly mainToolbar;
    private readonly clearAllButton;
    private readonly filterTypeCombobox;
    protected filterType: string | null;
    private readonly filterTextInput;
    protected filterRegex: RegExp | null;
    private readonly frameEmptyWidget;
    private currentSelectedNode?;
    readonly request: SDK.NetworkRequest.NetworkRequest;
    private readonly messageFilterSetting;
    abstract getRequestChunks(): Chunk[];
    abstract createGridItem(chunk: Chunk): DataGridItem;
    abstract chunkFilter(chunk: Chunk): boolean;
    constructor(request: SDK.NetworkRequest.NetworkRequest, messageFilterSettingKey: string, splitWidgetSettingKey: string, dataGridDisplayName: Common.UIString.LocalizedString, filterUsingRegexHint: Common.UIString.LocalizedString);
    getColumns(): DataGrid.DataGrid.ColumnDescriptor[];
    chunkAdded(chunk: Chunk): void;
    private clearChunks;
    private updateFilterSetting;
    private applyFilter;
    private onChunkSelected;
    private onChunkDeselected;
    refresh(): void;
    private sortItems;
    getDataGridForTest(): DataGrid.SortableDataGrid.SortableDataGrid<unknown>;
    getSplitWidgetForTest(): UI.SplitWidget.SplitWidget;
    getFilterInputForTest(): UI.Toolbar.ToolbarInput;
    getClearAllButtonForTest(): UI.Toolbar.ToolbarButton;
    getFilterTypeComboboxForTest(): UI.Toolbar.ToolbarComboBox;
}
export declare abstract class DataGridItem extends DataGrid.SortableDataGrid.SortableDataGridNode<unknown> {
    abstract binaryView(): BinaryResourceView | null;
    abstract getTime(): number;
    abstract dataText(): string;
}
