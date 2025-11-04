import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';
export declare function buildWarningElementsForEvent(event: Trace.Types.Events.Event, parsedTrace: Trace.TraceModel.ParsedTrace): HTMLSpanElement[];
export interface DetailRow {
    key: string;
    value: string;
}
export declare function buildRowsForWebSocketEvent(event: Trace.Types.Events.WebSocketCreate | Trace.Types.Events.WebSocketInfo | Trace.Types.Events.WebSocketTransfer, parsedTrace: Trace.TraceModel.ParsedTrace): readonly DetailRow[];
/**
 * This method does not output any content but instead takes a list of
 * invalidations and groups them, doing some processing of the data to collect
 * invalidations grouped by the reason/cause.
 * It also returns all BackendNodeIds that are related to these invalidations
 * so that they can be fetched via CDP.
 * It is exported only for testing purposes.
 **/
export declare function generateInvalidationsList(invalidations: Trace.Types.Events.InvalidationTrackingEvent[]): {
    groupedByReason: Record<string, Trace.Types.Events.InvalidationTrackingEvent[]>;
    backendNodeIds: Set<Protocol.DOM.BackendNodeId>;
};
