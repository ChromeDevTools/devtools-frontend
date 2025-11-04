import * as UI from '../../ui/legacy/legacy.js';
import { DOMStorage } from './DOMStorageModel.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
export declare class DOMStorageItemsView extends KeyValueStorageItemsView {
    #private;
    private domStorage;
    private eventListeners;
    constructor(domStorage: DOMStorage);
    protected createPreview(key: string, value: string): Promise<UI.Widget.Widget | null>;
    setStorage(domStorage: DOMStorage): void;
    private domStorageItemsCleared;
    itemsCleared(): void;
    private domStorageItemRemoved;
    itemRemoved(key: string): void;
    private domStorageItemAdded;
    private domStorageItemUpdated;
    refreshItems(): void;
    deleteAllItems(): void;
    protected removeItem(key: string): void;
    protected setItem(key: string, value: string): void;
}
