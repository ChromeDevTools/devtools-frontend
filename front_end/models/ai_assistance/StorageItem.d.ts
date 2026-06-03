export declare class StorageItem {
    /**
     * The origin of the top-level primary page target being inspected.
     * Used to restrict AI agent tools from accessing unauthorized pages.
     */
    readonly primaryTargetOrigin: string;
    /**
     * The origin of the selected storage or cookie item (if any).
     * If no item is selected, this is the same as primaryTargetOrigin.
     */
    readonly origin: string;
    constructor(
    /**
     * The origin of the top-level primary page target being inspected.
     * Used to restrict AI agent tools from accessing unauthorized pages.
     */
    primaryTargetOrigin: string, 
    /**
     * The origin of the selected storage or cookie item (if any).
     * If no item is selected, this is the same as primaryTargetOrigin.
     */
    origin: string);
}
export declare class DOMStorageItem extends StorageItem {
    /** The storage key partition identifier used by the browser storage engine. */
    readonly storageKey: string;
    /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
    readonly type: string;
    /** The optional specific key of the selected item in this storage partition. */
    readonly key?: string | undefined;
    constructor(primaryTargetOrigin: string, origin: string, 
    /** The storage key partition identifier used by the browser storage engine. */
    storageKey: string, 
    /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
    type: string, 
    /** The optional specific key of the selected item in this storage partition. */
    key?: string | undefined);
}
