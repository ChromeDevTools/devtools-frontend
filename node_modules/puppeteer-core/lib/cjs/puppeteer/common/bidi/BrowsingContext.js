"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWaitUntilSingle = exports.BrowsingContext = exports.BrowsingContextEmittedEvents = exports.CDPSessionWrapper = exports.cdpSessions = exports.lifeCycleToSubscribedEvent = void 0;
const assert_js_1 = require("../../util/assert.js");
const Deferred_js_1 = require("../../util/Deferred.js");
const Connection_js_1 = require("../Connection.js");
const Errors_js_1 = require("../Errors.js");
const util_js_1 = require("../util.js");
const Realm_js_1 = require("./Realm.js");
const utils_js_1 = require("./utils.js");
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
const lifeCycleToReadinessState = new Map([
    ['load', "complete" /* Bidi.BrowsingContext.ReadinessState.Complete */],
    ['domcontentloaded', "interactive" /* Bidi.BrowsingContext.ReadinessState.Interactive */],
]);
/**
 * @internal
 */
exports.cdpSessions = new Map();
/**
 * @internal
 */
class CDPSessionWrapper extends Connection_js_1.CDPSession {
    #context;
    #sessionId = Deferred_js_1.Deferred.create();
    #detached = false;
    constructor(context, sessionId) {
        super();
        this.#context = context;
        if (!this.#context.supportsCDP()) {
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
        if (!this.#context.supportsCDP()) {
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
        if (this.#context.supportsCDP()) {
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
exports.CDPSessionWrapper = CDPSessionWrapper;
/**
 * Internal events that the BrowsingContext class emits.
 *
 * @internal
 */
exports.BrowsingContextEmittedEvents = {
    /**
     * Emitted on the top-level context, when a descendant context is created.
     */
    Created: Symbol('BrowsingContext.created'),
    /**
     * Emitted on the top-level context, when a descendant context or the
     * top-level context itself is destroyed.
     */
    Destroyed: Symbol('BrowsingContext.destroyed'),
};
/**
 * @internal
 */
class BrowsingContext extends Realm_js_1.Realm {
    #id;
    #url;
    #cdpSession;
    #parent;
    #browserName = '';
    constructor(connection, info, browserName) {
        super(connection, info.context);
        this.connection = connection;
        this.#id = info.context;
        this.#url = info.url;
        this.#parent = info.parent;
        this.#browserName = browserName;
        this.#cdpSession = new CDPSessionWrapper(this, undefined);
        this.on('browsingContext.domContentLoaded', this.#updateUrl.bind(this));
        this.on('browsingContext.load', this.#updateUrl.bind(this));
    }
    supportsCDP() {
        return !this.#browserName.toLowerCase().includes('firefox');
    }
    #updateUrl(info) {
        this.url = info.url;
    }
    createSandboxRealm(sandbox) {
        return new Realm_js_1.Realm(this.connection, this.#id, sandbox);
    }
    get url() {
        return this.#url;
    }
    set url(value) {
        this.#url = value;
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
    navigated(url) {
        this.#url = url;
    }
    async goto(url, options) {
        const { waitUntil = 'load', timeout } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        try {
            const { result } = await (0, util_js_1.waitWithTimeout)(this.connection.send('browsingContext.navigate', {
                url: url,
                context: this.#id,
                wait: readinessState,
            }), 'Navigation', timeout);
            this.#url = result.url;
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
    async reload(options) {
        const { waitUntil = 'load', timeout } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        await (0, util_js_1.waitWithTimeout)(this.connection.send('browsingContext.reload', {
            context: this.#id,
            wait: readinessState,
        }), 'Navigation', timeout);
    }
    async setContent(html, options) {
        const { waitUntil = 'load', timeout } = options;
        const waitUntilEvent = exports.lifeCycleToSubscribedEvent.get(getWaitUntilSingle(waitUntil));
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
        return this.#cdpSession.send(method, ...paramArgs);
    }
    title() {
        return this.evaluate(() => {
            return document.title;
        });
    }
    dispose() {
        this.removeAllListeners();
        this.connection.unregisterBrowsingContexts(this.#id);
        void this.#cdpSession.detach().catch(utils_js_1.debugError);
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