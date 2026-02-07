import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * A thin wrapper around the CSS Model to gather up changes in CSS files that
 * could impact a node's computed styles.
 * Callers are expected to initiate tracking of the Node themselves via the CSS
 * Model trackComputedStyleUpdatesForNode method.
 */
export declare class ComputedStyleModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private eventListeners;
    private frameResizedTimer?;
    private computedStylePromise?;
    constructor(node?: SDK.DOMModel.DOMNode | null);
    get node(): SDK.DOMModel.DOMNode | null;
    set node(node: SDK.DOMModel.DOMNode | null);
    cssModel(): SDK.CSSModel.CSSModel | null;
    private updateModel;
    private onCSSModelChanged;
    private onComputedStyleChanged;
    private onDOMModelChanged;
    private onFrameResized;
    private elementNode;
    fetchComputedStyle(): Promise<ComputedStyle | null>;
}
export declare const enum Events {
    CSS_MODEL_CHANGED = "CSSModelChanged",
    COMPUTED_STYLE_CHANGED = "ComputedStyleChanged"
}
export type CSSModelChangedEvent = SDK.CSSStyleSheetHeader.CSSStyleSheetHeader | SDK.CSSModel.StyleSheetChangedEvent | SDK.CSSModel.PseudoStateForcedEvent | SDK.DOMModel.DOMNode | null | void;
export interface EventTypes {
    [Events.CSS_MODEL_CHANGED]: CSSModelChangedEvent;
    [Events.COMPUTED_STYLE_CHANGED]: void;
}
export declare class ComputedStyle {
    node: SDK.DOMModel.DOMNode;
    computedStyle: Map<string, string>;
    constructor(node: SDK.DOMModel.DOMNode, computedStyle: Map<string, string>);
}
