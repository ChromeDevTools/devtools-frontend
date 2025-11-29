import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class AdoptedStyleSheetTreeElement extends UI.TreeOutline.TreeElement {
    private readonly adoptedStyleSheet;
    private eventListener;
    constructor(adoptedStyleSheet: SDK.DOMModel.AdoptedStyleSheet);
    onStyleSheetAdded({ data: header }: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>): void;
    static createContents(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader, treeElement: UI.TreeOutline.TreeElement): void;
}
export declare class AdoptedStyleSheetContentsTreeElement extends UI.TreeOutline.TreeElement {
    private readonly styleSheetHeader;
    constructor(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    onbind(): void;
    onunbind(): void;
    onpopulate(): Promise<void>;
    onStyleSheetChanged({ data: { styleSheetId } }: Common.EventTarget.EventTargetEvent<SDK.CSSModel.StyleSheetChangedEvent>): void;
}
