import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Trace from '../../models/trace/trace.js';
export declare class TracingManager extends SDK.SDKModel.SDKModel<void> {
    #private;
    constructor(target: SDK.Target.Target);
    bufferUsage(usage?: number, percentFull?: number): void;
    eventsCollected(events: Trace.Types.Events.Event[]): void;
    tracingComplete(): void;
    reset(): Promise<void>;
    start(client: TracingManagerClient, categoryFilter: string): Promise<Protocol.ProtocolResponseWithError>;
    stop(): void;
}
export interface TracingManagerClient {
    traceEventsCollected(events: Trace.Types.Events.Event[]): void;
    tracingComplete(): void;
    tracingBufferUsage(usage: number): void;
    eventsRetrievalProgress(progress: number): void;
}
