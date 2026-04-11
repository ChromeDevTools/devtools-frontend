import * as UI from '../../../ui/legacy/legacy.js';
interface ViewInput {
    onGotIt: () => void;
    onManageSettings: () => void;
    loggingEnabled: boolean;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class OptInChangeDialog extends UI.Widget.VBox {
    #private;
    constructor(options: {
        onGotIt: () => void;
        onManageSettings: () => void;
    }, view?: View);
    performUpdate(): void;
    focusTitle(): void;
    static show(options: {
        onGotIt: () => void;
        onManageSettings: () => void;
    }): void;
}
export {};
