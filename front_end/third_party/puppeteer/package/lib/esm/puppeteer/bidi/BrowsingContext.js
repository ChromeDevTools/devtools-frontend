import { CDPSession } from '../api/CDPSession.js';
import { TargetCloseError } from '../common/Errors.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { BidiRealm } from './Realm.js';
import { debugError } from './util.js';
/**
 * @internal
 */
export const lifeCycleToSubscribedEvent = new Map([
    ['load', 'browsingContext.load'],
    ['domcontentloaded', 'browsingContext.domContentLoaded'],
]);
/**
 * @internal
 */
export const cdpSessions = new Map();
/**
 * @internal
 */
export class CdpSessionWrapper extends CDPSession {
    #context;
    #sessionId = Deferred.create();
    #detached = false;
    constructor(context, sessionId) {
        super();
        this.#context = context;
        if (!this.#context.supportsCdp()) {
            return;
        }
        if (sessionId) {
            this.#sessionId.resolve(sessionId);
            cdpSessions.set(sessionId, this);
        }
        else {
            context.connection
                .send('cdp.getSession', {
                context: context.id,
            })
                .then(session => {
                this.#sessionId.resolve(session.result.session);
                cdpSessions.set(session.result.session, this);
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
            throw new TargetCloseError(`Protocol error (${method}): Session closed. Most likely the page has been closed.`);
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
        cdpSessions.delete(this.id());
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
/**
 * Internal events that the BrowsingContext class emits.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export var BrowsingContextEvent;
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
})(BrowsingContextEvent || (BrowsingContextEvent = {}));
/**
 * @internal
 */
export class BrowsingContext extends BidiRealm {
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
        return new BidiRealm(this.connection);
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
        void this.#cdpSession.detach().catch(debugError);
    }
}
/**
 * @internal
 */
export function getWaitUntilSingle(event) {
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
    assert(waitUntilSingle, `Invalid waitUntil option ${waitUntilSingle}`);
    return waitUntilSingle;
}
//# sourceMappingURL=BrowsingContext.js.map