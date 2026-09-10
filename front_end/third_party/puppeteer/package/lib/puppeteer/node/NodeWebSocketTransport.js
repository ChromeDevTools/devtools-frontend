/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import NodeWebSocket from 'ws';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { packageVersion } from '../util/version.js';
/**
 * How often to ping the browser when keep-alive is enabled, and how long to
 * wait for the matching pong before treating the connection as dead.
 *
 * @internal
 */
export const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 30_000;
/**
 * @internal
 */
export class NodeWebSocketTransport {
    static create(url, headers, logger, options = {}) {
        return new Promise((resolve, reject) => {
            const ws = new NodeWebSocket(url, [], {
                followRedirects: true,
                perMessageDeflate: false,
                allowSynchronousEvents: false,
                maxPayload: 256 * 1024 * 1024, // 256Mb
                headers: {
                    'User-Agent': `Puppeteer ${packageVersion}`,
                    ...headers,
                },
            });
            ws.addEventListener('open', () => {
                return resolve(new NodeWebSocketTransport(ws, logger, options));
            });
            ws.addEventListener('error', reject);
        });
    }
    #ws;
    #logger;
    #keepAliveTimer;
    onmessage;
    onclose;
    constructor(ws, logger, options = {}) {
        this.#ws = ws;
        this.#logger = logger;
        this.#ws.addEventListener('message', event => {
            if (this.onmessage) {
                this.onmessage.call(null, event.data);
            }
        });
        this.#ws.addEventListener('close', () => {
            this.#stopKeepAlive();
            if (this.onclose) {
                this.onclose.call(null);
            }
        });
        // Silently log all errors - we don't know what to do with them.
        this.#ws.addEventListener('error', err => {
            this.#logger?.(DEBUG_PREFIXES.error)?.(err);
        });
        if (options.keepAlive) {
            this.#startKeepAlive(options.keepAliveIntervalMs ?? DEFAULT_KEEP_ALIVE_INTERVAL_MS);
        }
    }
    /**
     * The `ws` client only reports a close when the peer sends a TCP FIN. A
     * connection dropped by a proxy, a load balancer reaping an idle socket or a
     * killed remote browser leaves a half-open socket that never emits `close`,
     * so the transport keeps reporting itself as connected until the next
     * command fails. Ping periodically and terminate when the pong for the
     * previous ping never arrived.
     */
    #startKeepAlive(intervalMs) {
        let awaitingPong = false;
        this.#ws.on('pong', () => {
            awaitingPong = false;
        });
        this.#keepAliveTimer = setInterval(() => {
            if (awaitingPong) {
                // terminate() rather than close(): the peer is not answering, so a
                // close handshake would hang. This emits `close` locally, which is
                // what surfaces the dead connection to the rest of Puppeteer.
                this.#ws.terminate();
                return;
            }
            awaitingPong = true;
            this.#ws.ping();
        }, intervalMs);
        // Never hold the process open just to keep pinging.
        this.#keepAliveTimer.unref?.();
    }
    #stopKeepAlive() {
        if (this.#keepAliveTimer !== undefined) {
            clearInterval(this.#keepAliveTimer);
            this.#keepAliveTimer = undefined;
        }
    }
    send(message) {
        this.#ws.send(message);
    }
    close() {
        this.#stopKeepAlive();
        this.#ws.close();
    }
}
//# sourceMappingURL=NodeWebSocketTransport.js.map