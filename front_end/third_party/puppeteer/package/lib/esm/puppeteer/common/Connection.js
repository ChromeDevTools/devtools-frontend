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
var _Callback_id, _Callback_error, _Callback_deferred, _Callback_timer, _Callback_label, _CallbackRegistry_callbacks, _CallbackRegistry_idGenerator, _Connection_instances, _Connection_url, _Connection_transport, _Connection_delay, _Connection_timeout, _Connection_sessions, _Connection_closed, _Connection_manuallyAttached, _Connection_callbacks, _Connection_onClose, _CDPSessionImpl_sessionId, _CDPSessionImpl_targetType, _CDPSessionImpl_callbacks, _CDPSessionImpl_connection;
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { debug } from './Debug.js';
import { TargetCloseError, ProtocolError } from './Errors.js';
import { EventEmitter } from './EventEmitter.js';
import { debugError } from './util.js';
const debugProtocolSend = debug('puppeteer:protocol:SEND ►');
const debugProtocolReceive = debug('puppeteer:protocol:RECV ◀');
/**
 * Internal events that the Connection class emits.
 *
 * @internal
 */
export const ConnectionEmittedEvents = {
    Disconnected: Symbol('Connection.Disconnected'),
};
/**
 * @internal
 */
function createIncrementalIdGenerator() {
    let id = 0;
    return () => {
        return ++id;
    };
}
/**
 * @internal
 */
export class Callback {
    constructor(id, label, timeout) {
        _Callback_id.set(this, void 0);
        _Callback_error.set(this, new ProtocolError());
        _Callback_deferred.set(this, Deferred.create());
        _Callback_timer.set(this, void 0);
        _Callback_label.set(this, void 0);
        __classPrivateFieldSet(this, _Callback_id, id, "f");
        __classPrivateFieldSet(this, _Callback_label, label, "f");
        if (timeout) {
            __classPrivateFieldSet(this, _Callback_timer, setTimeout(() => {
                __classPrivateFieldGet(this, _Callback_deferred, "f").reject(rewriteError(__classPrivateFieldGet(this, _Callback_error, "f"), `${label} timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.`));
            }, timeout), "f");
        }
    }
    resolve(value) {
        clearTimeout(__classPrivateFieldGet(this, _Callback_timer, "f"));
        __classPrivateFieldGet(this, _Callback_deferred, "f").resolve(value);
    }
    reject(error) {
        clearTimeout(__classPrivateFieldGet(this, _Callback_timer, "f"));
        __classPrivateFieldGet(this, _Callback_deferred, "f").reject(error);
    }
    get id() {
        return __classPrivateFieldGet(this, _Callback_id, "f");
    }
    get promise() {
        return __classPrivateFieldGet(this, _Callback_deferred, "f");
    }
    get error() {
        return __classPrivateFieldGet(this, _Callback_error, "f");
    }
    get label() {
        return __classPrivateFieldGet(this, _Callback_label, "f");
    }
}
_Callback_id = new WeakMap(), _Callback_error = new WeakMap(), _Callback_deferred = new WeakMap(), _Callback_timer = new WeakMap(), _Callback_label = new WeakMap();
/**
 * Manages callbacks and their IDs for the protocol request/response communication.
 *
 * @internal
 */
export class CallbackRegistry {
    constructor() {
        _CallbackRegistry_callbacks.set(this, new Map());
        _CallbackRegistry_idGenerator.set(this, createIncrementalIdGenerator());
    }
    create(label, timeout, request) {
        const callback = new Callback(__classPrivateFieldGet(this, _CallbackRegistry_idGenerator, "f").call(this), label, timeout);
        __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").set(callback.id, callback);
        try {
            request(callback.id);
        }
        catch (error) {
            // We still throw sync errors synchronously and clean up the scheduled
            // callback.
            callback.promise
                .valueOrThrow()
                .catch(debugError)
                .finally(() => {
                __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").delete(callback.id);
            });
            callback.reject(error);
            throw error;
        }
        // Must only have sync code up until here.
        return callback.promise.valueOrThrow().finally(() => {
            __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").delete(callback.id);
        });
    }
    reject(id, message, originalMessage) {
        const callback = __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").get(id);
        if (!callback) {
            return;
        }
        this._reject(callback, message, originalMessage);
    }
    _reject(callback, errorMessage, originalMessage) {
        const isError = errorMessage instanceof ProtocolError;
        const message = isError ? errorMessage.message : errorMessage;
        const error = isError ? errorMessage : callback.error;
        callback.reject(rewriteError(error, `Protocol error (${callback.label}): ${message}`, originalMessage));
    }
    resolve(id, value) {
        const callback = __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").get(id);
        if (!callback) {
            return;
        }
        callback.resolve(value);
    }
    clear() {
        for (const callback of __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").values()) {
            // TODO: probably we can accept error messages as params.
            this._reject(callback, new TargetCloseError('Target closed'));
        }
        __classPrivateFieldGet(this, _CallbackRegistry_callbacks, "f").clear();
    }
}
_CallbackRegistry_callbacks = new WeakMap(), _CallbackRegistry_idGenerator = new WeakMap();
/**
 * @public
 */
export class Connection extends EventEmitter {
    constructor(url, transport, delay = 0, timeout) {
        super();
        _Connection_instances.add(this);
        _Connection_url.set(this, void 0);
        _Connection_transport.set(this, void 0);
        _Connection_delay.set(this, void 0);
        _Connection_timeout.set(this, void 0);
        _Connection_sessions.set(this, new Map());
        _Connection_closed.set(this, false);
        _Connection_manuallyAttached.set(this, new Set());
        _Connection_callbacks.set(this, new CallbackRegistry());
        __classPrivateFieldSet(this, _Connection_url, url, "f");
        __classPrivateFieldSet(this, _Connection_delay, delay, "f");
        __classPrivateFieldSet(this, _Connection_timeout, timeout ?? 180000, "f");
        __classPrivateFieldSet(this, _Connection_transport, transport, "f");
        __classPrivateFieldGet(this, _Connection_transport, "f").onmessage = this.onMessage.bind(this);
        __classPrivateFieldGet(this, _Connection_transport, "f").onclose = __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_onClose).bind(this);
    }
    static fromSession(session) {
        return session.connection();
    }
    get timeout() {
        return __classPrivateFieldGet(this, _Connection_timeout, "f");
    }
    /**
     * @internal
     */
    get _closed() {
        return __classPrivateFieldGet(this, _Connection_closed, "f");
    }
    /**
     * @internal
     */
    get _sessions() {
        return __classPrivateFieldGet(this, _Connection_sessions, "f");
    }
    /**
     * @param sessionId - The session id
     * @returns The current CDP session if it exists
     */
    session(sessionId) {
        return __classPrivateFieldGet(this, _Connection_sessions, "f").get(sessionId) || null;
    }
    url() {
        return __classPrivateFieldGet(this, _Connection_url, "f");
    }
    send(method, ...paramArgs) {
        // There is only ever 1 param arg passed, but the Protocol defines it as an
        // array of 0 or 1 items See this comment:
        // https://github.com/ChromeDevTools/devtools-protocol/pull/113#issuecomment-412603285
        // which explains why the protocol defines the params this way for better
        // type-inference.
        // So now we check if there are any params or not and deal with them accordingly.
        const params = paramArgs.length ? paramArgs[0] : undefined;
        return this._rawSend(__classPrivateFieldGet(this, _Connection_callbacks, "f"), method, params);
    }
    /**
     * @internal
     */
    _rawSend(callbacks, method, params, sessionId) {
        return callbacks.create(method, __classPrivateFieldGet(this, _Connection_timeout, "f"), id => {
            const stringifiedMessage = JSON.stringify({
                method,
                params,
                id,
                sessionId,
            });
            debugProtocolSend(stringifiedMessage);
            __classPrivateFieldGet(this, _Connection_transport, "f").send(stringifiedMessage);
        });
    }
    /**
     * @internal
     */
    async closeBrowser() {
        await this.send('Browser.close');
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
        if (object.method === 'Target.attachedToTarget') {
            const sessionId = object.params.sessionId;
            const session = new CDPSessionImpl(this, object.params.targetInfo.type, sessionId);
            __classPrivateFieldGet(this, _Connection_sessions, "f").set(sessionId, session);
            this.emit('sessionattached', session);
            const parentSession = __classPrivateFieldGet(this, _Connection_sessions, "f").get(object.sessionId);
            if (parentSession) {
                parentSession.emit('sessionattached', session);
            }
        }
        else if (object.method === 'Target.detachedFromTarget') {
            const session = __classPrivateFieldGet(this, _Connection_sessions, "f").get(object.params.sessionId);
            if (session) {
                session._onClosed();
                __classPrivateFieldGet(this, _Connection_sessions, "f").delete(object.params.sessionId);
                this.emit('sessiondetached', session);
                const parentSession = __classPrivateFieldGet(this, _Connection_sessions, "f").get(object.sessionId);
                if (parentSession) {
                    parentSession.emit('sessiondetached', session);
                }
            }
        }
        if (object.sessionId) {
            const session = __classPrivateFieldGet(this, _Connection_sessions, "f").get(object.sessionId);
            if (session) {
                session._onMessage(object);
            }
        }
        else if (object.id) {
            if (object.error) {
                __classPrivateFieldGet(this, _Connection_callbacks, "f").reject(object.id, createProtocolErrorMessage(object), object.error.message);
            }
            else {
                __classPrivateFieldGet(this, _Connection_callbacks, "f").resolve(object.id, object.result);
            }
        }
        else {
            this.emit(object.method, object.params);
        }
    }
    dispose() {
        __classPrivateFieldGet(this, _Connection_instances, "m", _Connection_onClose).call(this);
        __classPrivateFieldGet(this, _Connection_transport, "f").close();
    }
    /**
     * @internal
     */
    isAutoAttached(targetId) {
        return !__classPrivateFieldGet(this, _Connection_manuallyAttached, "f").has(targetId);
    }
    /**
     * @internal
     */
    async _createSession(targetInfo, isAutoAttachEmulated = true) {
        if (!isAutoAttachEmulated) {
            __classPrivateFieldGet(this, _Connection_manuallyAttached, "f").add(targetInfo.targetId);
        }
        const { sessionId } = await this.send('Target.attachToTarget', {
            targetId: targetInfo.targetId,
            flatten: true,
        });
        __classPrivateFieldGet(this, _Connection_manuallyAttached, "f").delete(targetInfo.targetId);
        const session = __classPrivateFieldGet(this, _Connection_sessions, "f").get(sessionId);
        if (!session) {
            throw new Error('CDPSession creation failed.');
        }
        return session;
    }
    /**
     * @param targetInfo - The target info
     * @returns The CDP session that is created
     */
    async createSession(targetInfo) {
        return await this._createSession(targetInfo, false);
    }
}
_Connection_url = new WeakMap(), _Connection_transport = new WeakMap(), _Connection_delay = new WeakMap(), _Connection_timeout = new WeakMap(), _Connection_sessions = new WeakMap(), _Connection_closed = new WeakMap(), _Connection_manuallyAttached = new WeakMap(), _Connection_callbacks = new WeakMap(), _Connection_instances = new WeakSet(), _Connection_onClose = function _Connection_onClose() {
    if (__classPrivateFieldGet(this, _Connection_closed, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _Connection_closed, true, "f");
    __classPrivateFieldGet(this, _Connection_transport, "f").onmessage = undefined;
    __classPrivateFieldGet(this, _Connection_transport, "f").onclose = undefined;
    __classPrivateFieldGet(this, _Connection_callbacks, "f").clear();
    for (const session of __classPrivateFieldGet(this, _Connection_sessions, "f").values()) {
        session._onClosed();
    }
    __classPrivateFieldGet(this, _Connection_sessions, "f").clear();
    this.emit(ConnectionEmittedEvents.Disconnected);
};
/**
 * Internal events that the CDPSession class emits.
 *
 * @internal
 */
export const CDPSessionEmittedEvents = {
    Disconnected: Symbol('CDPSession.Disconnected'),
};
/**
 * The `CDPSession` instances are used to talk raw Chrome Devtools Protocol.
 *
 * @remarks
 *
 * Protocol methods can be called with {@link CDPSession.send} method and protocol
 * events can be subscribed to with `CDPSession.on` method.
 *
 * Useful links: {@link https://chromedevtools.github.io/devtools-protocol/ | DevTools Protocol Viewer}
 * and {@link https://github.com/aslushnikov/getting-started-with-cdp/blob/HEAD/README.md | Getting Started with DevTools Protocol}.
 *
 * @example
 *
 * ```ts
 * const client = await page.target().createCDPSession();
 * await client.send('Animation.enable');
 * client.on('Animation.animationCreated', () =>
 *   console.log('Animation created!')
 * );
 * const response = await client.send('Animation.getPlaybackRate');
 * console.log('playback rate is ' + response.playbackRate);
 * await client.send('Animation.setPlaybackRate', {
 *   playbackRate: response.playbackRate / 2,
 * });
 * ```
 *
 * @public
 */
export class CDPSession extends EventEmitter {
    /**
     * @internal
     */
    constructor() {
        super();
    }
    connection() {
        throw new Error('Not implemented');
    }
    send() {
        throw new Error('Not implemented');
    }
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    async detach() {
        throw new Error('Not implemented');
    }
    /**
     * Returns the session's id.
     */
    id() {
        throw new Error('Not implemented');
    }
}
/**
 * @internal
 */
export class CDPSessionImpl extends CDPSession {
    /**
     * @internal
     */
    constructor(connection, targetType, sessionId) {
        super();
        _CDPSessionImpl_sessionId.set(this, void 0);
        _CDPSessionImpl_targetType.set(this, void 0);
        _CDPSessionImpl_callbacks.set(this, new CallbackRegistry());
        _CDPSessionImpl_connection.set(this, void 0);
        __classPrivateFieldSet(this, _CDPSessionImpl_connection, connection, "f");
        __classPrivateFieldSet(this, _CDPSessionImpl_targetType, targetType, "f");
        __classPrivateFieldSet(this, _CDPSessionImpl_sessionId, sessionId, "f");
    }
    connection() {
        return __classPrivateFieldGet(this, _CDPSessionImpl_connection, "f");
    }
    send(method, ...paramArgs) {
        if (!__classPrivateFieldGet(this, _CDPSessionImpl_connection, "f")) {
            return Promise.reject(new TargetCloseError(`Protocol error (${method}): Session closed. Most likely the ${__classPrivateFieldGet(this, _CDPSessionImpl_targetType, "f")} has been closed.`));
        }
        // See the comment in Connection#send explaining why we do this.
        const params = paramArgs.length ? paramArgs[0] : undefined;
        return __classPrivateFieldGet(this, _CDPSessionImpl_connection, "f")._rawSend(__classPrivateFieldGet(this, _CDPSessionImpl_callbacks, "f"), method, params, __classPrivateFieldGet(this, _CDPSessionImpl_sessionId, "f"));
    }
    /**
     * @internal
     */
    _onMessage(object) {
        if (object.id) {
            if (object.error) {
                __classPrivateFieldGet(this, _CDPSessionImpl_callbacks, "f").reject(object.id, createProtocolErrorMessage(object), object.error.message);
            }
            else {
                __classPrivateFieldGet(this, _CDPSessionImpl_callbacks, "f").resolve(object.id, object.result);
            }
        }
        else {
            assert(!object.id);
            this.emit(object.method, object.params);
        }
    }
    /**
     * Detaches the cdpSession from the target. Once detached, the cdpSession object
     * won't emit any events and can't be used to send messages.
     */
    async detach() {
        if (!__classPrivateFieldGet(this, _CDPSessionImpl_connection, "f")) {
            throw new Error(`Session already detached. Most likely the ${__classPrivateFieldGet(this, _CDPSessionImpl_targetType, "f")} has been closed.`);
        }
        await __classPrivateFieldGet(this, _CDPSessionImpl_connection, "f").send('Target.detachFromTarget', {
            sessionId: __classPrivateFieldGet(this, _CDPSessionImpl_sessionId, "f"),
        });
    }
    /**
     * @internal
     */
    _onClosed() {
        __classPrivateFieldGet(this, _CDPSessionImpl_callbacks, "f").clear();
        __classPrivateFieldSet(this, _CDPSessionImpl_connection, undefined, "f");
        this.emit(CDPSessionEmittedEvents.Disconnected);
    }
    /**
     * Returns the session's id.
     */
    id() {
        return __classPrivateFieldGet(this, _CDPSessionImpl_sessionId, "f");
    }
}
_CDPSessionImpl_sessionId = new WeakMap(), _CDPSessionImpl_targetType = new WeakMap(), _CDPSessionImpl_callbacks = new WeakMap(), _CDPSessionImpl_connection = new WeakMap();
function createProtocolErrorMessage(object) {
    let message = `${object.error.message}`;
    // TODO: remove the type checks when we stop connecting to BiDi with a CDP
    // client.
    if (object.error &&
        typeof object.error === 'object' &&
        'data' in object.error) {
        message += ` ${object.error.data}`;
    }
    return message;
}
function rewriteError(error, message, originalMessage) {
    error.message = message;
    error.originalMessage = originalMessage ?? error.originalMessage;
    return error;
}
/**
 * @internal
 */
export function isTargetClosedError(error) {
    return error instanceof TargetCloseError;
}
//# sourceMappingURL=Connection.js.map