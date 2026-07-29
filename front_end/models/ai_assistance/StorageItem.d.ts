export declare const EMPTY_ORIGIN = "";
export declare class StorageItem {
    /**
     * The origin of the top-level primary page target being inspected.
     * Used to restrict AI agent tools from accessing unauthorized pages.
     */
    readonly primaryTargetOrigin: string;
    /**
     * The origin of the selected storage or cookie item.
     * If empty (''), this represents a generic category-level context (e.g., all Local Storage or all Cookies).
     */
    readonly origin: string;
    constructor(
    /**
     * The origin of the top-level primary page target being inspected.
     * Used to restrict AI agent tools from accessing unauthorized pages.
     */
    primaryTargetOrigin: string, 
    /**
     * The origin of the selected storage or cookie item.
     * If empty (''), this represents a generic category-level context (e.g., all Local Storage or all Cookies).
     */
    origin?: string);
    get isGenericContext(): boolean;
    static createGenericContext(primaryTargetOrigin: string, ..._args: unknown[]): StorageItem;
}
export declare class DOMStorageItem extends StorageItem {
    /** The storage key partition identifier used by the browser storage engine. */
    readonly storageKey: string | undefined;
    /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
    readonly type: 'localStorage' | 'sessionStorage';
    /** The optional specific key of the selected item in this storage partition. */
    readonly key?: string | undefined;
    constructor(primaryTargetOrigin: string, origin: string, 
    /** The storage key partition identifier used by the browser storage engine. */
    storageKey: string | undefined, 
    /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
    type: 'localStorage' | 'sessionStorage', 
    /** The optional specific key of the selected item in this storage partition. */
    key?: string | undefined);
    static createGenericContext(primaryTargetOrigin: string, type: 'localStorage' | 'sessionStorage'): DOMStorageItem;
}
export declare class CookieItem extends StorageItem {
    readonly name?: string | undefined;
    constructor(primaryTargetOrigin: string, origin: string, name?: string | undefined);
    static createGenericContext(primaryTargetOrigin: string): CookieItem;
}
