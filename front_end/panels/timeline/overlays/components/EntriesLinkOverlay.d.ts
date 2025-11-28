import '../../../../ui/kit/kit.js';
import * as Trace from '../../../../models/trace/trace.js';
export declare class EntryLinkStartCreating extends Event {
    static readonly eventName = "entrylinkstartcreating";
    constructor();
}
export declare class EntriesLinkOverlay extends HTMLElement {
    #private;
    constructor(initialFromEntryCoordinateAndDimensions: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, linkCreationNotStartedState: Trace.Types.File.EntriesLinkState);
    set canvasRect(rect: DOMRect | null);
    entryFromWrapper(): HTMLElement | null;
    entryToWrapper(): HTMLElement | null;
    /**
     * If one entry that is linked is in a collapsed track, we show the outlines
     * but hide only the arrow.
     */
    set hideArrow(shouldHide: boolean);
    set fromEntryCoordinateAndDimensions(fromEntryParams: {
        x: number;
        y: number;
        length: number;
        height: number;
    });
    set entriesVisibility(entriesVisibility: {
        fromEntryVisibility: boolean;
        toEntryVisibility: boolean;
    });
    set toEntryCoordinateAndDimensions(toEntryParams: {
        x: number;
        y: number;
        length?: number;
        height?: number;
    });
    set fromEntryIsSource(x: boolean);
    set toEntryIsSource(x: boolean);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-entries-link-overlay': EntriesLinkOverlay;
    }
}
