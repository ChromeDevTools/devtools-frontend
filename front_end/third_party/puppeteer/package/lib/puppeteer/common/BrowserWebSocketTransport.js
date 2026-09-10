import { DEBUG_PREFIXES } from './Debug.js';
/**
 * @internal
 */
export class BrowserWebSocketTransport {
    static create(url, _headers, logger, 
    // Accepted so this stays call-compatible with NodeWebSocketTransport, which
    // BrowserConnector picks between at runtime. The keep-alive options are
    // Node-only: the browser WebSocket API exposes no ping frame.
    _options) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            ws.addEventListener('open', () => {
                return resolve(new BrowserWebSocketTransport(ws, logger));
            });
            ws.addEventListener('error', reject);
        });
    }
    #ws;
    #logger;
    onmessage;
    onclose;
    constructor(ws, logger) {
        this.#ws = ws;
        this.#logger = logger;
        this.#ws.addEventListener('message', event => {
            if (this.onmessage) {
                this.onmessage.call(null, event.data);
            }
        });
        this.#ws.addEventListener('close', () => {
            if (this.onclose) {
                this.onclose.call(null);
            }
        });
        // Silently log all errors - we don't know what to do with them.
        this.#ws.addEventListener('error', () => {
            this.#logger?.(DEBUG_PREFIXES.error);
        });
    }
    send(message) {
        this.#ws.send(message);
    }
    close() {
        this.#ws.close();
    }
}
//# sourceMappingURL=BrowserWebSocketTransport.js.map