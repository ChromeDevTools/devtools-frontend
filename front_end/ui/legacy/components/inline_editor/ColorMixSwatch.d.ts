import * as Common from '../../../../core/common/common.js';
export declare class ColorMixChangedEvent extends Event {
    static readonly eventName = "colormixchanged";
    data: {
        text: string;
    };
    constructor(text: string);
}
export declare class ColorMixSwatch extends HTMLElement {
    #private;
    private readonly shadow;
    private colorMixText;
    private firstColorText;
    private secondColorText;
    mixedColor(): Common.Color.Color | null;
    setFirstColor(text: string): void;
    setSecondColor(text: string): void;
    setColorMixText(text: string): void;
    getText(): string;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-color-mix-swatch': ColorMixSwatch;
    }
    interface HTMLElementEventMap {
        [ColorMixChangedEvent.eventName]: ColorMixChangedEvent;
    }
}
