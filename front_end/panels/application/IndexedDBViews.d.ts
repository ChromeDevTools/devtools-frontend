import '../../ui/components/report_view/report_view.js';
import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { Database, DatabaseId, Entry, Index, IndexedDBModel, ObjectStore, ObjectStoreMetadata } from './IndexedDBModel.js';
export interface IndexedDBDatabaseViewInput {
    database: Database | null;
    storageKey: SDK.StorageKeyManager.StorageKey | null;
    storageBucket: Protocol.Storage.StorageBucketInfo | null;
    onDeleteDatabase: () => void;
    onRefreshDatabase: () => void;
}
export type IDBDatabaseViewView = (input: IndexedDBDatabaseViewInput, output: undefined, target: HTMLElement) => void;
export declare const IDB_DATABASE_VIEW_DEFAULT_VIEW: IDBDatabaseViewView;
export declare class IDBDatabaseView extends UI.Widget.VBox {
    #private;
    constructor(model: IndexedDBModel, database: Database | null, element?: HTMLElement, view?: IDBDatabaseViewView);
    wasShown(): void;
    get shadowRoot(): ShadowRoot | null;
    performUpdate(): void;
    update(database: Database): void;
}
export interface IndexedDBDataViewInput {
    isIndex: boolean;
    index: Index | null;
    objectStore: ObjectStore;
    entries: Entry[];
    skipCount: number;
    selectedRowNumber: number;
    clearButtonEnabled: boolean;
    hasMore: boolean;
    keyFilter: string;
    needsRefreshVisible: boolean;
    metadata: ObjectStoreMetadata | null;
    refreshButtonClicked: () => void;
    clearButtonClicked: () => Promise<void>;
    deleteButtonClicked: () => Promise<void>;
    pageBackButtonClicked: () => void;
    pageForwardButtonClicked: () => void;
    onKeyFilterChange: (value: string) => void;
    onRowSelected: (rowNumber: number) => void;
    deleteEntry: (entry: Entry) => Promise<void>;
}
export type IDBDataViewView = (input: IndexedDBDataViewInput, output: undefined, target: HTMLElement) => void;
export declare const IDB_DATA_VIEW_DEFAULT_VIEW: IDBDataViewView;
export declare class IDBDataView extends UI.View.SimpleView {
    #private;
    private readonly model;
    private readonly databaseId;
    private isIndex;
    private readonly refreshObjectStoreCallback;
    private clearingObjectStore;
    private pageSize;
    private skipCount;
    protected entries: Entry[];
    private objectStore;
    private index;
    private lastPageSize;
    private lastSkipCount;
    private lastKey?;
    constructor(model: IndexedDBModel, databaseId: DatabaseId, objectStore: ObjectStore, index: Index | null, refreshObjectStoreCallback: () => void, view?: IDBDataViewView);
    private pageBackButtonClicked;
    private pageForwardButtonClicked;
    refreshData(): void;
    update(objectStore?: ObjectStore | null, index?: Index | null): void;
    private parseKey;
    private updateData;
    private updatedDataForTests;
    private refreshButtonClicked;
    private clearButtonClicked;
    markNeedsRefresh(): void;
    private resolveArrayKey;
    private deleteButtonClicked;
    private deleteEntry;
    clear(): void;
    private onRowSelected;
    performUpdate(): void;
}
interface ObjectPropertiesSectionWidgetInput {
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree | null;
}
type ObjectPropertiesSectionWidgetView = (input: ObjectPropertiesSectionWidgetInput, output: void, target: HTMLElement) => void;
export declare class ObjectPropertiesSectionWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: ObjectPropertiesSectionWidgetView);
    set value(value: SDK.RemoteObject.RemoteObject | null);
    get objectTree(): ObjectUI.ObjectPropertiesSection.ObjectTree | null;
    get expanded(): boolean;
    set expanded(expanded: boolean);
    expandRecursively(): Promise<void>;
    performUpdate(): void;
}
export {};
