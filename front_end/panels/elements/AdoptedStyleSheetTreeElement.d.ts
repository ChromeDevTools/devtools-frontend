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
    readonly widget: AdoptedStyleSheetContentsWidget;
    private readonly widgetWrapper;
    constructor(styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    onbind(): void;
    onunbind(): void;
    onpopulate(): Promise<void>;
    ondblclick(event: Event): boolean;
    onenter(): boolean;
    isEditing(): boolean;
}
export interface AdoptedStyleSheetContentsViewInput {
    text: string;
    isEditing: boolean;
    onDblClick: (event: MouseEvent) => void;
}
export type AdoptedStyleSheetContentsView = (input: AdoptedStyleSheetContentsViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_ADOPTED_STYLESHEET_CONTENTS_VIEW: AdoptedStyleSheetContentsView;
export declare class AdoptedStyleSheetContentsWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: AdoptedStyleSheetContentsView);
    get text(): string;
    set styleSheetHeader(header: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader | undefined);
    get styleSheetHeader(): SDK.CSSStyleSheetHeader.CSSStyleSheetHeader | undefined;
    wasShown(): void;
    willHide(): void;
    fetchContent(): Promise<void>;
    startEditing(target?: Element): void;
    isEditing(): boolean;
    performUpdate(): void;
}
