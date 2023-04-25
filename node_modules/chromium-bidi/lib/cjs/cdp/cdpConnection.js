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
    #browserCdpClient;
    /** Map from session ID to CdpClient. */
    #sessionCdpClients = new Map();
    #commandCallbacks = new Map();
    #log;
    #nextId = 0;
    constructor(transport, log = () => { }) {
        this.#transport = transport;
        this.#log = log;
        this.#transport.setOnMessage(this.#onMessage);
        this.#browserCdpClient = cdpClient_js_1.CdpClient.create(this, null);
    }
    /**
     * Closes the connection to the browser.
     */
    close() {
        this.#transport.close();
        for (const [, { reject }] of this.#commandCallbacks) {
            reject(new Error('Disconnected'));
        }
        this.#commandCallbacks.clear();
        this.#sessionCdpClients.clear();
    }
    /**
     * @return The CdpClient object attached to the root browser session.
     */
    browserClient() {
        return this.#browserCdpClient;
    }
    /**
     * Gets a CdpClient instance by sessionId.
     * @param sessionId The sessionId of the CdpClient to retrieve.
     * @return The CdpClient object attached to the given session, or null if the session is not attached.
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
            this.#commandCallbacks.set(id, { resolve, reject });
            const messageObj = { id, method, params };
            if (sessionId) {
                messageObj.sessionId = sessionId;
            }
            const messageStr = JSON.stringify(messageObj);
            const messagePretty = JSON.stringify(messageObj, null, 2);
            this.#transport.sendMessage(messageStr);
            this.#log('sent ▸', messagePretty);
        });
    }
    #onMessage = (message) => {
        const parsed = JSON.parse(message);
        const messagePretty = JSON.stringify(parsed, null, 2);
        this.#log('received ◂', messagePretty);
        // Update client map if a session is attached or detached.
        // Listen for these events on every session.
        if (parsed.method === 'Target.attachedToTarget') {
            const { sessionId } = parsed.params;
            this.#sessionCdpClients.set(sessionId, cdpClient_js_1.CdpClient.create(this, sessionId));
        }
        else if (parsed.method === 'Target.detachedFromTarget') {
            const { sessionId } = parsed.params;
            const client = this.#sessionCdpClients.get(sessionId);
            if (client) {
                this.#sessionCdpClients.delete(sessionId);
            }
        }
        if (parsed.id !== undefined) {
            // Handle command response.
            const callbacks = this.#commandCallbacks.get(parsed.id);
            if (callbacks) {
                if (parsed.result) {
                    callbacks.resolve(parsed.result);
                }
                else if (parsed.error) {
                    callbacks.reject(parsed.error);
                }
            }
        }
        else if (parsed.method) {
            const client = parsed.sessionId
                ? this.#sessionCdpClients.get(parsed.sessionId)
                : this.#browserCdpClient;
            if (client) {
                client.emit(parsed.method, parsed.params || {});
            }
        }
    };
}
exports.CdpConnection = CdpConnection;
//# sourceMappingURL=cdpConnection.js.map