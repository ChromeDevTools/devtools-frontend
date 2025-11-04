import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import { KeyValueStorageItemsView, type View as ViewFunction } from './KeyValueStorageItemsView.js';
import { SharedStorageForOrigin } from './SharedStorageModel.js';
export declare namespace SharedStorageItemsDispatcher {
    const enum Events {
        FILTERED_ITEMS_CLEARED = "FilteredItemsCleared",
        ITEM_DELETED = "ItemDeleted",
        ITEM_EDITED = "ItemEdited",
        ITEMS_CLEARED = "ItemsCleared",
        ITEMS_REFRESHED = "ItemsRefreshed"
    }
    interface ItemDeletedEvent {
        key: string;
    }
    interface ItemEditedEvent {
        columnIdentifier: string;
        oldText: string | null;
        newText: string;
    }
    interface EventTypes {
        [Events.FILTERED_ITEMS_CLEARED]: void;
        [Events.ITEM_DELETED]: ItemDeletedEvent;
        [Events.ITEM_EDITED]: void;
        [Events.ITEMS_CLEARED]: void;
        [Events.ITEMS_REFRESHED]: void;
    }
}
export declare class SharedStorageItemsView extends KeyValueStorageItemsView {
    #private;
    readonly sharedStorageItemsDispatcher: Common.ObjectWrapper.ObjectWrapper<SharedStorageItemsDispatcher.EventTypes>;
    constructor(sharedStorage: SharedStorageForOrigin, view?: ViewFunction);
    static createView(sharedStorage: SharedStorageForOrigin, viewFunction?: ViewFunction): Promise<SharedStorageItemsView>;
    updateEntriesOnly(): Promise<void>;
    refreshItems(): Promise<void>;
    deleteAllItems(): Promise<void>;
    protected isEditAllowed(columnIdentifier: string, _oldText: string, newText: string): boolean;
    protected setItem(key: string, value: string): Promise<void>;
    protected removeItem(key: string): Promise<void>;
    protected createPreview(key: string, value: string): Promise<UI.Widget.Widget | null>;
}
