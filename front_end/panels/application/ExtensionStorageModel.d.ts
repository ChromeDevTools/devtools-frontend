import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
export declare class ExtensionStorage extends Common.ObjectWrapper.ObjectWrapper<Record<string, never>> {
    #private;
    constructor(model: ExtensionStorageModel, extensionId: string, name: string, storageArea: Protocol.Extensions.StorageArea);
    get model(): ExtensionStorageModel;
    get extensionId(): string;
    get name(): string;
    get key(): string;
    get storageArea(): Protocol.Extensions.StorageArea;
    getItems(keys?: string[]): Promise<Record<string, unknown>>;
    setItem(key: string, value: unknown): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    matchesTarget(target: SDK.Target.Target | undefined): boolean;
}
export declare class ExtensionStorageModel extends SDK.SDKModel.SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.ExtensionsApi;
    constructor(target: SDK.Target.Target);
    enable(): void;
    storageForIdAndArea(id: string, storageArea: Protocol.Extensions.StorageArea): ExtensionStorage | undefined;
    storages(): ExtensionStorage[];
}
export declare const enum Events {
    EXTENSION_STORAGE_ADDED = "ExtensionStorageAdded",
    EXTENSION_STORAGE_REMOVED = "ExtensionStorageRemoved"
}
export interface EventTypes {
    [Events.EXTENSION_STORAGE_ADDED]: ExtensionStorage;
    [Events.EXTENSION_STORAGE_REMOVED]: ExtensionStorage;
}
