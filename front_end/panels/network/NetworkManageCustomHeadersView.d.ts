import '../../ui/components/lists/lists.js';
import '../../ui/legacy/legacy.js';
import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface CustomHeaderItem {
    header: string;
    editable: boolean;
    isNew?: boolean;
}
export interface ViewInput {
    items: CustomHeaderItem[];
    editingHeader: string | null;
    onAddClick: () => void;
    onBeginEdit: (header: string) => void;
    onRemove: (header: string) => void;
    onCommitEdit: (newHeader: string) => void;
    onCancelEdit: () => void;
    validateHeader: (itemHeader: string, newHeader: string) => Common.UIString.LocalizedString | null;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NetworkManageCustomHeadersView extends UI.Widget.VBox {
    #private;
    constructor(columnData: Array<{
        title: string;
        editable: boolean;
    }>, addHeaderColumnCallback: (arg0: string) => boolean, changeHeaderColumnCallback: (arg0: string, arg1: string) => boolean, removeHeaderColumnCallback: (arg0: string) => boolean, view?: View);
    performUpdate(): void;
    wasShown(): void;
}
