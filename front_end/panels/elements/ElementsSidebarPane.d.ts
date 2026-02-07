import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ElementsSidebarPane extends UI.Widget.VBox {
    protected computedStyleModelInternal: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    constructor(computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel, options?: UI.Widget.WidgetOptions);
    node(): SDK.DOMModel.DOMNode | null;
    cssModel(): SDK.CSSModel.CSSModel | null;
    computedStyleModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel;
    performUpdate(): Promise<void>;
    onCSSModelChanged(_event: Common.EventTarget.EventTargetEvent<ComputedStyle.ComputedStyleModel.CSSModelChangedEvent | null>): void;
    onComputedStyleChanged(): void;
}
