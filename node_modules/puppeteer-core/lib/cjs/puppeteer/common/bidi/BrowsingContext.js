"use strict";
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
var _CDPSessionWrapper_context, _CDPSessionWrapper_sessionId, _BrowsingContext_timeoutSettings, _BrowsingContext_id, _BrowsingContext_url, _BrowsingContext_cdpSession;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWaitUntilSingle = exports.BrowsingContext = exports.CDPSessionWrapper = void 0;
const assert_js_1 = require("../../util/assert.js");
const Deferred_js_1 = require("../../util/Deferred.js");
const Errors_js_1 = require("../Errors.js");
const EventEmitter_js_1 = require("../EventEmitter.js");
const util_js_1 = require("../util.js");
const Realm_js_1 = require("./Realm.js");
/**
 * @internal
 */
const lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
const lifeCycleToReadinessState = new Map([
    ['load', 'complete'],
    ['domcontentloaded', 'interactive'],
]);
/**
 * @internal
 */
class CDPSessionWrapper extends EventEmitter_js_1.EventEmitter {
    constructor(context) {
        super();
        _CDPSessionWrapper_context.set(this, void 0);
        _CDPSessionWrapper_sessionId.set(this, Deferred_js_1.Deferred.create());
        __classPrivateFieldSet(this, _CDPSessionWrapper_context, context, "f");
        context.connection
            .send('cdp.getSession', {
            context: context.id,
        })
            .then(session => {
            __classPrivateFieldGet(this, _CDPSessionWrapper_sessionId, "f").resolve(session.result.cdpSession);
        })
            .catch(err => {
            __classPrivateFieldGet(this, _CDPSessionWrapper_sessionId, "f").reject(err);
        });
    }
    connection() {
        return undefined;
    }
    async send(method, ...paramArgs) {
        const cdpSession = await __classPrivateFieldGet(this, _CDPSessionWrapper_sessionId, "f").valueOrThrow();
        const result = await __classPrivateFieldGet(this, _CDPSessionWrapper_context, "f").connection.send('cdp.sendCommand', {
            cdpMethod: method,
            cdpParams: paramArgs[0] || {},
            cdpSession,
        });
        return result.result;
    }
    detach() {
        throw new Error('Method not implemented.');
    }
    id() {
        const val = __classPrivateFieldGet(this, _CDPSessionWrapper_sessionId, "f").value();
        return val instanceof Error || val === undefined ? '' : val;
    }
}
exports.CDPSessionWrapper = CDPSessionWrapper;
_CDPSessionWrapper_context = new WeakMap(), _CDPSessionWrapper_sessionId = new WeakMap();
/**
 * @internal
 */
class BrowsingContext extends Realm_js_1.Realm {
    constructor(connection, timeoutSettings, info) {
        super(connection, info.context);
        _BrowsingContext_timeoutSettings.set(this, void 0);
        _BrowsingContext_id.set(this, void 0);
        _BrowsingContext_url.set(this, 'about:blank');
        _BrowsingContext_cdpSession.set(this, void 0);
        this.connection = connection;
        __classPrivateFieldSet(this, _BrowsingContext_timeoutSettings, timeoutSettings, "f");
        __classPrivateFieldSet(this, _BrowsingContext_id, info.context, "f");
        __classPrivateFieldSet(this, _BrowsingContext_cdpSession, new CDPSessionWrapper(this), "f");
    }
    createSandboxRealm(sandbox) {
        return new Realm_js_1.Realm(this.connection, __classPrivateFieldGet(this, _BrowsingContext_id, "f"), sandbox);
    }
    get url() {
        return __classPrivateFieldGet(this, _BrowsingContext_url, "f");
    }
    get id() {
        return __classPrivateFieldGet(this, _BrowsingContext_id, "f");
    }
    get cdpSession() {
        return __classPrivateFieldGet(this, _BrowsingContext_cdpSession, "f");
    }
    async goto(url, options = {}) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        try {
            const { result } = await (0, util_js_1.waitWithTimeout)(this.connection.send('browsingContext.navigate', {
                url: url,
                context: __classPrivateFieldGet(this, _BrowsingContext_id, "f"),
                wait: readinessState,
            }), 'Navigation', timeout);
            __classPrivateFieldSet(this, _BrowsingContext_url, result.url, "f");
            return result.navigation;
        }
        catch (error) {
            if (error instanceof Errors_js_1.ProtocolError) {
                error.message += ` at ${url}`;
            }
            else if (error instanceof Errors_js_1.TimeoutError) {
                error.message = 'Navigation timeout of ' + timeout + ' ms exceeded';
            }
            throw error;
        }
    }
    async reload(options = {}) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        await (0, util_js_1.waitWithTimeout)(this.connection.send('browsingContext.reload', {
            context: __classPrivateFieldGet(this, _BrowsingContext_id, "f"),
            wait: readinessState,
        }), 'Navigation', timeout);
    }
    async setContent(html, options) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _BrowsingContext_timeoutSettings, "f").navigationTimeout(), } = options;
        const waitUntilEvent = lifeCycleToSubscribedEvent.get(getWaitUntilSingle(waitUntil));
        await Promise.all([
            (0, util_js_1.setPageContent)(this, html),
            (0, util_js_1.waitWithTimeout)(new Promise(resolve => {
                this.once(waitUntilEvent, () => {
                    resolve();
                });
            }), waitUntilEvent, timeout),
        ]);
    }
    async content() {
        return await this.evaluate(util_js_1.getPageContent);
    }
    async sendCDPCommand(method, ...paramArgs) {
        return __classPrivateFieldGet(this, _BrowsingContext_cdpSession, "f").send(method, ...paramArgs);
    }
    title() {
        return this.evaluate(() => {
            return document.title;
        });
    }
    dispose() {
        this.removeAllListeners();
        this.connection.unregisterBrowsingContexts(__classPrivateFieldGet(this, _BrowsingContext_id, "f"));
    }
}
exports.BrowsingContext = BrowsingContext;
_BrowsingContext_timeoutSettings = new WeakMap(), _BrowsingContext_id = new WeakMap(), _BrowsingContext_url = new WeakMap(), _BrowsingContext_cdpSession = new WeakMap();
/**
 * @internal
 */
function getWaitUntilSingle(event) {
    if (Array.isArray(event) && event.length > 1) {
        throw new Error('BiDi support only single `waitUntil` argument');
    }
    const waitUntilSingle = Array.isArray(event)
        ? event.find(lifecycle => {
            return lifecycle === 'domcontentloaded' || lifecycle === 'load';
        })
        : event;
    if (waitUntilSingle === 'networkidle0' ||
        waitUntilSingle === 'networkidle2') {
        throw new Error(`BiDi does not support 'waitUntil' ${waitUntilSingle}`);
    }
    (0, assert_js_1.assert)(waitUntilSingle, `Invalid waitUntil option ${waitUntilSingle}`);
    return waitUntilSingle;
}
exports.getWaitUntilSingle = getWaitUntilSingle;
//# sourceMappingURL=BrowsingContext.js.map