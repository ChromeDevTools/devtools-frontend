import '../../../../ui/kit/kit.js';
import * as Trace from '../../../../models/trace/trace.js';
export declare class EntryLinkStartCreating extends Event {
    static readonly eventName = "entrylinkstartcreating";
    constructor();
}
export interface EntryCutOff {
    cutOffTop: boolean;
    cutOffBottom: boolean;
    cutOffRight: boolean;
}
export interface EntryDimensionAndCoordinates {
    x: number;
    y: number;
    length: number;
    height: number;
    cutOffTop?: boolean;
    cutOffBottom?: boolean;
    cutOffRight?: boolean;
}
export interface ToEntryDimensionAndCoordinates {
    x: number;
    y: number;
    length?: number;
    height?: number;
    cutOffTop?: boolean;
    cutOffBottom?: boolean;
    cutOffRight?: boolean;
}
export interface ViewInput {
    coordinateFrom: {
        x: number;
        y: number;
    };
    fromEntryDimensions: {
        width: number;
        height: number;
    };
    fromEntryCutOff: EntryCutOff;
    coordinateTo: {
        x: number;
        y: number;
    };
    toEntryDimensions: {
        width: number;
        height: number;
    } | null;
    toEntryCutOff: EntryCutOff;
    entryFromVisible: boolean;
    entryToVisible: boolean;
    fromEntryIsSource: boolean;
    toEntryIsSource: boolean;
    arrowHidden: boolean;
    linkState: Trace.Types.File.EntriesLinkState;
    partlyVisibleConnectionLinePercentage: number;
    arrowColor: string;
    onStartCreating: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
export declare class EntriesLinkOverlay extends HTMLElement {
    #private;
    constructor(initialFromEntryCoordinateAndDimensions: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, linkCreationNotStartedState: Trace.Types.File.EntriesLinkState, view?: View);
    set canvasRect(rect: DOMRect | null);
    /**
     * If one entry that is linked is in a collapsed track, we show the outlines
     * but hide only the arrow.
     */
    set hideArrow(shouldHide: boolean);
    set fromEntryCoordinateAndDimensions(fromEntryParams: EntryDimensionAndCoordinates);
    set entriesVisibility(entriesVisibility: {
        fromEntryVisibility: boolean;
        toEntryVisibility: boolean;
    });
    set toEntryCoordinateAndDimensions(toEntryParams: ToEntryDimensionAndCoordinates);
    set fromEntryIsSource(x: boolean);
    set toEntryIsSource(x: boolean);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-entries-link-overlay': EntriesLinkOverlay;
    }
}
