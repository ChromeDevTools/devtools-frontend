import * as Common from '../../../../core/common/common.js';
export declare class ColorMixChangedEvent extends Event {
    static readonly eventName = "colormixchanged";
    data: {
        text: string;
    };
    constructor(text: string);
}
export declare function serializeColorMix(space: string, items: string[]): string;
export declare class ColorMixSwatch extends HTMLElement {
    #private;
    private readonly shadow;
    private space;
    private items;
    private colors;
    mixedColor(): Common.Color.Color | null;
    setColorMix(space: string, items: string[]): void;
    setColor(index: number, text: string): void;
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
