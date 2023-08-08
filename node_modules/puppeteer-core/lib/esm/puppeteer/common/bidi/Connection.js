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
import { CallbackRegistry } from '../Connection.js';
import { debug } from '../Debug.js';
import { EventEmitter } from '../EventEmitter.js';
import { cdpSessions } from './BrowsingContext.js';
import { debugError } from './utils.js';
const debugProtocolSend = debug('puppeteer:webDriverBiDi:SEND ►');
const debugProtocolReceive = debug('puppeteer:webDriverBiDi:RECV ◀');
/**
 * @internal
 */
export class Connection extends EventEmitter {
    #url;
    #transport;
    #delay;
    #timeout = 0;
    #closed = false;
    #callbacks = new CallbackRegistry();
    #browsingContexts = new Map();
    constructor(url, transport, delay = 0, timeout) {
        super();
        this.#url = url;
        this.#delay = delay;
        this.#timeout = timeout ?? 180000;
        this.#transport = transport;
        this.#transport.onmessage = this.onMessage.bind(this);
        this.#transport.onclose = this.#onClose.bind(this);
    }
    get closed() {
        return this.#closed;
    }
    get url() {
        return this.#url;
    }
    send(method, params) {
        return this.#callbacks.create(method, this.#timeout, id => {
            const stringifiedMessage = JSON.stringify({
                id,
                method,
                params,
            });
            debugProtocolSend(stringifiedMessage);
            this.#transport.send(stringifiedMessage);
        });
    }
    /**
     * @internal
     */
    async onMessage(message) {
        if (this.#delay) {
            await new Promise(f => {
                return setTimeout(f, this.#delay);
            });
        }
        debugProtocolReceive(message);
        const object = JSON.parse(message);
        if ('id' in object && object.id) {
            if ('error' in object) {
                this.#callbacks.reject(object.id, createProtocolError(object), object.message);
            }
            else {
                this.#callbacks.resolve(object.id, object);
            }
        }
        else {
            if ('error' in object || 'id' in object || 'launched' in object) {
                debugError(object);
            }
            else {
                this.#maybeEmitOnContext(object);
                this.emit(object.method, object.params);
            }
        }
    }
    #maybeEmitOnContext(event) {
        let context;
        // Context specific events
        if ('context' in event.params && event.params.context) {
            context = this.#browsingContexts.get(event.params.context);
            // `log.entryAdded` specific context
        }
        else if ('source' in event.params && event.params.source.context) {
            context = this.#browsingContexts.get(event.params.source.context);
        }
        else if (isCDPEvent(event)) {
            cdpSessions
                .get(event.params.session)
                ?.emit(event.params.event, event.params.params);
        }
        context?.emit(event.method, event.params);
    }
    registerBrowsingContexts(context) {
        this.#browsingContexts.set(context.id, context);
    }
    getBrowsingContext(contextId) {
        const currentContext = this.#browsingContexts.get(contextId);
        if (!currentContext) {
            throw new Error(`BrowsingContext ${contextId} does not exist.`);
        }
        return currentContext;
    }
    getTopLevelContext(contextId) {
        let currentContext = this.#browsingContexts.get(contextId);
        if (!currentContext) {
            throw new Error(`BrowsingContext ${contextId} does not exist.`);
        }
        while (currentContext.parent) {
            contextId = currentContext.parent;
            currentContext = this.#browsingContexts.get(contextId);
            if (!currentContext) {
                throw new Error(`BrowsingContext ${contextId} does not exist.`);
            }
        }
        return currentContext;
    }
    unregisterBrowsingContexts(id) {
        this.#browsingContexts.delete(id);
    }
    #onClose() {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        this.#transport.onmessage = undefined;
        this.#transport.onclose = undefined;
        this.#callbacks.clear();
    }
    dispose() {
        this.#onClose();
        this.#transport.close();
    }
}
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
function isCDPEvent(event) {
    return event.method.startsWith('cdp.');
}
//# sourceMappingURL=Connection.js.map