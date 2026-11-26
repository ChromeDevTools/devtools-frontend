/**
 * @license
 * Copyright 2019 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Target, TargetType } from '../api/Target.js';
import { WebWorkerEvent } from '../api/WebWorker.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { TargetCloseError } from '../common/Errors.js';
import { Deferred } from '../util/Deferred.js';
import { CdpPage } from './Page.js';
import { CdpWebWorker } from './WebWorker.js';
/**
 * @internal
 */
export var InitializationStatus;
(function (InitializationStatus) {
    InitializationStatus["SUCCESS"] = "success";
    InitializationStatus["ABORTED"] = "aborted";
})(InitializationStatus || (InitializationStatus = {}));
/**
 * @internal
 */
export class CdpTarget extends Target {
    #browserContext;
    #session;
    #targetInfo;
    #targetManager;
    #sessionFactory;
    #logger;
    #childTargets = new Set();
    #closePromise;
    _initializedDeferred = Deferred.create();
    _isClosedDeferred = Deferred.create();
    _targetId;
    _asPagePromise;
    /** @internal */
    pagePromise;
    /**
     * To initialize the target for use, call initialize.
     *
     * @internal
     */
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory, logger) {
        super(logger);
        this.#session = session;
        this.#targetManager = targetManager;
        this.#targetInfo = targetInfo;
        this.#browserContext = browserContext;
        this._targetId = targetInfo.targetId;
        this.#sessionFactory = sessionFactory;
        this.#logger = logger;
        if (this.#session) {
            this.#session.setTarget(this);
        }
    }
    async asPage() {
        if (this.pagePromise) {
            const page = await this.pagePromise;
            if (page) {
                return page;
            }
        }
        if (!this._asPagePromise) {
            const session = this._session();
            this._asPagePromise = (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                return CdpPage._create(client, this, null, this.#logger);
            });
        }
        return (await this._asPagePromise) ?? null;
    }
    _subtype() {
        return this.#targetInfo.subtype;
    }
    _session() {
        return this.#session;
    }
    _setSession(session) {
        this.#session = session;
        this.#session.setTarget(this);
    }
    _addChildTarget(target) {
        this.#childTargets.add(target);
    }
    _removeChildTarget(target) {
        this.#childTargets.delete(target);
    }
    _childTargets() {
        return this.#childTargets;
    }
    _sessionFactory() {
        if (!this.#sessionFactory) {
            throw new Error('sessionFactory is not initialized');
        }
        return this.#sessionFactory;
    }
    createCDPSession() {
        if (!this.#sessionFactory) {
            throw new Error('sessionFactory is not initialized');
        }
        return this.#sessionFactory(false).then(session => {
            session.setTarget(this);
            return session;
        });
    }
    url() {
        return this.#targetInfo.url;
    }
    type() {
        const type = this.#targetInfo.type;
        switch (type) {
            case 'page':
                return TargetType.PAGE;
            case 'background_page':
                return TargetType.BACKGROUND_PAGE;
            case 'service_worker':
                return TargetType.SERVICE_WORKER;
            case 'shared_worker':
                return TargetType.SHARED_WORKER;
            case 'browser':
                return TargetType.BROWSER;
            case 'webview':
                return TargetType.WEBVIEW;
            case 'tab':
                return TargetType.TAB;
            default:
                return TargetType.OTHER;
        }
    }
    _targetManager() {
        if (!this.#targetManager) {
            throw new Error('targetManager is not initialized');
        }
        return this.#targetManager;
    }
    _getTargetInfo() {
        return this.#targetInfo;
    }
    browser() {
        if (!this.#browserContext) {
            throw new Error('browserContext is not initialized');
        }
        return this.#browserContext.browser();
    }
    browserContext() {
        if (!this.#browserContext) {
            throw new Error('browserContext is not initialized');
        }
        return this.#browserContext;
    }
    opener() {
        const { openerId } = this.#targetInfo;
        if (!openerId) {
            return;
        }
        return this.browser()
            .targets()
            .find(target => {
            return target._targetId === openerId;
        });
    }
    async close() {
        // Chrome closes the whole page when it closes the target of a frame.
        if (this.#targetInfo.type === 'iframe') {
            throw new Error('The target of a frame does not support closing');
        }
        if (this._isClosedDeferred.resolved()) {
            return;
        }
        // Concurrent calls share one close operation, because a second
        // `Target.closeTarget` fails if the target is already gone.
        this.#closePromise ??= this.#close().finally(() => {
            this.#closePromise = undefined;
        });
        await this.#closePromise;
    }
    async #close() {
        await this.browser()._closeTarget(this._targetId);
        if (this.#targetInfo.type === 'service_worker') {
            // Chrome reports a closed service worker as destroyed only after the
            // sessions attached to it detach.
            const sessions = await this._attachedSessions();
            await Promise.all(sessions.map(session => {
                return this.#detach(session);
            }));
        }
        await this._isClosedDeferred.valueOrThrow();
    }
    async #detach(session) {
        if (session.detached) {
            return;
        }
        // `session.detach()` sends the command on the connection, which fails for
        // a session attached through a page. `parentSession()` returns the session
        // itself if it was attached through the connection.
        const parentSession = session.parentSession();
        try {
            await (parentSession === session ? session.connection() : parentSession)?.send('Target.detachFromTarget', { sessionId: session.id() });
        }
        catch (error) {
            // Chrome might have detached the session already, for example because
            // its page closed.
            if (!session.detached) {
                throw error;
            }
        }
    }
    /**
     * Returns the sessions that Puppeteer keeps attached to the target.
     */
    async _attachedSessions() {
        return this._targetManager().getAttachedSessions(this._targetId);
    }
    /**
     * Whether `close()` is closing the target.
     */
    _isClosing() {
        return this.#closePromise !== undefined;
    }
    _targetInfoChanged(targetInfo) {
        this.#targetInfo = targetInfo;
        this._checkIfInitialized();
    }
    _initialize() {
        this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
    }
    _isTargetExposed() {
        return this.type() !== TargetType.TAB && !this._subtype();
    }
    _checkIfInitialized() {
        if (!this._initializedDeferred.resolved()) {
            this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
        }
    }
}
/**
 * @internal
 */
export class PageTarget extends CdpTarget {
    #defaultViewport;
    constructor(targetInfo, session, browserContext, targetManager, sessionFactory, defaultViewport, logger) {
        super(targetInfo, session, browserContext, targetManager, sessionFactory, logger);
        this.#defaultViewport = defaultViewport ?? undefined;
    }
    _initialize() {
        void this._initializedDeferred
            .valueOrThrow()
            .then(async (result) => {
            if (result === InitializationStatus.ABORTED) {
                return;
            }
            const opener = this.opener();
            if (!(opener instanceof PageTarget)) {
                return;
            }
            if (!opener || !opener.pagePromise || this.type() !== 'page') {
                return true;
            }
            const openerPage = await opener.pagePromise;
            if (!openerPage.listenerCount("popup" /* PageEvent.Popup */)) {
                return true;
            }
            const popupPage = await this.page();
            openerPage.emit("popup" /* PageEvent.Popup */, popupPage);
            return true;
        })
            .catch(error => {
            this.logger?.(DEBUG_PREFIXES.error)?.(error);
        });
        this._checkIfInitialized();
    }
    async page() {
        if (!this.pagePromise) {
            const session = this._session();
            this.pagePromise = (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                return CdpPage._create(client, this, this.#defaultViewport ?? null, this.logger);
            });
        }
        return (await this.pagePromise) ?? null;
    }
    _checkIfInitialized() {
        if (this._initializedDeferred.resolved()) {
            return;
        }
        if (this._getTargetInfo().url !== '') {
            this._initializedDeferred.resolve(InitializationStatus.SUCCESS);
        }
    }
}
/**
 * @internal
 */
export class DevToolsTarget extends PageTarget {
}
/**
 * @internal
 */
export class WorkerTarget extends CdpTarget {
    #workerPromise;
    async worker() {
        if (!this.#workerPromise) {
            // `close()` detaches the sessions that are attached when Chrome closes
            // the target, so a session attached later would keep a closed service
            // worker alive.
            if (this._isClosing()) {
                throw new TargetCloseError('Target closed');
            }
            const session = this._session();
            this.#workerPromise = (session
                ? Promise.resolve(session)
                : this._sessionFactory()(/* isAutoAttachEmulated=*/ false)).then(client => {
                // Service and shared workers create their own NetworkManager.
                const worker = new CdpWebWorker(client, this, () => { } /* exceptionThrown */, this.logger);
                this.#bubbleConsoleMessages(worker);
                return worker;
            });
        }
        return await this.#workerPromise;
    }
    async _attachedSessions() {
        const sessions = new Set(await super._attachedSessions());
        // Puppeteer detaches from service workers unless network rules are set,
        // so `worker()` may attach a session of its own. A failed `worker()` call
        // already rejected for its caller.
        const worker = await this.#workerPromise?.catch(() => {
            return undefined;
        });
        if (worker) {
            sessions.add(worker.client);
        }
        return [...sessions];
    }
    /**
     * Service and shared workers are not owned by a page, so their console
     * messages are bubbled up to the browser context and the browser here.
     */
    #bubbleConsoleMessages(worker) {
        worker.internalEmitter.on(WebWorkerEvent.Console, message => {
            const context = this.browserContext();
            const browser = this.browser();
            const hasListeners = worker.listenerCount(WebWorkerEvent.Console) > 0 ||
                context.listenerCount("console" /* BrowserContextEvent.Console */) > 0 ||
                browser.listenerCount("console" /* BrowserEvent.Console */) > 0;
            if (!hasListeners) {
                // eslint-disable-next-line max-len -- The comment is long.
                // eslint-disable-next-line @puppeteer/use-using -- These are not owned by this function.
                for (const arg of message.args()) {
                    void arg.dispose().catch(error => {
                        this.logger?.(DEBUG_PREFIXES.error)?.(error);
                    });
                }
                return;
            }
            context.emit("console" /* BrowserContextEvent.Console */, message);
            browser.emit("console" /* BrowserEvent.Console */, message);
        });
    }
}
/**
 * @internal
 */
export class OtherTarget extends CdpTarget {
}
//# sourceMappingURL=Target.js.map