import type { Size } from '../../models/geometry/geometry.js';
import { Widget } from './Widget.js';
export declare class GlassPane {
    #private;
    element: typeof Widget.prototype.element;
    contentElement: typeof Widget.prototype.contentElement;
    private readonly onMouseDownBound;
    private onClickOutsideCallback;
    private maxSize;
    private positionX;
    private positionY;
    private anchorBox;
    private anchorBehavior;
    private sizeBehavior;
    private marginBehavior;
    constructor(jslog?: string);
    setJsLog(jslog: string): void;
    isShowing(): boolean;
    registerRequiredCSS(...cssFiles: Array<string & {
        _tag: 'CSS-in-JS';
    }>): void;
    setDefaultFocusedElement(element: Element | null): void;
    setDimmed(dimmed: boolean): void;
    setPointerEventsBehavior(pointerEventsBehavior: PointerEventsBehavior): void;
    setOutsideClickCallback(callback: ((arg0: Event) => void) | null): void;
    setOnHideCallback(cb: () => void): void;
    setMaxContentSize(size: Size | null): void;
    setSizeBehavior(sizeBehavior: SizeBehavior): void;
    setContentPosition(x: number | null, y: number | null): void;
    setContentAnchorBox(anchorBox: AnchorBox | null): void;
    setAnchorBehavior(behavior: AnchorBehavior): void;
    setMarginBehavior(behavior: MarginBehavior): void;
    setIgnoreLeftMargin(ignore: boolean): void;
    show(document: Document): void;
    hide(): void;
    private onMouseDown;
    positionContent(): void;
    widget(): Widget;
    static setContainer(element: Element): void;
    static container(document: Document): Element;
    static containerMoved(element: Element): void;
}
export declare const enum PointerEventsBehavior {
    BLOCKED_BY_GLASS_PANE = "BlockedByGlassPane",
    PIERCE_GLASS_PANE = "PierceGlassPane",
    PIERCE_CONTENTS = "PierceContents"
}
export declare const enum AnchorBehavior {
    PREFER_TOP = "PreferTop",
    PREFER_BOTTOM = "PreferBottom",
    PREFER_LEFT = "PreferLeft",
    PREFER_RIGHT = "PreferRight"
}
export declare const enum SizeBehavior {
    SET_EXACT_SIZE = "SetExactSize",
    SET_EXACT_WIDTH_MAX_HEIGHT = "SetExactWidthMaxHeight",
    MEASURE_CONTENT = "MeasureContent"
}
export declare const enum MarginBehavior {
    DEFAULT_MARGIN = "DefaultMargin",
    NO_MARGIN = "NoMargin"
}
/** Exported for layout tests. **/
export declare const GlassPanePanes: Set<GlassPane>;
