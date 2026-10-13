import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
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
