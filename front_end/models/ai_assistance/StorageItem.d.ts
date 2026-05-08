export type StorageItem = {
    origin: string;
} & ({
    storageType?: never;
    key?: never;
} | {
    storageType: 'cookie' | 'localStorage' | 'sessionStorage';
    key: string;
});
