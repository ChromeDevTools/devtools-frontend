import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ApplicationComponents from './components/components.js';
interface ViewInput {
    onRefresh: () => void;
    onDeleteAll: () => void;
    onDeleteSelected: () => void;
    metadataView: ApplicationComponents.StorageMetadataView.StorageMetadataView;
    onFilterChanged: (ev: CustomEvent<string | null>) => void;
    deleteAllButtonEnabled: boolean;
    deleteSelectedButtonDisabled: boolean;
    filterItemEnabled: boolean;
    deleteAllButtonIconName: string;
    deleteAllButtonTitle: string;
    mainToolbarItems: UI.Toolbar.ToolbarItem[];
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: object, target: HTMLElement) => void;
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
declare const StorageItemsToolbar_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<StorageItemsToolbar.EventTypes>;
    addEventListener<T extends keyof StorageItemsToolbar.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<StorageItemsToolbar.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<StorageItemsToolbar.EventTypes, T>;
    once<T extends keyof StorageItemsToolbar.EventTypes>(eventType: T): Promise<StorageItemsToolbar.EventTypes[T]>;
    removeEventListener<T extends keyof StorageItemsToolbar.EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<StorageItemsToolbar.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof StorageItemsToolbar.EventTypes): boolean;
    dispatchEventToListeners<T extends keyof StorageItemsToolbar.EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<StorageItemsToolbar.EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class StorageItemsToolbar extends StorageItemsToolbar_base {
    #private;
    filterRegex: RegExp | null;
    constructor(element?: HTMLElement, view?: View);
    set metadataView(view: ApplicationComponents.StorageMetadataView.StorageMetadataView);
    get metadataView(): ApplicationComponents.StorageMetadataView.StorageMetadataView;
    performUpdate(): void;
    setDeleteAllTitle(title: string): void;
    setDeleteAllGlyph(glyph: string): void;
    appendToolbarItem(item: UI.Toolbar.ToolbarItem): void;
    setStorageKey(storageKey: string): void;
    filterChanged({ detail: text }: CustomEvent<string | null>): void;
    hasFilter(): boolean;
    setCanDeleteAll(enabled: boolean): void;
    setCanDeleteSelected(enabled: boolean): void;
    setCanFilter(enabled: boolean): void;
}
export declare namespace StorageItemsToolbar {
    const enum Events {
        REFRESH = "Refresh",
        FILTER_CHANGED = "FilterChanged",
        DELETE_ALL = "DeleteAll",
        DELETE_SELECTED = "DeleteSelected"
    }
    interface EventTypes {
        [Events.REFRESH]: void;
        [Events.FILTER_CHANGED]: void;
        [Events.DELETE_ALL]: void;
        [Events.DELETE_SELECTED]: void;
    }
}
export {};
