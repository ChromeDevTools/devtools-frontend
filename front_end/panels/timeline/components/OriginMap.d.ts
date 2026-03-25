import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ListItem extends CrUXManager.OriginMapping {
    isTitleRow?: boolean;
}
export interface ViewInput {
    mappings: ListItem[];
    prefillDevelopmentOrigin: string;
    errorMessage: string;
    isCrUXEnabled: boolean;
    getFieldDataForPage: (url: string) => Promise<CrUXManager.PageResult>;
    onCommitEdit: (event: CustomEvent<{
        columnId: string;
        valueBeforeEditing: string;
        newText: string;
    }>) => void;
    onRemoveItemRequested: (event: CustomEvent) => void;
    onCreate: (event: CustomEvent<{
        developmentOrigin?: string;
        productionOrigin?: string;
    }>) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class OriginMap extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    startCreation(): void;
}
export {};
