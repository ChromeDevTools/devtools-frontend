import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type ComputedStyleModel } from './ComputedStyleModel.js';
interface PlatformFontsWidgetInput {
    platformFonts: Protocol.CSS.PlatformFontUsage[] | null;
}
type View = (input: PlatformFontsWidgetInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PlatformFontsWidget extends UI.Widget.VBox {
    #private;
    private readonly sharedModel;
    constructor(sharedModel: ComputedStyleModel, view?: View);
    performUpdate(): Promise<void>;
}
export {};
