import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    selector: string;
    active: boolean;
    onNavigateToSource: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class ComputedStyleTrace extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    set selector(selector: string);
    set active(active: boolean);
    set onNavigateToSource(onNavigateToSource: () => void);
    performUpdate(): void;
}
