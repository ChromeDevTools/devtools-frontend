import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    private readonly nodeShortcut;
    constructor(nodeShortcut: SDK.DOMModel.DOMNodeShortcut);
    addRevealAdorner(): void;
    get hovered(): boolean;
    set hovered(x: boolean);
    deferredNode(): SDK.DOMModel.DeferredDOMNode;
    domModel(): SDK.DOMModel.DOMModel;
    private setLeftIndentOverlay;
    onattach(): void;
    onselect(selectedByUser?: boolean): boolean;
}
