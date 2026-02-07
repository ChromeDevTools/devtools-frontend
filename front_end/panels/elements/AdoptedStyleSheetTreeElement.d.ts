import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class AdoptedStyleSheetSetTreeElement extends UI.TreeOutline.TreeElement {
    readonly adoptedStyleSheets: SDK.DOMModel.AdoptedStyleSheet[];
    constructor(adoptedStyleSheets: SDK.DOMModel.AdoptedStyleSheet[]);
}
export declare class AdoptedStyleSheetTreeElement extends UI.TreeOutline.TreeElement {
    readonly adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet;
    private eventListener;
    constructor(adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet);
    onStyleSheetAdded({ data: header }: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>): void;
    static createContents(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, treeElement: UI.TreeOutline.TreeElement): void;
    highlight(): void;
}
export declare class AdoptedStyleSheetContentsTreeElement extends UI.TreeOutline.TreeElement {
    private readonly styleSheetHeader;
    private editing;
    constructor(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    onbind(): void;
    onunbind(): void;
    onpopulate(): Promise<void>;
    onStyleSheetChanged({ data: { styleSheetId } }: Common.EventTarget.EventTargetEvent<SDK.CSSModel.StyleSheetChangedEvent>): void;
    ondblclick(event: Event): boolean;
    onenter(): boolean;
    private startEditing;
    private editingCommitted;
    private editingCancelled;
    isEditing(): boolean;
}
