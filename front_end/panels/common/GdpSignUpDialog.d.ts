import '../../ui/components/switch/switch.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    onSignUpClick: () => void;
    onCancelClick: () => void;
    keepMeUpdated: boolean;
    onKeepMeUpdatedChange: (value: boolean) => void;
    isSigningUp: boolean;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class GdpSignUpDialog extends UI.Widget.VBox {
    #private;
    constructor(options: {
        dialog: UI.Dialog.Dialog;
        onSuccess?: () => void;
        onCancel?: () => void;
    }, view?: View);
    performUpdate(): void;
    static show({ onSuccess, onCancel }?: {
        onSuccess?: () => void;
        onCancel?: () => void;
    }): void;
}
export {};
