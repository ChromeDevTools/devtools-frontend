import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const CATEGORY_NAME_GENERAL = "general";
export declare const CATEGORY_NAME_OPTIONS = "options";
export declare const CATEGORY_NAME_OPEN_INFO = "open-info";
export interface ViewInput {
    socketInfo: SDK.NetworkRequest.DirectSocketInfo;
    openCategories: string[];
    onSummaryKeyDown: (event: KeyboardEvent, categoryName: string) => void;
    onToggleCategory: (event: Event, categoryName: string) => void;
    onCopyRow: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class DirectSocketConnectionView extends UI.Widget.Widget {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
