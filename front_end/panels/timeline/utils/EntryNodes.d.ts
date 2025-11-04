import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Trace from '../../../models/trace/trace.js';
/**
 * Extracts a set of NodeIds for a given event.
 * The result is cached so you can safely call this multiple times.
 **/
export declare function nodeIdsForEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): Set<Protocol.DOM.BackendNodeId>;
/**
 * Looks up for backend node ids in different types of trace events
 * and resolves them into related DOM nodes.
 * This method is cached for the given event.
 */
export declare function relatedDOMNodesForEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode | null> | null>;
/**
 * Takes a set of Protocol.DOM.BackendNodeId ids and will return a map of NodeId=>DOMNode.
 */
export declare function domNodesForBackendIds(frameId: Protocol.Page.FrameId, nodeIds: Set<Protocol.DOM.BackendNodeId>): Promise<Map<Protocol.DOM.BackendNodeId, SDK.DOMModel.DOMNode | null>>;
