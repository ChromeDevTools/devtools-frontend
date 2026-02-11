import type * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as UI from '../../ui/legacy/legacy.js';
interface PlatformFontsWidgetInput {
    platformFonts: Protocol.CSS.PlatformFontUsage[] | null;
}
type View = (input: PlatformFontsWidgetInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PlatformFontsWidget extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get sharedModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel | null;
    set sharedModel(model: ComputedStyle.ComputedStyleModel.ComputedStyleModel);
    performUpdate(): Promise<void>;
}
export {};
