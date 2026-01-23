import '../../ui/components/switch/switch.js';
import '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    onGetStartedClick: () => void;
    onCancelClick: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class GeminiRebrandPromoDialog extends UI.Widget.VBox {
    #private;
    constructor(options: {
        dialog: UI.Dialog.Dialog;
        onSuccess?: () => void;
        onCancel?: () => void;
    }, view?: View);
    performUpdate(): void;
    static show(): void;
    static maybeShow(): Promise<void>;
}
export {};
