/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Browser, } from '../api/Browser.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { debugError } from '../common/util.js';
import { BidiBrowserContext } from './BrowserContext.js';
import { BrowsingContext, BrowsingContextEvent } from './BrowsingContext.js';
import { Session } from './core/Session.js';
import { BiDiBrowserTarget, BiDiBrowsingContextTarget, BiDiPageTarget, } from './Target.js';
/**
 * @internal
 */
export class BidiBrowser extends Browser {
    protocol = 'webDriverBiDi';
    // TODO: Update generator to include fully module
    static subscribeModules = [
        'browsingContext',
        'network',
        'log',
        'script',
    ];
    static subscribeCdpEvents = [
        // Coverage
        'cdp.Debugger.scriptParsed',
        'cdp.CSS.styleSheetAdded',
        'cdp.Runtime.executionContextsCleared',
        // Tracing
        'cdp.Tracing.tracingComplete',
        // TODO: subscribe to all CDP events in the future.
        'cdp.Network.requestWillBeSent',
        'cdp.Debugger.scriptParsed',
        'cdp.Page.screencastFrame',
    ];
    static async create(opts) {
        const session = await Session.from(opts.connection, {
            alwaysMatch: {
                acceptInsecureCerts: opts.ignoreHTTPSErrors,
                webSocketUrl: true,
            },
        });
        await session.subscribe(session.capabilities.browserName.toLocaleLowerCase().includes('firefox')
            ? BidiBrowser.subscribeModules
            : [...BidiBrowser.subscribeModules, ...BidiBrowser.subscribeCdpEvents]);
        const browser = new BidiBrowser(session.browser, opts);
        browser.#initialize();
        await browser.#getTree();
        return browser;
    }
    #process;
    #closeCallback;
    #browserCore;
    #defaultViewport;
    #defaultContext;
    #targets = new Map();
    #contexts = [];
    #browserTarget;
    #connectionEventHandlers = new Map([
        ['browsingContext.contextCreated', this.#onContextCreated.bind(this)],
        ['browsingContext.contextDestroyed', this.#onContextDestroyed.bind(this)],
        ['browsingContext.domContentLoaded', this.#onContextDomLoaded.bind(this)],
        ['browsingContext.fragmentNavigated', this.#onContextNavigation.bind(this)],
        ['browsingContext.navigationStarted', this.#onContextNavigation.bind(this)],
    ]);
    constructor(browserCore, opts) {
        super();
        this.#process = opts.process;
        this.#closeCallback = opts.closeCallback;
        this.#browserCore = browserCore;
        this.#defaultViewport = opts.defaultViewport;
        this.#defaultContext = new BidiBrowserContext(this, {
            defaultViewport: this.#defaultViewport,
            isDefault: true,
        });
        this.#browserTarget = new BiDiBrowserTarget(this.#defaultContext);
        this.#contexts.push(this.#defaultContext);
    }
    #initialize() {
        this.#browserCore.once('disconnected', () => {
            this.emit("disconnected" /* BrowserEvent.Disconnected */, undefined);
        });
        this.#process?.once('close', async () => {
            this.#browserCore.dispose('Browser process exited.', true);
            this.connection.dispose();
        });
        for (const [eventName, handler] of this.#connectionEventHandlers) {
            this.connection.on(eventName, handler);
        }
    }
    get #browserName() {
        return this.#browserCore.session.capabilities.browserName;
    }
    get #browserVersion() {
        return this.#browserCore.session.capabilities.browserVersion;
    }
    userAgent() {
        throw new UnsupportedOperation();
    }
    #onContextDomLoaded(event) {
        const target = this.#targets.get(event.context);
        if (target) {
            this.emit("targetchanged" /* BrowserEvent.TargetChanged */, target);
        }
    }
    #onContextNavigation(event) {
        const target = this.#targets.get(event.context);
        if (target) {
            this.emit("targetchanged" /* BrowserEvent.TargetChanged */, target);
            target.browserContext().emit("targetchanged" /* BrowserContextEvent.TargetChanged */, target);
        }
    }
    #onContextCreated(event) {
        const context = new BrowsingContext(this.connection, event, this.#browserName);
        this.connection.registerBrowsingContexts(context);
        // TODO: once more browsing context types are supported, this should be
        // updated to support those. Currently, all top-level contexts are treated
        // as pages.
        const browserContext = this.browserContexts().at(-1);
        if (!browserContext) {
            throw new Error('Missing browser contexts');
        }
        const target = !context.parent
            ? new BiDiPageTarget(browserContext, context)
            : new BiDiBrowsingContextTarget(browserContext, context);
        this.#targets.set(event.context, target);
        this.emit("targetcreated" /* BrowserEvent.TargetCreated */, target);
        target.browserContext().emit("targetcreated" /* BrowserContextEvent.TargetCreated */, target);
        if (context.parent) {
            const topLevel = this.connection.getTopLevelContext(context.parent);
            topLevel.emit(BrowsingContextEvent.Created, context);
        }
    }
    async #getTree() {
        const { result } = await this.connection.send('browsingContext.getTree', {});
        for (const context of result.contexts) {
            this.#onContextCreated(context);
        }
    }
    async #onContextDestroyed(event) {
        const context = this.connection.getBrowsingContext(event.context);
        const topLevelContext = this.connection.getTopLevelContext(event.context);
        topLevelContext.emit(BrowsingContextEvent.Destroyed, context);
        const target = this.#targets.get(event.context);
        const page = await target?.page();
        await page?.close().catch(debugError);
        this.#targets.delete(event.context);
        if (target) {
            this.emit("targetdestroyed" /* BrowserEvent.TargetDestroyed */, target);
            target.browserContext().emit("targetdestroyed" /* BrowserContextEvent.TargetDestroyed */, target);
        }
    }
    get connection() {
        // SAFETY: We only have one implementation.
        return this.#browserCore.session.connection;
    }
    wsEndpoint() {
        return this.connection.url;
    }
    async close() {
        for (const [eventName, handler] of this.#connectionEventHandlers) {
            this.connection.off(eventName, handler);
        }
        if (this.connection.closed) {
            return;
        }
        try {
            await this.#browserCore.close();
            await this.#closeCallback?.call(null);
        }
        catch (error) {
            // Fail silently.
            debugError(error);
        }
        finally {
            this.connection.dispose();
        }
    }
    get connected() {
        return !this.#browserCore.disposed;
    }
    process() {
        return this.#process ?? null;
    }
    async createIncognitoBrowserContext(_options) {
        // TODO: implement incognito context https://github.com/w3c/webdriver-bidi/issues/289.
        const context = new BidiBrowserContext(this, {
            defaultViewport: this.#defaultViewport,
            isDefault: false,
        });
        this.#contexts.push(context);
        return context;
    }
    async version() {
        return `${this.#browserName}/${this.#browserVersion}`;
    }
    browserContexts() {
        // TODO: implement incognito context https://github.com/w3c/webdriver-bidi/issues/289.
        return this.#contexts;
    }
    async _closeContext(browserContext) {
        this.#contexts = this.#contexts.filter(c => {
            return c !== browserContext;
        });
        for (const target of browserContext.targets()) {
            const page = await target?.page();
            await page?.close().catch(error => {
                debugError(error);
            });
        }
    }
    defaultBrowserContext() {
        return this.#defaultContext;
    }
    newPage() {
        return this.#defaultContext.newPage();
    }
    targets() {
        return [this.#browserTarget, ...Array.from(this.#targets.values())];
    }
    _getTargetById(id) {
        const target = this.#targets.get(id);
        if (!target) {
            throw new Error('Target not found');
        }
        return target;
    }
    target() {
        return this.#browserTarget;
    }
    async disconnect() {
        try {
            await this.#browserCore.session.end();
        }
        catch (error) {
            // Fail silently.
            debugError(error);
        }
        finally {
            this.connection.dispose();
        }
    }
}
//# sourceMappingURL=Browser.js.map