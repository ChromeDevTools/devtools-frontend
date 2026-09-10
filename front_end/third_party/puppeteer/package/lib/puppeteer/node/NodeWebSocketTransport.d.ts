/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import NodeWebSocket from 'ws';
import type { ConnectionTransport } from '../common/ConnectionTransport.js';
import { type Logger } from '../common/Debug.js';
/**
 * How often to ping the browser when keep-alive is enabled, and how long to
 * wait for the matching pong before treating the connection as dead.
 *
 * @internal
 */
export declare const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 30000;
/**
 * @internal
 */
export interface NodeWebSocketTransportOptions {
    /**
     * Detect a connection that died without a TCP close by exchanging
     * WebSocket ping/pong frames.
     */
    keepAlive?: boolean;
    /**
     * Ping period in milliseconds. Only used when `keepAlive` is set.
     */
    keepAliveIntervalMs?: number;
}
/**
 * @internal
 */
export declare class NodeWebSocketTransport implements ConnectionTransport {
    #private;
    static create(url: string, headers: Record<string, string> | undefined, logger: Logger, options?: NodeWebSocketTransportOptions): Promise<NodeWebSocketTransport>;
    onmessage?: (message: NodeWebSocket.Data) => void;
    onclose?: () => void;
    constructor(ws: NodeWebSocket, logger: Logger, options?: NodeWebSocketTransportOptions);
    send(message: string): void;
    close(): void;
}
//# sourceMappingURL=NodeWebSocketTransport.d.ts.map