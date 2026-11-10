import { type CDPSession } from '../api/CDPSession.js';
/**
 * Streams the body of a response that is still loading, using
 * `Network.streamResourceContent` for the data received so far and
 * `Network.dataReceived` events for the rest.
 *
 * @internal
 */
export declare function createResponseBodyStream(client: CDPSession, requestId: string): Promise<ReadableStream<Uint8Array>>;
//# sourceMappingURL=ResponseBodyStream.d.ts.map