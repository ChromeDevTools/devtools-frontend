import * as UI from '../../ui/legacy/legacy.js';
export type ViewInput = Record<string, never>;
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PrivateVerificationTokensView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    performUpdate(): void;
}
export {};
