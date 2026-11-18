import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    value: string;
    onInput: (value: string) => void;
}
export interface ViewOutput {
    focus?: () => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class EditableSpan extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    get value(): string;
    set value(value: string);
    performUpdate(): void;
    focus(): void;
}
