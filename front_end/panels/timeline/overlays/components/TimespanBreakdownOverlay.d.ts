import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export interface Input {
    sections: Trace.Types.Overlays.TimespanBreakdownEntryBreakdown[] | null;
    positions: SectionPosition[];
    left: number | null;
    width: number | null;
    maxHeight: number | null;
    top: number | null;
    className: string;
}
export interface SectionPosition {
    left: number | null;
    width: number | null;
}
type View = (input: Input, _output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: (input: Input, _output: undefined, target: HTMLElement) => void;
export declare class TimespanBreakdownOverlay extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set top(top: number);
    set maxHeight(maxHeight: number);
    set width(width: number);
    set left(left: number);
    set isBelowEntry(isBelow: boolean);
    set canvasRect(rect: DOMRect | null);
    set widths(widths: SectionPosition[]);
    set sections(sections: Trace.Types.Overlays.TimespanBreakdownEntryBreakdown[] | null);
    /**
     * We use this method after the overlay has been positioned in order to move
     * the section label as required to keep it on screen.
     * If the label is off to the left or right, we fix it to that corner and
     * align the text so the label is visible as long as possible.
     */
    checkSectionLabelPositioning(): void;
    performUpdate(): void;
}
export {};
