import type * as Trace from '../../../../models/trace/trace.js';
export declare class TimeRangeLabelChangeEvent extends Event {
    newLabel: string;
    static readonly eventName = "timerangelabelchange";
    constructor(newLabel: string);
}
export declare class TimeRangeRemoveEvent extends Event {
    static readonly eventName = "timerangeremoveevent";
    constructor();
}
export declare class TimeRangeOverlay extends HTMLElement {
    #private;
    constructor(initialLabel: string);
    set canvasRect(rect: DOMRect | null);
    set duration(duration: Trace.Types.Timing.Micro | null);
    /**
     * We use this method after the overlay has been positioned in order to move
     * the label as required to keep it on screen.
     * If the label is off to the left or right, we fix it to that corner and
     * align the text so the label is visible as long as possible.
     */
    updateLabelPositioning(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-time-range-overlay': TimeRangeOverlay;
    }
}
