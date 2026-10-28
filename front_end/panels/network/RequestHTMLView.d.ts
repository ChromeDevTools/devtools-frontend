import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    dataURL: string | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestHTMLView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    static create(contentData: TextUtils.ContentData.ContentData): RequestHTMLView | null;
    get dataURL(): string;
    set dataURL(dataURL: string);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
