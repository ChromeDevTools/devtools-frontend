"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpConnection = void 0;
const cdpClient_js_1 = require("./cdpClient.js");
/**
 * Represents a high-level CDP connection to the browser backend.
 * Manages a CdpClient instance for each active CDP session.
 */
class CdpConnection {
    #transport;
    /** The CdpClient object attached to the root browser session. */
    #browserCdpClient;
    /** Map from session ID to CdpClient. */
    #sessionCdpClients = new Map();
    #commandCallbacks = new Map();
    #logger;
    #nextId = 0;
    constructor(transport, logger) {
        this.#transport = transport;
        this.#logger = logger;
        this.#transport.setOnMessage(this.#onMessage);
        this.#browserCdpClient = new cdpClient_js_1.CdpClient(this, undefined);
    }
    /** Closes the connection to the browser. */
    close() {
        this.#transport.close();
        for (const [, { reject, error }] of this.#commandCallbacks) {
            reject(error);
        }
        this.#commandCallbacks.clear();
        this.#sessionCdpClients.clear();
    }
    /** The CdpClient object attached to the root browser session. */
    browserClient() {
        return this.#browserCdpClient;
    }
    /**
     * Gets a CdpClient instance attached to the given session ID,
     * or null if the session is not attached.
     */
    getCdpClient(sessionId) {
        const cdpClient = this.#sessionCdpClients.get(sessionId);
        if (!cdpClient) {
            throw new Error('Unknown CDP session ID');
        }
        return cdpClient;
    }
    sendCommand(method, params, sessionId) {
        return new Promise((resolve, reject) => {
            const id = this.#nextId++;
            this.#commandCallbacks.set(id, {
                resolve,
                reject,
                error: new cdpClient_js_1.CloseError(`${method} ${JSON.stringify(params)} ${sessionId ?? ''} call rejected because the connection has been closed.`),
            });
            const cdpMessage = { id, method, params };
            if (sessionId) {
                cdpMessage.sessionId = sessionId;
            }
            const cdpMessageStr = JSON.stringify(cdpMessage);
            void this.#transport.sendMessage(cdpMessageStr)?.catch((error) => {
                this.#logger?.('error', error);
                this.#transport.close();
            });
            this.#logger?.('sent ▸', JSON.stringify(cdpMessage, null, 2));
        });
    }
    #onMessage = (message) => {
        const messageParsed = JSON.parse(message);
        const messagePretty = JSON.stringify(messageParsed, null, 2);
        this.#logger?.('received ◂', messagePretty);
        // Update client map if a session is attached or detached.
        // Listen for these events on every session.
        if (messageParsed.method === 'Target.attachedToTarget') {
            const { sessionId } = messageParsed.params;
            this.#sessionCdpClients.set(sessionId, new cdpClient_js_1.CdpClient(this, sessionId));
        }
        else if (messageParsed.method === 'Target.detachedFromTarget') {
            const { sessionId } = messageParsed.params;
            const client = this.#sessionCdpClients.get(sessionId);
            if (client) {
                this.#sessionCdpClients.delete(sessionId);
            }
        }
        if (messageParsed.id !== undefined) {
            // Handle command response.
            const callbacks = this.#commandCallbacks.get(messageParsed.id);
            this.#commandCallbacks.delete(messageParsed.id);
            if (callbacks) {
                if (messageParsed.result) {
                    callbacks.resolve(messageParsed.result);
                }
                else if (messageParsed.error) {
                    callbacks.reject(messageParsed.error);
                }
            }
        }
        else if (messageParsed.method) {
            const client = messageParsed.sessionId
                ? this.#sessionCdpClients.get(messageParsed.sessionId)
                : this.#browserCdpClient;
            client?.emit(messageParsed.method, messageParsed.params || {});
        }
    };
}
exports.CdpConnection = CdpConnection;
//# sourceMappingURL=cdpConnection.js.map