import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    dataURL: string | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestHTMLView extends UI.Widget.VBox {
    #private;
    private constructor();
    static create(contentData: TextUtils.ContentData.ContentData): RequestHTMLView | null;
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
