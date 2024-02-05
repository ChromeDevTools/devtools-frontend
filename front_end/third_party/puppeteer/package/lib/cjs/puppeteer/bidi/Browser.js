"use strict";
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiBrowser = void 0;
const Browser_js_1 = require("../api/Browser.js");
const Errors_js_1 = require("../common/Errors.js");
const util_js_1 = require("../common/util.js");
const BrowserContext_js_1 = require("./BrowserContext.js");
const BrowsingContext_js_1 = require("./BrowsingContext.js");
const Session_js_1 = require("./core/Session.js");
const Target_js_1 = require("./Target.js");
/**
 * @internal
 */
class BidiBrowser extends Browser_js_1.Browser {
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
        const session = await Session_js_1.Session.from(opts.connection, {
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
    #targets = new Map();
    #browserContexts = new WeakMap();
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
        this.#browserTarget = new Target_js_1.BiDiBrowserTarget(this);
        for (const context of this.#browserCore.userContexts) {
            this.#createBrowserContext(context);
        }
    }
    #initialize() {
        this.#browserCore.once('disconnected', () => {
            this.emit("disconnected" /* BrowserEvent.Disconnected */, undefined);
        });
        this.#process?.once('close', () => {
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
        throw new Errors_js_1.UnsupportedOperation();
    }
    #createBrowserContext(userContext) {
        const browserContext = new BrowserContext_js_1.BidiBrowserContext(this, userContext, {
            defaultViewport: this.#defaultViewport,
        });
        this.#browserContexts.set(userContext, browserContext);
        return browserContext;
    }
    #onContextDomLoaded(event) {
        const target = this.#targets.get(event.context);
        if (target) {
            this.emit("targetchanged" /* BrowserEvent.TargetChanged */, target);
            target.browserContext().emit("targetchanged" /* BrowserContextEvent.TargetChanged */, target);
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
        const context = new BrowsingContext_js_1.BrowsingContext(this.connection, event, this.#browserName);
        this.connection.registerBrowsingContexts(context);
        const browserContext = event.userContext === 'default'
            ? this.defaultBrowserContext()
            : this.browserContexts().find(browserContext => {
                return browserContext.id === event.userContext;
            });
        if (!browserContext) {
            throw new Error('Missing browser contexts');
        }
        const target = !context.parent
            ? new Target_js_1.BiDiPageTarget(browserContext, context)
            : new Target_js_1.BiDiBrowsingContextTarget(browserContext, context);
        this.#targets.set(event.context, target);
        this.emit("targetcreated" /* BrowserEvent.TargetCreated */, target);
        target.browserContext().emit("targetcreated" /* BrowserContextEvent.TargetCreated */, target);
        if (context.parent) {
            const topLevel = this.connection.getTopLevelContext(context.parent);
            topLevel.emit(BrowsingContext_js_1.BrowsingContextEvent.Created, context);
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
        topLevelContext.emit(BrowsingContext_js_1.BrowsingContextEvent.Destroyed, context);
        const target = this.#targets.get(event.context);
        const page = await target?.page();
        await page?.close().catch(util_js_1.debugError);
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
            (0, util_js_1.debugError)(error);
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
    async createBrowserContext(_options) {
        const userContext = await this.#browserCore.createUserContext();
        return this.#createBrowserContext(userContext);
    }
    async version() {
        return `${this.#browserName}/${this.#browserVersion}`;
    }
    browserContexts() {
        return [...this.#browserCore.userContexts].map(context => {
            return this.#browserContexts.get(context);
        });
    }
    defaultBrowserContext() {
        return this.#browserContexts.get(this.#browserCore.defaultUserContext);
    }
    newPage() {
        return this.defaultBrowserContext().newPage();
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
            (0, util_js_1.debugError)(error);
        }
        finally {
            this.connection.dispose();
        }
    }
    get debugInfo() {
        return {
            pendingProtocolErrors: this.connection.getPendingProtocolErrors(),
        };
    }
}
exports.BidiBrowser = BidiBrowser;
//# sourceMappingURL=Browser.js.map