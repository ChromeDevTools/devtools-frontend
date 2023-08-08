/**
 * Copyright 2022 Google Inc. All rights reserved.
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
import { Browser as BrowserBase, } from '../../api/Browser.js';
import { BrowserContext } from './BrowserContext.js';
import { BrowsingContext, BrowsingContextEmittedEvents, } from './BrowsingContext.js';
import { BiDiBrowserTarget, BiDiBrowsingContextTarget, BiDiPageTarget, } from './Target.js';
import { debugError } from './utils.js';
/**
 * @internal
 */
export class Browser extends BrowserBase {
    // TODO: Update generator to include fully module
    static subscribeModules = [
        'browsingContext',
        'network',
        'log',
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
    ];
    static async create(opts) {
        let browserName = '';
        let browserVersion = '';
        // TODO: await until the connection is established.
        try {
            const { result } = await opts.connection.send('session.new', {
                capabilities: {
                    alwaysMatch: {
                        acceptInsecureCerts: opts.ignoreHTTPSErrors,
                    },
                },
            });
            browserName = result.capabilities.browserName ?? '';
            browserVersion = result.capabilities.browserVersion ?? '';
        }
        catch (err) {
            // Chrome does not support session.new.
            debugError(err);
        }
        await opts.connection.send('session.subscribe', {
            events: browserName.toLocaleLowerCase().includes('firefox')
                ? Browser.subscribeModules
                : [...Browser.subscribeModules, ...Browser.subscribeCdpEvents],
        });
        const browser = new Browser({
            ...opts,
            browserName,
            browserVersion,
        });
        await browser.#getTree();
        return browser;
    }
    #browserName = '';
    #browserVersion = '';
    #process;
    #closeCallback;
    #connection;
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
    constructor(opts) {
        super();
        this.#process = opts.process;
        this.#closeCallback = opts.closeCallback;
        this.#connection = opts.connection;
        this.#defaultViewport = opts.defaultViewport;
        this.#browserName = opts.browserName;
        this.#browserVersion = opts.browserVersion;
        this.#process?.once('close', () => {
            this.#connection.dispose();
            this.emit("disconnected" /* BrowserEmittedEvents.Disconnected */);
        });
        this.#defaultContext = new BrowserContext(this, {
            defaultViewport: this.#defaultViewport,
            isDefault: true,
        });
        this.#browserTarget = new BiDiBrowserTarget(this.#defaultContext);
        this.#contexts.push(this.#defaultContext);
        for (const [eventName, handler] of this.#connectionEventHandlers) {
            this.#connection.on(eventName, handler);
        }
    }
    #onContextDomLoaded(event) {
        const context = this.#connection.getBrowsingContext(event.context);
        context.url = event.url;
        const target = this.#targets.get(event.context);
        if (target) {
            this.emit("targetchanged" /* BrowserEmittedEvents.TargetChanged */, target);
        }
    }
    #onContextNavigation(event) {
        const context = this.#connection.getBrowsingContext(event.context);
        context.url = event.url;
        const target = this.#targets.get(event.context);
        if (target) {
            this.emit("targetchanged" /* BrowserEmittedEvents.TargetChanged */, target);
            target
                .browserContext()
                .emit("targetchanged" /* BrowserContextEmittedEvents.TargetChanged */, target);
        }
    }
    #onContextCreated(event) {
        const context = new BrowsingContext(this.#connection, event);
        this.#connection.registerBrowsingContexts(context);
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
        this.emit("targetcreated" /* BrowserEmittedEvents.TargetCreated */, target);
        target
            .browserContext()
            .emit("targetcreated" /* BrowserContextEmittedEvents.TargetCreated */, target);
        if (context.parent) {
            const topLevel = this.#connection.getTopLevelContext(context.parent);
            topLevel.emit(BrowsingContextEmittedEvents.Created, context);
        }
    }
    async #getTree() {
        const { result } = await this.#connection.send('browsingContext.getTree', {});
        for (const context of result.contexts) {
            this.#onContextCreated(context);
        }
    }
    async #onContextDestroyed(event) {
        const context = this.#connection.getBrowsingContext(event.context);
        const topLevelContext = this.#connection.getTopLevelContext(event.context);
        topLevelContext.emit(BrowsingContextEmittedEvents.Destroyed, context);
        const target = this.#targets.get(event.context);
        const page = await target?.page();
        await page?.close().catch(debugError);
        this.#targets.delete(event.context);
        if (target) {
            this.emit("targetdestroyed" /* BrowserEmittedEvents.TargetDestroyed */, target);
            target
                .browserContext()
                .emit("targetdestroyed" /* BrowserContextEmittedEvents.TargetDestroyed */, target);
        }
    }
    get connection() {
        return this.#connection;
    }
    wsEndpoint() {
        return this.#connection.url;
    }
    async close() {
        for (const [eventName, handler] of this.#connectionEventHandlers) {
            this.#connection.off(eventName, handler);
        }
        if (this.#connection.closed) {
            return;
        }
        // TODO: implement browser.close.
        // await this.#connection.send('browser.close', {});
        this.#connection.dispose();
        await this.#closeCallback?.call(null);
    }
    isConnected() {
        return !this.#connection.closed;
    }
    process() {
        return this.#process ?? null;
    }
    async createIncognitoBrowserContext(_options) {
        // TODO: implement incognito context https://github.com/w3c/webdriver-bidi/issues/289.
        const context = new BrowserContext(this, {
            defaultViewport: this.#defaultViewport,
            isDefault: false,
        });
        this.#contexts.push(context);
        return context;
    }
    async version() {
        return `${this.#browserName}/${this.#browserVersion}`;
    }
    /**
     * Returns an array of all open browser contexts. In a newly created browser, this will
     * return a single instance of {@link BrowserContext}.
     */
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
    /**
     * Returns the default browser context. The default browser context cannot be closed.
     */
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
}
//# sourceMappingURL=Browser.js.map