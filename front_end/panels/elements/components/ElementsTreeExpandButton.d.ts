import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    clickHandler: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class ElementsTreeExpandButton extends UI.Widget.Widget<ShadowRoot> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set clickHandler(clickHandler: () => void);
    wasShown(): void;
    performUpdate(): void;
}
