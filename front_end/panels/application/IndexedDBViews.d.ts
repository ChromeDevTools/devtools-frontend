import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/legacy.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as ApplicationComponents from './components/components.js';
import type { Database, DatabaseId, Entry, Index, IndexedDBModel, ObjectStore } from './IndexedDBModel.js';
export declare class IDBDatabaseView extends ApplicationComponents.StorageMetadataView.StorageMetadataView {
    private readonly model;
    private database;
    constructor(model: IndexedDBModel, database: Database | null);
    getTitle(): string | undefined;
    renderReportContent(): Promise<Lit.LitTemplate>;
    private refreshDatabaseButtonClicked;
    update(database: Database): void;
    private updatedForTests;
    private deleteDatabase;
    wasShown(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-idb-database-view': IDBDatabaseView;
    }
}
export declare class IDBDataView extends UI.View.SimpleView {
    private readonly model;
    private readonly databaseId;
    private isIndex;
    private readonly refreshObjectStoreCallback;
    private readonly refreshButton;
    private readonly deleteSelectedButton;
    private readonly clearButton;
    private readonly needsRefresh;
    private clearingObjectStore;
    private pageSize;
    private skipCount;
    protected entries: Entry[];
    private objectStore;
    private index;
    private keyInput;
    private dataGrid;
    private lastPageSize;
    private lastSkipCount;
    private pageBackButton;
    private pageForwardButton;
    private lastKey?;
    private summaryBarElement?;
    constructor(model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore, index: Index | null, refreshObjectStoreCallback: () => void);
    private createDataGrid;
    private keyColumnHeaderFragment;
    private keyPathStringFragment;
    private createEditorToolbar;
    private pageBackButtonClicked;
    private pageForwardButtonClicked;
    private populateContextMenu;
    refreshData(): void;
    update(objectStore?: ObjectStore | null, index?: Index | null): void;
    private parseKey;
    private updateData;
    private updateSummaryBar;
    private updatedDataForTests;
    private refreshButtonClicked;
    private clearButtonClicked;
    markNeedsRefresh(): void;
    private resolveArrayKey;
    private deleteButtonClicked;
    clear(): void;
    private updateToolbarEnablement;
}
export declare class IDBDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
    selectable: boolean;
    valueObjectPresentation: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection | null;
    constructor(data: Record<string, any>);
    createCell(columnIdentifier: string): HTMLElement;
}
