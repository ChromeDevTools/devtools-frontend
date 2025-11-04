import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
export declare class SharedStorageForOrigin extends Common.ObjectWrapper.ObjectWrapper<SharedStorageForOrigin.EventTypes> {
    #private;
    constructor(model: SharedStorageModel, securityOrigin: string);
    get securityOrigin(): string;
    getMetadata(): Promise<Protocol.Storage.SharedStorageMetadata | null>;
    getEntries(): Promise<Protocol.Storage.SharedStorageEntry[] | null>;
    setEntry(key: string, value: string, ignoreIfPresent: boolean): Promise<void>;
    deleteEntry(key: string): Promise<void>;
    clear(): Promise<void>;
    resetBudget(): Promise<void>;
}
export declare namespace SharedStorageForOrigin {
    const enum Events {
        SHARED_STORAGE_CHANGED = "SharedStorageChanged"
    }
    interface SharedStorageChangedEvent {
        accessTime: Protocol.Network.TimeSinceEpoch;
        scope: Protocol.Storage.SharedStorageAccessScope;
        method: Protocol.Storage.SharedStorageAccessMethod;
        mainFrameId: Protocol.Page.FrameId;
        ownerSite: string;
        params: Protocol.Storage.SharedStorageAccessParams;
    }
    interface EventTypes {
        [Events.SHARED_STORAGE_CHANGED]: SharedStorageChangedEvent;
    }
}
export declare class SharedStorageModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
    #private;
    readonly storageAgent: ProtocolProxyApi.StorageApi;
    constructor(target: SDK.Target.Target);
    enable(): Promise<void>;
    disable(): void;
    dispose(): void;
    storages(): IterableIterator<SharedStorageForOrigin>;
    storageForOrigin(origin: string): SharedStorageForOrigin | null;
    numStoragesForTesting(): number;
    isChangeEvent(event: Protocol.Storage.SharedStorageAccessedEvent): boolean;
    sharedStorageAccessed(event: Protocol.Storage.SharedStorageAccessedEvent): void;
    sharedStorageWorkletOperationExecutionFinished(_event: Protocol.Storage.SharedStorageWorkletOperationExecutionFinishedEvent): void;
    attributionReportingTriggerRegistered(_event: Protocol.Storage.AttributionReportingTriggerRegisteredEvent): void;
    indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void;
    indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void;
    cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void;
    cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void;
    interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void;
    interestGroupAuctionEventOccurred(_event: Protocol.Storage.InterestGroupAuctionEventOccurredEvent): void;
    interestGroupAuctionNetworkRequestCreated(_event: Protocol.Storage.InterestGroupAuctionNetworkRequestCreatedEvent): void;
    storageBucketCreatedOrUpdated(_event: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void;
    storageBucketDeleted(_event: Protocol.Storage.StorageBucketDeletedEvent): void;
    attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void;
    attributionReportingReportSent(_event: Protocol.Storage.AttributionReportingReportSentEvent): void;
    attributionReportingVerboseDebugReportSent(_event: Protocol.Storage.AttributionReportingVerboseDebugReportSentEvent): void;
}
export declare const enum Events {
    SHARED_STORAGE_ACCESS = "SharedStorageAccess",
    SHARED_STORAGE_ADDED = "SharedStorageAdded",
    SHARED_STORAGE_REMOVED = "SharedStorageRemoved"
}
export interface EventTypes {
    [Events.SHARED_STORAGE_ACCESS]: Protocol.Storage.SharedStorageAccessedEvent;
    [Events.SHARED_STORAGE_ADDED]: SharedStorageForOrigin;
    [Events.SHARED_STORAGE_REMOVED]: SharedStorageForOrigin;
}
