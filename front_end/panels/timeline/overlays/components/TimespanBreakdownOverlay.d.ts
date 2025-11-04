import type * as Trace from '../../../../models/trace/trace.js';
export declare class TimespanBreakdownOverlay extends HTMLElement {
    #private;
    set isBelowEntry(isBelow: boolean);
    set canvasRect(rect: DOMRect | null);
    set sections(sections: Trace.Types.Overlays.TimespanBreakdownEntryBreakdown[] | null);
    /**
     * We use this method after the overlay has been positioned in order to move
     * the section label as required to keep it on screen.
     * If the label is off to the left or right, we fix it to that corner and
     * align the text so the label is visible as long as possible.
     */
    checkSectionLabelPositioning(): void;
    renderedSections(): HTMLElement[];
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-timespan-breakdown-overlay': TimespanBreakdownOverlay;
    }
}
