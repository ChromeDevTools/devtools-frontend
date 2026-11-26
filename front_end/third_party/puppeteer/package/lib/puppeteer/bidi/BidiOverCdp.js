/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BidiMapper } from 'chromium-bidi';
import { CDPSessionEvent, } from '../api/CDPSession.js';
import { TargetCloseError } from '../common/Errors.js';
import { BidiConnection } from './Connection.js';
const scheduleMacrotask = typeof setImmediate === 'function'
    ? setImmediate
    : (callback) => {
        setTimeout(callback, 0);
    };
/**
 * @internal
 */
export async function connectBidiOverCdp(cdp, logger) {
    const bidiServerLogger = logger
        ? (prefix) => {
            return logger(`bidi:${prefix}`);
        }
        : undefined;
    const transportBiDi = new NoOpTransport();
    const cdpConnectionAdapter = new CdpConnectionAdapter(cdp);
    let bidiServer;
    let closed = false;
    let forceClosed = false;
    let pendingResponses = 0;
    let pendingDisconnectClose = false;
    const onCdpDisconnected = () => {
        closeResources();
        if (pendingResponses > 0) {
            pendingDisconnectClose = true;
        }
        else {
            pptrTransport.onclose?.();
        }
    };
    const closeResources = () => {
        if (closed) {
            return;
        }
        closed = true;
        cdp.off(CDPSessionEvent.Disconnected, onCdpDisconnected);
        bidiServer?.close();
        cdpConnectionAdapter.close();
    };
    const pptrTransport = {
        send(message) {
            // Forwards a BiDi command sent by Puppeteer to the input of the BidiServer.
            transportBiDi.emitMessage(JSON.parse(message));
        },
        close() {
            forceClosed = true;
            pendingDisconnectClose = false;
            closeResources();
            cdp.dispose();
        },
        onmessage(_message) {
            // The method is overridden by the Connection.
        },
    };
    transportBiDi.on('bidiResponse', (message) => {
        // Forwards a BiDi event sent by BidiServer to Puppeteer.
        // Dispatch in a macrotask (matching PipeTransport and ws
        // allowSynchronousEvents: false) so microtasks from each BiDi message
        // drain before the next message runs.
        if (forceClosed) {
            return;
        }
        const raw = JSON.stringify(message);
        pendingResponses++;
        scheduleMacrotask(() => {
            pendingResponses--;
            if (!forceClosed) {
                pptrTransport.onmessage?.(raw);
            }
            if (pendingDisconnectClose && pendingResponses === 0) {
                pendingDisconnectClose = false;
                pptrTransport.onclose?.();
            }
        });
    });
    const pptrBiDiConnection = new BidiConnection(cdp.url(), pptrTransport, cdp._idGenerator, cdp.delay, cdp.timeout, logger);
    if (cdp._closed) {
        onCdpDisconnected();
        return pptrBiDiConnection;
    }
    cdp.on(CDPSessionEvent.Disconnected, onCdpDisconnected);
    try {
        bidiServer = await BidiMapper.BidiServer.createAndStart(transportBiDi, cdpConnectionAdapter, cdpConnectionAdapter.browserClient(), 
        /* selfTargetId= */ '', undefined, bidiServerLogger);
    }
    catch (error) {
        forceClosed = true;
        pendingDisconnectClose = false;
        closeResources();
        pptrBiDiConnection.unbind();
        throw error;
    }
    if (closed) {
        bidiServer.close();
    }
    return pptrBiDiConnection;
}
/**
 * Manages CDPSessions for BidiServer.
 * @internal
 */
class CdpConnectionAdapter {
    #cdp;
    #adapters = new Map();
    #browserCdpConnection;
    constructor(cdp) {
        this.#cdp = cdp;
        this.#browserCdpConnection = new CDPClientAdapter(cdp);
    }
    browserClient() {
        return this.#browserCdpConnection;
    }
    getCdpClient(id) {
        const session = this.#cdp.session(id);
        if (!session) {
            throw new Error(`Unknown CDP session with id ${id}`);
        }
        if (!this.#adapters.has(session)) {
            const adapter = new CDPClientAdapter(session, id, this.#browserCdpConnection);
            this.#adapters.set(session, adapter);
            return adapter;
        }
        return this.#adapters.get(session);
    }
    close() {
        this.#browserCdpConnection.close();
        for (const adapter of this.#adapters.values()) {
            adapter.close();
        }
    }
}
/**
 * Wrapper on top of CDPSession/CDPConnection to satisfy CDP interface that
 * BidiServer needs.
 *
 * @internal
 */
class CDPClientAdapter extends BidiMapper.EventEmitter {
    #closed = false;
    #client;
    sessionId = undefined;
    #browserClient;
    constructor(client, sessionId, browserClient) {
        super();
        this.#client = client;
        this.sessionId = sessionId;
        this.#browserClient = browserClient;
        this.#client.on('*', this.#forwardMessage);
    }
    browserClient() {
        return this.#browserClient;
    }
    #forwardMessage = (method, event) => {
        this.emit(method, event);
    };
    async sendCommand(method, ...params) {
        if (this.#closed) {
            return;
        }
        try {
            return await this.#client.send(method, ...params);
        }
        catch (err) {
            if (this.#closed) {
                return;
            }
            throw err;
        }
    }
    close() {
        this.#client.off('*', this.#forwardMessage);
        this.#closed = true;
    }
    isCloseError(error) {
        return error instanceof TargetCloseError;
    }
}
/**
 * This transport is given to the BiDi server instance and allows Puppeteer
 * to send and receive commands to the BiDiServer.
 * @internal
 */
class NoOpTransport extends BidiMapper.EventEmitter {
    #onMessage = async (_m) => {
        return;
    };
    emitMessage(message) {
        void this.#onMessage(message);
    }
    setOnMessage(onMessage) {
        this.#onMessage = onMessage;
    }
    async sendMessage(message) {
        this.emit('bidiResponse', message);
    }
    close() {
        this.#onMessage = async (_m) => {
            return;
        };
    }
}
//# sourceMappingURL=BidiOverCdp.js.map