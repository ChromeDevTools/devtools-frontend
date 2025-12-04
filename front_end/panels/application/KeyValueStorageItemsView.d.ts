import * as UI from '../../ui/legacy/legacy.js';
import type { WidgetOptions } from '../../ui/legacy/Widget.js';
import * as ApplicationComponents from './components/components.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
type Widget = UI.Widget.Widget;
export interface ViewInput {
    items: Array<{
        key: string;
        value: string;
    }>;
    selectedKey: string | null;
    editable: boolean;
    preview: Widget;
    onSelect: (item: {
        key: string;
        value: string;
    } | null) => void;
    onSort: (ascending: boolean) => void;
    onCreate: (key: string, value: string) => void;
    onReferesh: () => void;
    onEdit: (key: string, value: string, columnId: string, valueBeforeEditing: string, newText: string) => void;
    onDelete: (key: string) => void;
}
interface ViewOutput {
    toolbar: StorageItemsToolbar;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
/**
 * A helper typically used in the Application panel. Renders a split view
 * between a DataGrid displaying key-value pairs and a preview Widget.
 */
export declare abstract class KeyValueStorageItemsView extends UI.Widget.VBox {
    #private;
    readonly metadataView: ApplicationComponents.StorageMetadataView.StorageMetadataView;
    constructor(title: string, id: string, editable: boolean, view?: View, metadataView?: ApplicationComponents.StorageMetadataView.StorageMetadataView, opts?: WidgetOptions);
    wasShown(): void;
    performUpdate(): void;
    protected get toolbar(): StorageItemsToolbar | undefined;
    refreshItems(): void;
    deleteAllItems(): void;
    itemsCleared(): void;
    itemRemoved(key: string): void;
    itemAdded(key: string, value: string): void;
    itemUpdated(key: string, value: string): void;
    showItems(items: Array<{
        key: string;
        value: string;
    }>): void;
    deleteSelectedItem(): void;
    protected isEditAllowed(_columnIdentifier: string, _oldText: string, _newText: string): boolean;
    showPreview(preview: Widget | null, value: string | null): void;
    set editable(editable: boolean);
    protected keys(): string[];
    protected abstract setItem(key: string, value: string): void;
    protected abstract removeItem(key: string): void;
    protected abstract createPreview(key: string, value: string): Promise<Widget | null>;
}
export {};
