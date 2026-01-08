import * as Trace from '../../models/trace/trace.js';
export interface InitiatorData {
    event: Trace.Types.Events.Event;
    initiator: Trace.Types.Events.Event;
    isEntryHidden?: boolean;
    isInitiatorHidden?: boolean;
}
export interface InitiatorDataOptions {
    /**
     * Used to limit how far back through the chain we go; some large JS apps can
     * have vast amounts of initiator stacks and it's hard to render them
     * efficiently, and also not very useful to the user if we just show loads of
     * them.
     */
    predecessorLimit: number;
}
/**
 * Given an event that the user has selected, this function returns all the
 * data of events and their initiators that need to be drawn on the flamechart.
 * The reason that this can return multiple InitiatorEntry objects is because we draw the
 * entire chain: for each, we see if it had an initiator, and
 * work backwards to draw each one, as well as the events initiated directly by the entry.
 */
export declare function initiatorsDataToDraw(parsedTrace: Trace.TraceModel.ParsedTrace, selectedEvent: Trace.Types.Events.Event, hiddenEntries: Trace.Types.Events.Event[], expandableEntries: Trace.Types.Events.Event[]): readonly InitiatorData[];
export declare function initiatorsDataToDrawForNetwork(parsedTrace: Trace.TraceModel.ParsedTrace, selectedEvent: Trace.Types.Events.Event): readonly InitiatorData[];
