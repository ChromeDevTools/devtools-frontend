"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CDPConnectionAdapter_cdp, _CDPConnectionAdapter_adapters, _CDPConnectionAdapter_browser, _CDPClientAdapter_closed, _CDPClientAdapter_client, _CDPClientAdapter_forwardMessage, _NoOpTransport_onMessage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectBidiOverCDP = void 0;
const BidiMapper = __importStar(require("chromium-bidi/lib/cjs/bidiMapper/bidiMapper.js"));
const Connection_js_1 = require("./Connection.js");
/**
 * @internal
 */
async function connectBidiOverCDP(cdp) {
    const transportBiDi = new NoOpTransport();
    const cdpConnectionAdapter = new CDPConnectionAdapter(cdp);
    const pptrTransport = {
        send(message) {
            // Forwards a BiDi command sent by Puppeteer to the input of the BidiServer.
            transportBiDi.emitMessage(JSON.parse(message));
        },
        close() {
            bidiServer.close();
            cdpConnectionAdapter.close();
        },
        onmessage(_message) {
            // The method is overridden by the Connection.
        },
    };
    transportBiDi.on('bidiResponse', (message) => {
        // Forwards a BiDi event sent by BidiServer to Puppeteer.
        pptrTransport.onmessage(JSON.stringify(message));
    });
    const pptrBiDiConnection = new Connection_js_1.Connection(pptrTransport);
    const bidiServer = await BidiMapper.BidiServer.createAndStart(transportBiDi, cdpConnectionAdapter, '');
    return pptrBiDiConnection;
}
exports.connectBidiOverCDP = connectBidiOverCDP;
/**
 * Manages CDPSessions for BidiServer.
 * @internal
 */
class CDPConnectionAdapter {
    constructor(cdp) {
        _CDPConnectionAdapter_cdp.set(this, void 0);
        _CDPConnectionAdapter_adapters.set(this, new Map());
        _CDPConnectionAdapter_browser.set(this, void 0);
        __classPrivateFieldSet(this, _CDPConnectionAdapter_cdp, cdp, "f");
        __classPrivateFieldSet(this, _CDPConnectionAdapter_browser, new CDPClientAdapter(cdp), "f");
    }
    browserClient() {
        return __classPrivateFieldGet(this, _CDPConnectionAdapter_browser, "f");
    }
    getCdpClient(id) {
        const session = __classPrivateFieldGet(this, _CDPConnectionAdapter_cdp, "f").session(id);
        if (!session) {
            throw new Error('Unknown CDP session with id' + id);
        }
        if (!__classPrivateFieldGet(this, _CDPConnectionAdapter_adapters, "f").has(session)) {
            const adapter = new CDPClientAdapter(session);
            __classPrivateFieldGet(this, _CDPConnectionAdapter_adapters, "f").set(session, adapter);
            return adapter;
        }
        return __classPrivateFieldGet(this, _CDPConnectionAdapter_adapters, "f").get(session);
    }
    close() {
        __classPrivateFieldGet(this, _CDPConnectionAdapter_browser, "f").close();
        for (const adapter of __classPrivateFieldGet(this, _CDPConnectionAdapter_adapters, "f").values()) {
            adapter.close();
        }
    }
}
_CDPConnectionAdapter_cdp = new WeakMap(), _CDPConnectionAdapter_adapters = new WeakMap(), _CDPConnectionAdapter_browser = new WeakMap();
/**
 * Wrapper on top of CDPSession/CDPConnection to satisfy CDP interface that
 * BidiServer needs.
 *
 * @internal
 */
class CDPClientAdapter extends BidiMapper.EventEmitter {
    constructor(client) {
        super();
        _CDPClientAdapter_closed.set(this, false);
        _CDPClientAdapter_client.set(this, void 0);
        _CDPClientAdapter_forwardMessage.set(this, (method, event) => {
            this.emit(method, event);
        });
        __classPrivateFieldSet(this, _CDPClientAdapter_client, client, "f");
        __classPrivateFieldGet(this, _CDPClientAdapter_client, "f").on('*', __classPrivateFieldGet(this, _CDPClientAdapter_forwardMessage, "f"));
    }
    async sendCommand(method, ...params) {
        if (__classPrivateFieldGet(this, _CDPClientAdapter_closed, "f")) {
            return;
        }
        try {
            return await __classPrivateFieldGet(this, _CDPClientAdapter_client, "f").send(method, ...params);
        }
        catch (err) {
            if (__classPrivateFieldGet(this, _CDPClientAdapter_closed, "f")) {
                return;
            }
            throw err;
        }
    }
    close() {
        __classPrivateFieldGet(this, _CDPClientAdapter_client, "f").off('*', __classPrivateFieldGet(this, _CDPClientAdapter_forwardMessage, "f"));
        __classPrivateFieldSet(this, _CDPClientAdapter_closed, true, "f");
    }
}
_CDPClientAdapter_closed = new WeakMap(), _CDPClientAdapter_client = new WeakMap(), _CDPClientAdapter_forwardMessage = new WeakMap();
/**
 * This transport is given to the BiDi server instance and allows Puppeteer
 * to send and receive commands to the BiDiServer.
 * @internal
 */
class NoOpTransport extends BidiMapper.EventEmitter {
    constructor() {
        super(...arguments);
        _NoOpTransport_onMessage.set(this, async (_m) => {
            return;
        });
    }
    emitMessage(message) {
        __classPrivateFieldGet(this, _NoOpTransport_onMessage, "f").call(this, message);
    }
    setOnMessage(onMessage) {
        __classPrivateFieldSet(this, _NoOpTransport_onMessage, onMessage, "f");
    }
    async sendMessage(message) {
        this.emit('bidiResponse', message);
    }
    close() {
        __classPrivateFieldSet(this, _NoOpTransport_onMessage, async (_m) => {
            return;
        }, "f");
    }
}
_NoOpTransport_onMessage = new WeakMap();
//# sourceMappingURL=BidiOverCDP.js.map