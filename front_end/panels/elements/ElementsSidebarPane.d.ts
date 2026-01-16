import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type ComputedStyleModel, type CSSModelChangedEvent } from './ComputedStyleModel.js';
export declare class ElementsSidebarPane extends UI.Widget.VBox {
    protected computedStyleModelInternal: ComputedStyleModel;
    constructor(computedStyleModel: ComputedStyleModel, options?: UI.Widget.WidgetOptions);
    node(): SDK.DOMModel.DOMNode | null;
    cssModel(): SDK.CSSModel.CSSModel | null;
    computedStyleModel(): ComputedStyleModel;
    performUpdate(): Promise<void>;
    onCSSModelChanged(_event: Common.EventTarget.EventTargetEvent<CSSModelChangedEvent | null>): void;
    onComputedStyleChanged(): void;
}
