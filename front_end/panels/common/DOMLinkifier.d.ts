import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export interface Options {
    tooltip?: string;
    preventKeyboardFocus?: boolean;
    textContent?: string;
    isDynamicLink?: boolean;
    hiddenClassList?: string[];
    disabled?: boolean;
    ariaDescription?: string;
    onClick?: () => void;
}
interface ViewInput {
    dynamic?: boolean;
    disabled?: boolean;
    preventKeyboardFocus?: boolean;
    tagName?: string;
    id?: string;
    classes: string[];
    pseudo?: string;
    ariaDescription?: string;
    onClick: () => void;
    onMouseOver: () => void;
    onMouseLeave: () => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare class DOMNodeLink extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, node?: SDK.DOMModel.DOMNode, options?: Options, view?: View);
    set node(node: SDK.DOMModel.DOMNode | undefined);
    set options(options: Options | undefined);
    performUpdate(): void;
}
interface DeferredViewInput {
    preventKeyboardFocus?: boolean;
    onClick: () => void;
}
type DeferredView = (input: DeferredViewInput, output: object, target: HTMLElement) => void;
export declare class DeferredDOMNodeLink extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, deferredNode?: SDK.DOMModel.DeferredDOMNode, options?: Options, styleSheetId?: Protocol.DOM.StyleSheetId, view?: DeferredView);
    performUpdate(): void;
}
export declare class Linkifier {
    static instance(opts?: {
        forceNew: boolean | null;
    }): Linkifier;
    linkify(node: SDK.DOMModel.DOMNode | SDK.DOMModel.DeferredDOMNode, options?: Options): LitTemplate;
}
export {};
