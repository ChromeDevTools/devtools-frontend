/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import NodeWebSocket from 'ws';
import { packageVersion } from '../generated/version.js';
/**
 * @internal
 */
export class NodeWebSocketTransport {
    static create(url, headers) {
        return new Promise((resolve, reject) => {
            const ws = new NodeWebSocket(url, [], {
                followRedirects: true,
                perMessageDeflate: false,
                maxPayload: 256 * 1024 * 1024, // 256Mb
                headers: {
                    'User-Agent': `Puppeteer ${packageVersion}`,
                    ...headers,
                },
            });
            ws.addEventListener('open', () => {
                return resolve(new NodeWebSocketTransport(ws));
            });
            ws.addEventListener('error', reject);
        });
    }
    #ws;
    onmessage;
    onclose;
    constructor(ws) {
        this.#ws = ws;
        this.#ws.addEventListener('message', event => {
            setImmediate(() => {
                if (this.onmessage) {
                    this.onmessage.call(null, event.data);
                }
            });
        });
        this.#ws.addEventListener('close', () => {
            setImmediate(() => {
                if (this.onclose) {
                    this.onclose.call(null);
                }
            });
        });
        // Silently ignore all errors - we don't know what to do with them.
        this.#ws.addEventListener('error', () => { });
    }
    send(message) {
        this.#ws.send(message);
    }
    close() {
        this.#ws.close();
    }
}
//# sourceMappingURL=NodeWebSocketTransport.js.map