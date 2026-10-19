import type * as Platform from '../../../core/platform/platform.js';
interface ViewInput {
    header: Platform.UIString.LocalizedString;
    message: Platform.UIString.LocalizedString;
    inputPlaceholder: Platform.UIString.LocalizedString;
    inputJslogContext: string;
    allowDisabled: boolean;
    onInput: (value: string) => void;
    onClose: (event: Event) => void;
    onAllow: () => void;
    onCancel: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
export declare class TypeToAllowDialog {
    static show(options: {
        jslogContext: {
            dialog: string;
            input: string;
        };
        header: Platform.UIString.LocalizedString;
        message: Platform.UIString.LocalizedString;
        typePhrase: Platform.UIString.LocalizedString;
        inputPlaceholder: Platform.UIString.LocalizedString;
    }, view?: View): Promise<boolean>;
}
export {};
