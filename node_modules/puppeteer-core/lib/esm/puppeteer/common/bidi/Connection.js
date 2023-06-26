/**
 * Copyright 2017 Google Inc. All rights reserved.
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
var _Connection_instances, _Connection_url, _Connection_transport, _Connection_delay, _Connection_timeout, _Connection_closed, _Connection_callbacks, _Connection_browsingContexts, _Connection_maybeEmitOnContext, _Connection_onClose;
import { CallbackRegistry } from '../Connection.js';
import { debug } from '../Debug.js';
import { EventEmitter } from '../EventEmitter.js';
const debugProtocolSend = debug('puppeteer:webDriverBiDi:SEND ►');
const debugProtocolReceive = debug('puppeteer:webDriverBiDi:RECV ◀');
/**
 * @internal
 */
export class Connection extends EventEmitter {
    constructor(url, transport, delay = 0, timeout) {
        super();
        _Connection_instances.add(this);
        _Connection_url.set(this, void 0);
        _Connection_transport.set(this, void 0);
        _Connection_delay.set(this, void 0);
        _Connection_timeout.set(this, 0);
        _Connection_closed.set(this, false);
        _Connection_callbacks.set(this, new CallbackRegistry());
        _Connection_browsingContexts.set(this, new Map());
        __classPrivateFieldSet(this, _Connection_url, url, "f");
        __classPrivateFieldSet(this, _Connection_delay, delay, "f");
        __classPrivateFieldSet(this, _Connection_timeout, timeout ?? 180000, "f");
        __classPrivateFieldSet(this, _Connection_transport, transport, "f");
        __classPrivateFieldGet(this, _Connection_transport, "f").onmessage = this.onMessage.bind(this);
        __classPrivateFieldGet(this, _Connection_transport, "f").onclose = __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_onClose).bind(this);
    }
    get closed() {
        return __classPrivateFieldGet(this, _Connection_closed, "f");
    }
    get url() {
        return __classPrivateFieldGet(this, _Connection_url, "f");
    }
    send(method, params) {
        return __classPrivateFieldGet(this, _Connection_callbacks, "f").create(method, __classPrivateFieldGet(this, _Connection_timeout, "f"), id => {
            const stringifiedMessage = JSON.stringify({
                id,
                method,
                params,
            });
            debugProtocolSend(stringifiedMessage);
            __classPrivateFieldGet(this, _Connection_transport, "f").send(stringifiedMessage);
        });
    }
    /**
     * @internal
     */
    async onMessage(message) {
        if (__classPrivateFieldGet(this, _Connection_delay, "f")) {
            await new Promise(f => {
                return setTimeout(f, __classPrivateFieldGet(this, _Connection_delay, "f"));
            });
        }
        debugProtocolReceive(message);
        const object = JSON.parse(message);
        if ('id' in object) {
            if ('error' in object) {
                __classPrivateFieldGet(this, _Connection_callbacks, "f").reject(object.id, createProtocolError(object), object.message);
            }
            else {
                __classPrivateFieldGet(this, _Connection_callbacks, "f").resolve(object.id, object);
            }
        }
        else {
            __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_maybeEmitOnContext).call(this, object);
            this.emit(object.method, object.params);
        }
    }
    registerBrowsingContexts(context) {
        __classPrivateFieldGet(this, _Connection_browsingContexts, "f").set(context.id, context);
    }
    unregisterBrowsingContexts(id) {
        __classPrivateFieldGet(this, _Connection_browsingContexts, "f").delete(id);
    }
    dispose() {
        __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_onClose).call(this);
        __classPrivateFieldGet(this, _Connection_transport, "f").close();
    }
}
_Connection_url = new WeakMap(), _Connection_transport = new WeakMap(), _Connection_delay = new WeakMap(), _Connection_timeout = new WeakMap(), _Connection_closed = new WeakMap(), _Connection_callbacks = new WeakMap(), _Connection_browsingContexts = new WeakMap(), _Connection_instances = new WeakSet(), _Connection_maybeEmitOnContext = function _Connection_maybeEmitOnContext(event) {
    let context;
    // Context specific events
    if ('context' in event.params && event.params.context) {
        context = __classPrivateFieldGet(this, _Connection_browsingContexts, "f").get(event.params.context);
        // `log.entryAdded` specific context
    }
    else if ('source' in event.params && event.params.source.context) {
        context = __classPrivateFieldGet(this, _Connection_browsingContexts, "f").get(event.params.source.context);
    }
    else if (event.method === 'cdp.eventReceived') {
        // TODO: this is not a good solution and we need to find a better one.
        // Perhaps we need to have a dedicated CDP event emitter or emulate
        // the CDPSession interface with BiDi?.
        const cdpSessionId = event.params.cdpSession;
        for (const context of __classPrivateFieldGet(this, _Connection_browsingContexts, "f").values()) {
            if (context.cdpSession?.id() === cdpSessionId) {
                context.cdpSession.emit(event.params.cdpMethod, event.params.cdpParams);
            }
        }
    }
    context?.emit(event.method, event.params);
}, _Connection_onClose = function _Connection_onClose() {
    if (__classPrivateFieldGet(this, _Connection_closed, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _Connection_closed, true, "f");
    __classPrivateFieldGet(this, _Connection_transport, "f").onmessage = undefined;
    __classPrivateFieldGet(this, _Connection_transport, "f").onclose = undefined;
    __classPrivateFieldGet(this, _Connection_callbacks, "f").clear();
};
/**
 * @internal
 */
function createProtocolError(object) {
    let message = `${object.error} ${object.message}`;
    if (object.stacktrace) {
        message += ` ${object.stacktrace}`;
    }
    return message;
}
//# sourceMappingURL=Connection.js.map