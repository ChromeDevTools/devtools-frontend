interface StorageItemOriginOnly {
    origin: string;
    storageKey?: string;
    storageType?: never;
    key?: never;
}
interface StorageItemWithKey {
    origin: string;
    storageKey?: string;
    storageType: 'cookie' | 'localStorage' | 'sessionStorage';
    key: string;
}
export type StorageItemData = StorageItemOriginOnly | StorageItemWithKey;
export declare class StorageItem {
    readonly origin: string;
    readonly storageKey?: string;
    readonly storageType?: 'cookie' | 'localStorage' | 'sessionStorage';
    readonly key?: string;
    constructor(data: StorageItemData);
}
export {};
