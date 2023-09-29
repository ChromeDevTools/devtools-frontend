"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWaitUntilSingle = exports.BrowsingContext = exports.BrowsingContextEvent = exports.CdpSessionWrapper = exports.cdpSessions = exports.lifeCycleToSubscribedEvent = void 0;
const CDPSession_js_1 = require("../api/CDPSession.js");
const Errors_js_1 = require("../common/Errors.js");
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const Realm_js_1 = require("./Realm.js");
/**
 * @internal
 */
exports.lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
exports.cdpSessions = new Map();
/**
 * @internal
 */
class CdpSessionWrapper extends CDPSession_js_1.CDPSession {
    #context;
    #sessionId = Deferred_js_1.Deferred.create();
    #detached = false;
    constructor(context, sessionId) {
        super();
        this.#context = context;
        if (!this.#context.supportsCdp()) {
            return;
        }
        if (sessionId) {
            this.#sessionId.resolve(sessionId);
            exports.cdpSessions.set(sessionId, this);
        }
        else {
            context.connection
                .send('cdp.getSession', {
                context: context.id,
            })
                .then(session => {
                this.#sessionId.resolve(session.result.session);
                exports.cdpSessions.set(session.result.session, this);
            })
                .catch(err => {
                this.#sessionId.reject(err);
            });
        }
    }
    connection() {
        return undefined;
    }
    async send(method, ...paramArgs) {
        if (!this.#context.supportsCdp()) {
            throw new Error('CDP support is required for this feature. The current browser does not support CDP.');
        }
        if (this.#detached) {
            throw new Errors_js_1.TargetCloseError(`Protocol error (${method}): Session closed. Most likely the page has been closed.`);
        }
        const session = await this.#sessionId.valueOrThrow();
        const { result } = await this.#context.connection.send('cdp.sendCommand', {
            method: method,
            params: paramArgs[0],
            session,
        });
        return result.result;
    }
    async detach() {
        exports.cdpSessions.delete(this.id());
        if (!this.#detached && this.#context.supportsCdp()) {
            await this.#context.cdpSession.send('Target.detachFromTarget', {
                sessionId: this.id(),
            });
        }
        this.#detached = true;
    }
    id() {
        const val = this.#sessionId.value();
        return val instanceof Error || val === undefined ? '' : val;
    }
}
exports.CdpSessionWrapper = CdpSessionWrapper;
/**
 * Internal events that the BrowsingContext class emits.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
var BrowsingContextEvent;
(function (BrowsingContextEvent) {
    /**
     * Emitted on the top-level context, when a descendant context is created.
     */
    BrowsingContextEvent.Created = Symbol('BrowsingContext.created');
    /**
     * Emitted on the top-level context, when a descendant context or the
     * top-level context itself is destroyed.
     */
    BrowsingContextEvent.Destroyed = Symbol('BrowsingContext.destroyed');
})(BrowsingContextEvent || (exports.BrowsingContextEvent = BrowsingContextEvent = {}));
/**
 * @internal
 */
class BrowsingContext extends Realm_js_1.BidiRealm {
    #id;
    #url;
    #cdpSession;
    #parent;
    #browserName = '';
    constructor(connection, info, browserName) {
        super(connection);
        this.#id = info.context;
        this.#url = info.url;
        this.#parent = info.parent;
        this.#browserName = browserName;
        this.#cdpSession = new CdpSessionWrapper(this, undefined);
        this.on('browsingContext.domContentLoaded', this.#updateUrl.bind(this));
        this.on('browsingContext.fragmentNavigated', this.#updateUrl.bind(this));
        this.on('browsingContext.load', this.#updateUrl.bind(this));
    }
    supportsCdp() {
        return !this.#browserName.toLowerCase().includes('firefox');
    }
    #updateUrl(info) {
        this.#url = info.url;
    }
    createRealmForSandbox() {
        return new Realm_js_1.BidiRealm(this.connection);
    }
    get url() {
        return this.#url;
    }
    get id() {
        return this.#id;
    }
    get parent() {
        return this.#parent;
    }
    get cdpSession() {
        return this.#cdpSession;
    }
    async sendCdpCommand(method, ...paramArgs) {
        return await this.#cdpSession.send(method, ...paramArgs);
    }
    dispose() {
        this.removeAllListeners();
        this.connection.unregisterBrowsingContexts(this.#id);
        void this.#cdpSession.detach().catch(util_js_1.debugError);
    }
}
exports.BrowsingContext = BrowsingContext;
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