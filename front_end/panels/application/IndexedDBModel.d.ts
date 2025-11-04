import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
export declare class IndexedDBModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
    private readonly storageBucketModel;
    private readonly indexedDBAgent;
    private readonly storageAgent;
    private readonly databasesInternal;
    private databaseNamesByStorageKeyAndBucket;
    private readonly updatedStorageBuckets;
    private readonly throttler;
    private enabled?;
    constructor(target: SDK.Target.Target);
    static keyFromIDBKey(idbKey: any): Protocol.IndexedDB.Key | undefined;
    private static keyRangeFromIDBKeyRange;
    static idbKeyPathFromKeyPath(keyPath: Protocol.IndexedDB.KeyPath): string | string[] | null | undefined;
    static keyPathStringFromIDBKeyPath(idbKeyPath: string | string[] | null | undefined): string | null;
    enable(): void;
    clearForStorageKey(storageKey: string): void;
    deleteDatabase(databaseId: DatabaseId): Promise<void>;
    refreshDatabaseNames(): Promise<void>;
    refreshDatabase(databaseId: DatabaseId): void;
    clearObjectStore(databaseId: DatabaseId, objectStoreName: string): Promise<void>;
    deleteEntries(databaseId: DatabaseId, objectStoreName: string, idbKeyRange: IDBKeyRange): Promise<void>;
    private storageBucketAdded;
    private storageBucketRemoved;
    private addStorageBucket;
    private removeStorageBucket;
    private updateStorageKeyDatabaseNames;
    databases(): DatabaseId[];
    private databaseAddedForStorageBucket;
    private databaseRemovedForStorageBucket;
    private loadDatabaseNamesByStorageBucket;
    private loadDatabase;
    loadObjectStoreData(databaseId: DatabaseId, objectStoreName: string, idbKeyRange: IDBKeyRange | null, skipCount: number, pageSize: number, callback: (arg0: Entry[], arg1: boolean) => void): void;
    loadIndexData(databaseId: DatabaseId, objectStoreName: string, indexName: string, idbKeyRange: IDBKeyRange | null, skipCount: number, pageSize: number, callback: (arg0: Entry[], arg1: boolean) => void): void;
    private requestData;
    getMetadata(databaseId: DatabaseId, objectStore: ObjectStore): Promise<ObjectStoreMetadata | null>;
    private refreshDatabaseListForStorageBucket;
    indexedDBListUpdated({ storageKey, bucketId }: Protocol.Storage.IndexedDBListUpdatedEvent): void;
    indexedDBContentUpdated({ bucketId, databaseName, objectStoreName }: Protocol.Storage.IndexedDBContentUpdatedEvent): void;
    attributionReportingTriggerRegistered(_event: Protocol.Storage.AttributionReportingTriggerRegisteredEvent): void;
    cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void;
    cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void;
    interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void;
    interestGroupAuctionEventOccurred(_event: Protocol.Storage.InterestGroupAuctionEventOccurredEvent): void;
    interestGroupAuctionNetworkRequestCreated(_event: Protocol.Storage.InterestGroupAuctionNetworkRequestCreatedEvent): void;
    sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void;
    sharedStorageWorkletOperationExecutionFinished(_event: Protocol.Storage.SharedStorageWorkletOperationExecutionFinishedEvent): void;
    storageBucketCreatedOrUpdated(_event: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void;
    storageBucketDeleted(_event: Protocol.Storage.StorageBucketDeletedEvent): void;
    attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void;
    attributionReportingReportSent(_event: Protocol.Storage.AttributionReportingReportSentEvent): void;
    attributionReportingVerboseDebugReportSent(_event: Protocol.Storage.AttributionReportingVerboseDebugReportSentEvent): void;
}
export declare enum Events {
    DatabaseAdded = "DatabaseAdded",
    DatabaseRemoved = "DatabaseRemoved",
    DatabaseLoaded = "DatabaseLoaded",
    DatabaseNamesRefreshed = "DatabaseNamesRefreshed",
    IndexedDBContentUpdated = "IndexedDBContentUpdated"
}
export interface EventTypes {
    [Events.DatabaseAdded]: {
        model: IndexedDBModel;
        databaseId: DatabaseId;
    };
    [Events.DatabaseRemoved]: {
        model: IndexedDBModel;
        databaseId: DatabaseId;
    };
    [Events.DatabaseLoaded]: {
        model: IndexedDBModel;
        database: Database;
        entriesUpdated: boolean;
    };
    [Events.DatabaseNamesRefreshed]: void;
    [Events.IndexedDBContentUpdated]: {
        model: IndexedDBModel;
        databaseId: DatabaseId;
        objectStoreName: string;
    };
}
export declare class Entry {
    key: SDK.RemoteObject.RemoteObject;
    primaryKey: SDK.RemoteObject.RemoteObject;
    value: SDK.RemoteObject.RemoteObject;
    constructor(key: SDK.RemoteObject.RemoteObject, primaryKey: SDK.RemoteObject.RemoteObject, value: SDK.RemoteObject.RemoteObject);
}
export declare class DatabaseId {
    readonly storageBucket: Protocol.Storage.StorageBucket;
    name: string;
    constructor(storageBucket: Protocol.Storage.StorageBucket, name: string);
    inBucket(storageBucket: Protocol.Storage.StorageBucket): boolean;
    equals(databaseId: DatabaseId): boolean;
    inSet(databaseSet: Set<DatabaseId>): boolean;
}
export declare class Database {
    databaseId: DatabaseId;
    version: number;
    objectStores: Map<string, ObjectStore>;
    constructor(databaseId: DatabaseId, version: number);
}
export declare class ObjectStore {
    name: string;
    keyPath: any;
    autoIncrement: boolean;
    indexes: Map<string, Index>;
    constructor(name: string, keyPath: any, autoIncrement: boolean);
    get keyPathString(): string;
}
export declare class Index {
    name: string;
    keyPath: any;
    unique: boolean;
    multiEntry: boolean;
    constructor(name: string, keyPath: any, unique: boolean, multiEntry: boolean);
    get keyPathString(): string;
}
export interface ObjectStoreMetadata {
    entriesCount: number;
    keyGeneratorValue: number;
}
