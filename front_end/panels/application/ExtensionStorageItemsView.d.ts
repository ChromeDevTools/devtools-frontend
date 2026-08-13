import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ExtensionStorage } from './ExtensionStorageModel.js';
import { KeyValueStorageItemsView, type View as KeyValueStorageItemsViewFunction } from './KeyValueStorageItemsView.js';
export declare namespace ExtensionStorageItemsDispatcher {
    const enum Events {
        ITEM_EDITED = "ItemEdited",
        ITEMS_REFRESHED = "ItemsRefreshed"
    }
    interface EventTypes {
        [Events.ITEM_EDITED]: void;
        [Events.ITEMS_REFRESHED]: void;
    }
}
export declare class ExtensionStorageItemsView extends KeyValueStorageItemsView {
    #private;
    readonly extensionStorageItemsDispatcher: Common.ObjectWrapper.ObjectWrapper<ExtensionStorageItemsDispatcher.EventTypes>;
    constructor(extensionStorage: ExtensionStorage, view?: KeyValueStorageItemsViewFunction);
    /**
     * When parsing a value provided by the user, attempt to treat it as JSON,
     * falling back to a string otherwise.
     */
    parseValue(input: string): unknown;
    protected removeItem(key: string): void;
    protected setItem(key: string, value: string): void;
    protected createPreview(key: string, value: string): Promise<UI.Widget.Widget | null>;
    setStorage(extensionStorage: ExtensionStorage): void;
    deleteSelectedItem(): void;
    refreshItems(): void;
    deleteAllItems(): void;
}
