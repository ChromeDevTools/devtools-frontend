/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ConnectionTransport } from './ConnectionTransport.js';
import { type Logger } from './Debug.js';
/**
 * @internal
 */
export declare class BrowserWebSocketTransport implements ConnectionTransport {
    #private;
    static create(url: string, _headers: Record<string, string> | undefined, logger: Logger, _options?: {
        keepAlive?: boolean;
        keepAliveIntervalMs?: number;
    }): Promise<BrowserWebSocketTransport>;
    onmessage?: (message: string) => void;
    onclose?: () => void;
    constructor(ws: WebSocket, logger: Logger);
    send(message: string): void;
    close(): void;
}
//# sourceMappingURL=BrowserWebSocketTransport.d.ts.map