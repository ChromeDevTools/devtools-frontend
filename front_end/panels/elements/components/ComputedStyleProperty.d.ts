import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    inherited: boolean;
    traceable: boolean;
    onNavigateToSource: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ComputedStyleProperty extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    set inherited(inherited: boolean);
    set traceable(traceable: boolean);
    set onNavigateToSource(onNavigateToSource: () => void);
    performUpdate(): void;
}
