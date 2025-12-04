import type * as Common from '../../../../core/common/common.js';
export declare class ColorFormatChangedEvent extends Event {
    static readonly eventName = "colorformatchanged";
    data: {
        color: Common.Color.Color;
    };
    constructor(color: Common.Color.Color);
}
export declare class ColorChangedEvent extends Event {
    static readonly eventName = "colorchanged";
    data: {
        color: Common.Color.Color;
    };
    constructor(color: Common.Color.Color);
}
export declare class ClickEvent extends Event {
    static readonly eventName = "swatchclick";
    constructor();
}
export declare class ColorSwatch extends HTMLElement {
    #private;
    constructor(tooltip?: string);
    static isColorSwatch(element: Element): element is ColorSwatch;
    get readonly(): boolean;
    set readonly(readonly: boolean);
    get color(): Common.Color.Color | null;
    get anchorBox(): AnchorBox | null;
    getText(): string | undefined;
    /**
     * Render this swatch given a color object or text to be parsed as a color.
     * @param color The color object or string to use for this swatch.
     */
    set color(color: Common.Color.Color);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-color-swatch': ColorSwatch;
    }
    interface HTMLElementEventMap {
        [ColorChangedEvent.eventName]: ColorChangedEvent;
        [ColorFormatChangedEvent.eventName]: ColorFormatChangedEvent;
        [ClickEvent.eventName]: Event;
    }
}
