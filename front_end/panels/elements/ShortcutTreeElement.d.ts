import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    title: string;
    onRevealAdornerClick: (e: Event) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export declare class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    private readonly nodeShortcut;
    constructor(nodeShortcut: SDK.DOMModel.DOMNodeShortcut, view?: (input: ViewInput, _output: undefined, target: HTMLElement) => void);
    get hovered(): boolean;
    set hovered(x: boolean);
    deferredNode(): SDK.DOMModel.DeferredDOMNode;
    domModel(): SDK.DOMModel.DOMModel;
    private setLeftIndentOverlay;
    onattach(): void;
    onselect(selectedByUser?: boolean): boolean;
    private onRevealAdornerClick;
    private performUpdate;
}
export {};
