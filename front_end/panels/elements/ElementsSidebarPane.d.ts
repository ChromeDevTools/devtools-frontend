import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ElementsSidebarPane<ContentTypeT extends HTMLElement | DocumentFragment = HTMLElement> extends UI.Widget.VBox<ContentTypeT> {
    protected computedStyleModelInternal: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    constructor(computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel, options: UI.Widget.WidgetOptions<ContentTypeT>);
    node(): SDK.DOMModel.DOMNode | null;
    cssModel(): SDK.CSSModel.CSSModel | null;
    computedStyleModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    performUpdate(): Promise<void>;
    onCSSModelChanged(_event: Common.EventTarget.EventTargetEvent<ComputedStyle.ComputedStyleModel.CSSModelChangedEvent | null>): void;
    onComputedStyleChanged(): void;
}
