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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        function next() {
            while (env.stack.length) {
                var rec = env.stack.pop();
                try {
                    var result = rec.dispose && rec.dispose.call(rec.value);
                    if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                catch (e) {
                    fail(e);
                }
            }
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { delay, filter, filterAsync, first, firstValueFrom, from, fromEvent, map, merge, of, raceWith, startWith, switchMap, } from '../../third_party/rxjs/rxjs.js';
import { TargetCloseError } from '../common/Errors.js';
import { EventEmitter, } from '../common/EventEmitter.js';
import { NetworkManagerEvent } from '../common/NetworkManagerEvents.js';
import { paperFormats, } from '../common/PDFOptions.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { debugError, importFSPromises, isNumber, isString, timeout, withSourcePuppeteerURLIfNone, } from '../common/util.js';
import { assert } from '../util/assert.js';
import { guarded } from '../util/decorators.js';
import { AsyncDisposableStack, asyncDisposeSymbol, DisposableStack, disposeSymbol, } from '../util/disposable.js';
import { FunctionLocator, Locator, NodeLocator, } from './locators/locators.js';
/**
 * @internal
 */
export function setDefaultScreenshotOptions(options) {
    options.optimizeForSpeed ??= false;
    options.type ??= 'png';
    options.fromSurface ??= true;
    options.fullPage ??= false;
    options.omitBackground ??= false;
    options.encoding ??= 'binary';
    options.captureBeyondViewport ??= true;
    options.allowViewportExpansion ??= options.captureBeyondViewport;
}
/**
 * Page provides methods to interact with a single tab or
 * {@link https://developer.chrome.com/extensions/background_pages | extension background page}
 * in the browser.
 *
 * :::note
 *
 * One Browser instance might have multiple Page instances.
 *
 * :::
 *
 * @example
 * This example creates a page, navigates it to a URL, and then saves a screenshot:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   await page.screenshot({path: 'screenshot.png'});
 *   await browser.close();
 * })();
 * ```
 *
 * The Page class extends from Puppeteer's {@link EventEmitter} class and will
 * emit various events which are documented in the {@link PageEvent} enum.
 *
 * @example
 * This example logs a message for a single page `load` event:
 *
 * ```ts
 * page.once('load', () => console.log('Page loaded!'));
 * ```
 *
 * To unsubscribe from events use the {@link EventEmitter.off} method:
 *
 * ```ts
 * function logRequest(interceptedRequest) {
 *   console.log('A request was made:', interceptedRequest.url());
 * }
 * page.on('request', logRequest);
 * // Sometime later...
 * page.off('request', logRequest);
 * ```
 *
 * @public
 */
let Page = (() => {
    let _classSuper = EventEmitter;
    let _instanceExtraInitializers = [];
    let _screenshot_decorators;
    return class Page extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(this, null, _screenshot_decorators, { kind: "method", name: "screenshot", static: false, private: false, access: { has: obj => "screenshot" in obj, get: obj => obj.screenshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        /**
         * @internal
         */
        _isDragging = (__runInitializers(this, _instanceExtraInitializers), false);
        /**
         * @internal
         */
        _timeoutSettings = new TimeoutSettings();
        #requestHandlers = new WeakMap();
        /**
         * @internal
         */
        constructor() {
            super();
        }
        /**
         * `true` if the service worker are being bypassed, `false` otherwise.
         */
        isServiceWorkerBypassed() {
            throw new Error('Not implemented');
        }
        /**
         * `true` if drag events are being intercepted, `false` otherwise.
         *
         * @deprecated We no longer support intercepting drag payloads. Use the new
         * drag APIs found on {@link ElementHandle} to drag (or just use the
         * {@link Page.mouse}).
         */
        isDragInterceptionEnabled() {
            throw new Error('Not implemented');
        }
        /**
         * `true` if the page has JavaScript enabled, `false` otherwise.
         */
        isJavaScriptEnabled() {
            throw new Error('Not implemented');
        }
        /**
         * Listen to page events.
         *
         * @remarks
         * This method exists to define event typings and handle proper wireup of
         * cooperative request interception. Actual event listening and dispatching is
         * delegated to {@link EventEmitter}.
         *
         * @internal
         */
        on(type, handler) {
            if (type !== "request" /* PageEvent.Request */) {
                return super.on(type, handler);
            }
            let wrapper = this.#requestHandlers.get(handler);
            if (wrapper === undefined) {
                wrapper = (event) => {
                    event.enqueueInterceptAction(() => {
                        return handler(event);
                    });
                };
                this.#requestHandlers.set(handler, wrapper);
            }
            return super.on(type, wrapper);
        }
        /**
         * @internal
         */
        off(type, handler) {
            if (type === "request" /* PageEvent.Request */) {
                handler =
                    this.#requestHandlers.get(handler) || handler;
            }
            return super.off(type, handler);
        }
        waitForFileChooser() {
            throw new Error('Not implemented');
        }
        async setGeolocation() {
            throw new Error('Not implemented');
        }
        /**
         * A target this page was created from.
         */
        target() {
            throw new Error('Not implemented');
        }
        /**
         * Creates a Chrome Devtools Protocol session attached to the page.
         */
        createCDPSession() {
            throw new Error('Not implemented');
        }
        /**
         * {@inheritDoc Touchscreen}
         */
        get touchscreen() {
            throw new Error('Not implemented');
        }
        /**
         * All of the dedicated {@link
         * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API |
         * WebWorkers} associated with the page.
         *
         * @remarks
         * This does not contain ServiceWorkers
         */
        workers() {
            throw new Error('Not implemented');
        }
        async setRequestInterception() {
            throw new Error('Not implemented');
        }
        async setBypassServiceWorker() {
            throw new Error('Not implemented');
        }
        async setDragInterception() {
            throw new Error('Not implemented');
        }
        setOfflineMode() {
            throw new Error('Not implemented');
        }
        emulateNetworkConditions() {
            throw new Error('Not implemented');
        }
        locator(selectorOrFunc) {
            if (typeof selectorOrFunc === 'string') {
                return NodeLocator.create(this, selectorOrFunc);
            }
            else {
                return FunctionLocator.create(this, selectorOrFunc);
            }
        }
        /**
         * A shortcut for {@link Locator.race} that does not require static imports.
         *
         * @internal
         */
        locatorRace(locators) {
            return Locator.race(locators);
        }
        /**
         * Runs `document.querySelector` within the page. If no element matches the
         * selector, the return value resolves to `null`.
         *
         * @param selector - A `selector` to query page for
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * to query page for.
         */
        async $(selector) {
            return await this.mainFrame().$(selector);
        }
        /**
         * The method runs `document.querySelectorAll` within the page. If no elements
         * match the selector, the return value resolves to `[]`.
         * @remarks
         * Shortcut for {@link Frame.$$ | Page.mainFrame().$$(selector) }.
         * @param selector - A `selector` to query page for
         */
        async $$(selector) {
            return await this.mainFrame().$$(selector);
        }
        /**
         * @remarks
         *
         * The only difference between {@link Page.evaluate | page.evaluate} and
         * `page.evaluateHandle` is that `evaluateHandle` will return the value
         * wrapped in an in-page object.
         *
         * If the function passed to `page.evaluateHandle` returns a Promise, the
         * function will wait for the promise to resolve and return its value.
         *
         * You can pass a string instead of a function (although functions are
         * recommended as they are easier to debug and use with TypeScript):
         *
         * @example
         *
         * ```ts
         * const aHandle = await page.evaluateHandle('document');
         * ```
         *
         * @example
         * {@link JSHandle} instances can be passed as arguments to the `pageFunction`:
         *
         * ```ts
         * const aHandle = await page.evaluateHandle(() => document.body);
         * const resultHandle = await page.evaluateHandle(
         *   body => body.innerHTML,
         *   aHandle
         * );
         * console.log(await resultHandle.jsonValue());
         * await resultHandle.dispose();
         * ```
         *
         * Most of the time this function returns a {@link JSHandle},
         * but if `pageFunction` returns a reference to an element,
         * you instead get an {@link ElementHandle} back:
         *
         * @example
         *
         * ```ts
         * const button = await page.evaluateHandle(() =>
         *   document.querySelector('button')
         * );
         * // can call `click` because `button` is an `ElementHandle`
         * await button.click();
         * ```
         *
         * The TypeScript definitions assume that `evaluateHandle` returns
         * a `JSHandle`, but if you know it's going to return an
         * `ElementHandle`, pass it as the generic argument:
         *
         * ```ts
         * const button = await page.evaluateHandle<ElementHandle>(...);
         * ```
         *
         * @param pageFunction - a function that is run within the page
         * @param args - arguments to be passed to the pageFunction
         */
        async evaluateHandle(pageFunction, ...args) {
            pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
            return await this.mainFrame().evaluateHandle(pageFunction, ...args);
        }
        /**
         * This method runs `document.querySelector` within the page and passes the
         * result as the first argument to the `pageFunction`.
         *
         * @remarks
         *
         * If no element is found matching `selector`, the method will throw an error.
         *
         * If `pageFunction` returns a promise `$eval` will wait for the promise to
         * resolve and then return its value.
         *
         * @example
         *
         * ```ts
         * const searchValue = await page.$eval('#search', el => el.value);
         * const preloadHref = await page.$eval('link[rel=preload]', el => el.href);
         * const html = await page.$eval('.main-container', el => el.outerHTML);
         * ```
         *
         * If you are using TypeScript, you may have to provide an explicit type to the
         * first argument of the `pageFunction`.
         * By default it is typed as `Element`, but you may need to provide a more
         * specific sub-type:
         *
         * @example
         *
         * ```ts
         * // if you don't provide HTMLInputElement here, TS will error
         * // as `value` is not on `Element`
         * const searchValue = await page.$eval(
         *   '#search',
         *   (el: HTMLInputElement) => el.value
         * );
         * ```
         *
         * The compiler should be able to infer the return type
         * from the `pageFunction` you provide. If it is unable to, you can use the generic
         * type to tell the compiler what return type you expect from `$eval`:
         *
         * @example
         *
         * ```ts
         * // The compiler can infer the return type in this case, but if it can't
         * // or if you want to be more explicit, provide it as the generic type.
         * const searchValue = await page.$eval<string>(
         *   '#search',
         *   (el: HTMLInputElement) => el.value
         * );
         * ```
         *
         * @param selector - the
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * to query for
         * @param pageFunction - the function to be evaluated in the page context.
         * Will be passed the result of `document.querySelector(selector)` as its
         * first argument.
         * @param args - any additional arguments to pass through to `pageFunction`.
         *
         * @returns The result of calling `pageFunction`. If it returns an element it
         * is wrapped in an {@link ElementHandle}, else the raw value itself is
         * returned.
         */
        async $eval(selector, pageFunction, ...args) {
            pageFunction = withSourcePuppeteerURLIfNone(this.$eval.name, pageFunction);
            return await this.mainFrame().$eval(selector, pageFunction, ...args);
        }
        /**
         * This method runs `Array.from(document.querySelectorAll(selector))` within
         * the page and passes the result as the first argument to the `pageFunction`.
         *
         * @remarks
         * If `pageFunction` returns a promise `$$eval` will wait for the promise to
         * resolve and then return its value.
         *
         * @example
         *
         * ```ts
         * // get the amount of divs on the page
         * const divCount = await page.$$eval('div', divs => divs.length);
         *
         * // get the text content of all the `.options` elements:
         * const options = await page.$$eval('div > span.options', options => {
         *   return options.map(option => option.textContent);
         * });
         * ```
         *
         * If you are using TypeScript, you may have to provide an explicit type to the
         * first argument of the `pageFunction`.
         * By default it is typed as `Element[]`, but you may need to provide a more
         * specific sub-type:
         *
         * @example
         *
         * ```ts
         * // if you don't provide HTMLInputElement here, TS will error
         * // as `value` is not on `Element`
         * await page.$$eval('input', (elements: HTMLInputElement[]) => {
         *   return elements.map(e => e.value);
         * });
         * ```
         *
         * The compiler should be able to infer the return type
         * from the `pageFunction` you provide. If it is unable to, you can use the generic
         * type to tell the compiler what return type you expect from `$$eval`:
         *
         * @example
         *
         * ```ts
         * // The compiler can infer the return type in this case, but if it can't
         * // or if you want to be more explicit, provide it as the generic type.
         * const allInputValues = await page.$$eval<string[]>(
         *   'input',
         *   (elements: HTMLInputElement[]) => elements.map(e => e.textContent)
         * );
         * ```
         *
         * @param selector - the
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * to query for
         * @param pageFunction - the function to be evaluated in the page context.
         * Will be passed the result of
         * `Array.from(document.querySelectorAll(selector))` as its first argument.
         * @param args - any additional arguments to pass through to `pageFunction`.
         *
         * @returns The result of calling `pageFunction`. If it returns an element it
         * is wrapped in an {@link ElementHandle}, else the raw value itself is
         * returned.
         */
        async $$eval(selector, pageFunction, ...args) {
            pageFunction = withSourcePuppeteerURLIfNone(this.$$eval.name, pageFunction);
            return await this.mainFrame().$$eval(selector, pageFunction, ...args);
        }
        /**
         * The method evaluates the XPath expression relative to the page document as
         * its context node. If there are no such elements, the method resolves to an
         * empty array.
         *
         * @remarks
         * Shortcut for {@link Frame.$x | Page.mainFrame().$x(expression) }.
         *
         * @param expression - Expression to evaluate
         */
        async $x(expression) {
            return await this.mainFrame().$x(expression);
        }
        async cookies() {
            throw new Error('Not implemented');
        }
        async deleteCookie() {
            throw new Error('Not implemented');
        }
        async setCookie() {
            throw new Error('Not implemented');
        }
        /**
         * Adds a `<script>` tag into the page with the desired URL or content.
         *
         * @remarks
         * Shortcut for
         * {@link Frame.addScriptTag | page.mainFrame().addScriptTag(options)}.
         *
         * @param options - Options for the script.
         * @returns An {@link ElementHandle | element handle} to the injected
         * `<script>` element.
         */
        async addScriptTag(options) {
            return await this.mainFrame().addScriptTag(options);
        }
        async addStyleTag(options) {
            return await this.mainFrame().addStyleTag(options);
        }
        async removeExposedFunction() {
            throw new Error('Not implemented');
        }
        async authenticate() {
            throw new Error('Not implemented');
        }
        async setExtraHTTPHeaders() {
            throw new Error('Not implemented');
        }
        /**
         * Object containing metrics as key/value pairs.
         *
         * @returns
         *
         * - `Timestamp` : The timestamp when the metrics sample was taken.
         *
         * - `Documents` : Number of documents in the page.
         *
         * - `Frames` : Number of frames in the page.
         *
         * - `JSEventListeners` : Number of events in the page.
         *
         * - `Nodes` : Number of DOM nodes in the page.
         *
         * - `LayoutCount` : Total number of full or partial page layout.
         *
         * - `RecalcStyleCount` : Total number of page style recalculations.
         *
         * - `LayoutDuration` : Combined durations of all page layouts.
         *
         * - `RecalcStyleDuration` : Combined duration of all page style
         *   recalculations.
         *
         * - `ScriptDuration` : Combined duration of JavaScript execution.
         *
         * - `TaskDuration` : Combined duration of all tasks performed by the browser.
         *
         * - `JSHeapUsedSize` : Used JavaScript heap size.
         *
         * - `JSHeapTotalSize` : Total JavaScript heap size.
         *
         * @remarks
         * All timestamps are in monotonic time: monotonically increasing time
         * in seconds since an arbitrary point in the past.
         */
        async metrics() {
            throw new Error('Not implemented');
        }
        /**
         * The page's URL.
         * @remarks Shortcut for
         * {@link Frame.url | page.mainFrame().url()}.
         */
        url() {
            return this.mainFrame().url();
        }
        /**
         * The full HTML contents of the page, including the DOCTYPE.
         */
        async content() {
            return await this.mainFrame().content();
        }
        /**
         * Set the content of the page.
         *
         * @param html - HTML markup to assign to the page.
         * @param options - Parameters that has some properties.
         * @remarks
         * The parameter `options` might have the following options.
         *
         * - `timeout` : Maximum time in milliseconds for resources to load, defaults
         *   to 30 seconds, pass `0` to disable timeout. The default value can be
         *   changed by using the {@link Page.setDefaultNavigationTimeout} or
         *   {@link Page.setDefaultTimeout} methods.
         *
         * - `waitUntil`: When to consider setting markup succeeded, defaults to
         *   `load`. Given an array of event strings, setting content is considered
         *   to be successful after all events have been fired. Events can be
         *   either:<br/>
         * - `load` : consider setting content to be finished when the `load` event
         *   is fired.<br/>
         * - `domcontentloaded` : consider setting content to be finished when the
         *   `DOMContentLoaded` event is fired.<br/>
         * - `networkidle0` : consider setting content to be finished when there are
         *   no more than 0 network connections for at least `500` ms.<br/>
         * - `networkidle2` : consider setting content to be finished when there are
         *   no more than 2 network connections for at least `500` ms.
         */
        async setContent(html, options) {
            await this.mainFrame().setContent(html, options);
        }
        /**
         * Navigates the page to the given `url`.
         *
         * @remarks
         * Navigation to `about:blank` or navigation to the same URL with a different
         * hash will succeed and return `null`.
         *
         * :::warning
         *
         * Headless mode doesn't support navigation to a PDF document. See the {@link
         * https://bugs.chromium.org/p/chromium/issues/detail?id=761295 | upstream
         * issue}.
         *
         * :::
         *
         * Shortcut for {@link Frame.goto | page.mainFrame().goto(url, options)}.
         *
         * @param url - URL to navigate page to. The URL should include scheme, e.g.
         * `https://`
         * @param options - Options to configure waiting behavior.
         * @returns A promise which resolves to the main resource response. In case of
         * multiple redirects, the navigation will resolve with the response of the
         * last redirect.
         * @throws If:
         *
         * - there's an SSL error (e.g. in case of self-signed certificates).
         * - target URL is invalid.
         * - the timeout is exceeded during navigation.
         * - the remote server does not respond or is unreachable.
         * - the main resource failed to load.
         *
         * This method will not throw an error when any valid HTTP status code is
         * returned by the remote server, including 404 "Not Found" and 500 "Internal
         * Server Error". The status code for such responses can be retrieved by
         * calling {@link HTTPResponse.status}.
         */
        async goto(url, options) {
            return await this.mainFrame().goto(url, options);
        }
        /**
         * Waits for the page to navigate to a new URL or to reload. It is useful when
         * you run code that will indirectly cause the page to navigate.
         *
         * @example
         *
         * ```ts
         * const [response] = await Promise.all([
         *   page.waitForNavigation(), // The promise resolves after navigation has finished
         *   page.click('a.my-link'), // Clicking the link will indirectly cause a navigation
         * ]);
         * ```
         *
         * @remarks
         * Usage of the
         * {@link https://developer.mozilla.org/en-US/docs/Web/API/History_API | History API}
         * to change the URL is considered a navigation.
         *
         * @param options - Navigation parameters which might have the following
         * properties:
         * @returns A `Promise` which resolves to the main resource response.
         *
         * - In case of multiple redirects, the navigation will resolve with the
         *   response of the last redirect.
         * - In case of navigation to a different anchor or navigation due to History
         *   API usage, the navigation will resolve with `null`.
         */
        async waitForNavigation(options = {}) {
            return await this.mainFrame().waitForNavigation(options);
        }
        /**
         * @internal
         */
        async _waitForNetworkIdle(networkManager, idleTime, ms, closedDeferred) {
            await firstValueFrom(merge(fromEvent(networkManager, NetworkManagerEvent.Request), fromEvent(networkManager, NetworkManagerEvent.Response), fromEvent(networkManager, NetworkManagerEvent.RequestFailed)).pipe(startWith(null), filter(() => {
                return networkManager.inFlightRequestsCount() === 0;
            }), switchMap(v => {
                return of(v).pipe(delay(idleTime));
            }), raceWith(timeout(ms), from(closedDeferred.valueOrThrow()))));
        }
        /**
         * Waits for a frame matching the given conditions to appear.
         *
         * @example
         *
         * ```ts
         * const frame = await page.waitForFrame(async frame => {
         *   return frame.name() === 'Test';
         * });
         * ```
         */
        async waitForFrame(urlOrPredicate, options = {}) {
            const { timeout: ms = this.getDefaultTimeout() } = options;
            if (isString(urlOrPredicate)) {
                urlOrPredicate = (frame) => {
                    return urlOrPredicate === frame.url();
                };
            }
            return await firstValueFrom(merge(fromEvent(this, "frameattached" /* PageEvent.FrameAttached */), fromEvent(this, "framenavigated" /* PageEvent.FrameNavigated */), from(this.frames())).pipe(filterAsync(urlOrPredicate), first(), raceWith(timeout(ms), fromEvent(this, "close" /* PageEvent.Close */).pipe(map(() => {
                throw new TargetCloseError('Page closed.');
            })))));
        }
        async goBack() {
            throw new Error('Not implemented');
        }
        async goForward() {
            throw new Error('Not implemented');
        }
        /**
         * Emulates a given device's metrics and user agent.
         *
         * To aid emulation, Puppeteer provides a list of known devices that can be
         * via {@link KnownDevices}.
         *
         * @remarks
         * This method is a shortcut for calling two methods:
         * {@link Page.setUserAgent} and {@link Page.setViewport}.
         *
         * @remarks
         * This method will resize the page. A lot of websites don't expect phones to
         * change size, so you should emulate before navigating to the page.
         *
         * @example
         *
         * ```ts
         * import {KnownDevices} from 'puppeteer';
         * const iPhone = KnownDevices['iPhone 6'];
         *
         * (async () => {
         *   const browser = await puppeteer.launch();
         *   const page = await browser.newPage();
         *   await page.emulate(iPhone);
         *   await page.goto('https://www.google.com');
         *   // other actions...
         *   await browser.close();
         * })();
         * ```
         */
        async emulate(device) {
            await Promise.all([
                this.setUserAgent(device.userAgent),
                this.setViewport(device.viewport),
            ]);
        }
        async setJavaScriptEnabled() {
            throw new Error('Not implemented');
        }
        async emulateMediaType() {
            throw new Error('Not implemented');
        }
        async emulateCPUThrottling() {
            throw new Error('Not implemented');
        }
        async emulateMediaFeatures() {
            throw new Error('Not implemented');
        }
        async emulateTimezone() {
            throw new Error('Not implemented');
        }
        async emulateIdleState() {
            throw new Error('Not implemented');
        }
        async emulateVisionDeficiency() {
            throw new Error('Not implemented');
        }
        /**
         * Evaluates a function in the page's context and returns the result.
         *
         * If the function passed to `page.evaluate` returns a Promise, the
         * function will wait for the promise to resolve and return its value.
         *
         * @example
         *
         * ```ts
         * const result = await frame.evaluate(() => {
         *   return Promise.resolve(8 * 7);
         * });
         * console.log(result); // prints "56"
         * ```
         *
         * You can pass a string instead of a function (although functions are
         * recommended as they are easier to debug and use with TypeScript):
         *
         * @example
         *
         * ```ts
         * const aHandle = await page.evaluate('1 + 2');
         * ```
         *
         * To get the best TypeScript experience, you should pass in as the
         * generic the type of `pageFunction`:
         *
         * ```ts
         * const aHandle = await page.evaluate(() => 2);
         * ```
         *
         * @example
         *
         * {@link ElementHandle} instances (including {@link JSHandle}s) can be passed
         * as arguments to the `pageFunction`:
         *
         * ```ts
         * const bodyHandle = await page.$('body');
         * const html = await page.evaluate(body => body.innerHTML, bodyHandle);
         * await bodyHandle.dispose();
         * ```
         *
         * @param pageFunction - a function that is run within the page
         * @param args - arguments to be passed to the pageFunction
         *
         * @returns the return value of `pageFunction`.
         */
        async evaluate(pageFunction, ...args) {
            pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
            return await this.mainFrame().evaluate(pageFunction, ...args);
        }
        /**
         * @internal
         */
        async _maybeWriteBufferToFile(path, buffer) {
            if (!path) {
                return;
            }
            const fs = await importFSPromises();
            await fs.writeFile(path, buffer);
        }
        /**
         * Captures a screencast of this {@link Page | page}.
         *
         * @remarks
         *
         * All recordings will be {@link https://www.webmproject.org/ | WebM} format using
         * the {@link https://www.webmproject.org/vp9/ | VP9} video codec. The FPS is 30.
         *
         * You must have {@link https://ffmpeg.org/ | ffmpeg} installed on your system.
         *
         * @example
         * Recording a {@link Page | page}:
         *
         * ```
         * import puppeteer from 'puppeteer';
         *
         * // Launch a browser
         * const browser = await puppeteer.launch();
         *
         * // Create a new page
         * const page = await browser.newPage();
         *
         * // Go to your site.
         * await page.goto("https://www.example.com");
         *
         * // Start recording.
         * const recorder = await page.screencast({path: 'recording.webm'});
         *
         * // Do something.
         *
         * // Stop recording.
         * await recorder.stop();
         *
         * browser.close();
         * ```
         *
         * @param options - Configures screencast behavior.
         *
         * @experimental
         */
        async screencast(options = {}) {
            const [{ ScreenRecorder }, [width, height, devicePixelRatio]] = await Promise.all([
                import('../node/ScreenRecorder.js'),
                this.#getNativePixelDimensions(),
            ]);
            let crop;
            if (options.crop) {
                const { x, y, width: cropWidth, height: cropHeight, } = roundRectangle(normalizeRectangle(options.crop));
                if (x < 0 || y < 0) {
                    throw new Error(`\`crop.x\` and \`crop.y\` must be greater than or equal to 0.`);
                }
                if (cropWidth <= 0 || cropHeight <= 0) {
                    throw new Error(`\`crop.height\` and \`crop.width\` must be greater than or equal to 0.`);
                }
                const viewportWidth = width / devicePixelRatio;
                const viewportHeight = width / devicePixelRatio;
                if (x + cropWidth > viewportWidth) {
                    throw new Error(`\`crop.width\` cannot be larger than the viewport width (${viewportWidth}).`);
                }
                if (y + cropHeight > viewportHeight) {
                    throw new Error(`\`crop.height\` cannot be larger than the viewport height (${viewportHeight}).`);
                }
                crop = {
                    x: x * devicePixelRatio,
                    y: y * devicePixelRatio,
                    width: cropWidth * devicePixelRatio,
                    height: cropHeight * devicePixelRatio,
                };
            }
            if (options.speed !== undefined && options.speed <= 0) {
                throw new Error(`\`speed\` must be greater than 0.`);
            }
            if (options.scale !== undefined && options.scale <= 0) {
                throw new Error(`\`scale\` must be greater than 0.`);
            }
            const recorder = new ScreenRecorder(this, width, height, {
                ...options,
                path: options.ffmpegPath,
                crop,
            });
            try {
                await this._startScreencast();
            }
            catch (error) {
                void recorder.stop();
                throw error;
            }
            if (options.path) {
                const { createWriteStream } = await import('fs');
                const stream = createWriteStream(options.path, 'binary');
                recorder.pipe(stream);
            }
            return recorder;
        }
        #screencastSessionCount = 0;
        #startScreencastPromise;
        /**
         * @internal
         */
        async _startScreencast() {
            ++this.#screencastSessionCount;
            if (!this.#startScreencastPromise) {
                this.#startScreencastPromise = this.mainFrame()
                    .client.send('Page.startScreencast', { format: 'png' })
                    .then(() => {
                    // Wait for the first frame.
                    return new Promise(resolve => {
                        return this.mainFrame().client.once('Page.screencastFrame', () => {
                            return resolve();
                        });
                    });
                });
            }
            await this.#startScreencastPromise;
        }
        /**
         * @internal
         */
        async _stopScreencast() {
            --this.#screencastSessionCount;
            if (!this.#startScreencastPromise) {
                return;
            }
            this.#startScreencastPromise = undefined;
            if (this.#screencastSessionCount === 0) {
                await this.mainFrame().client.send('Page.stopScreencast');
            }
        }
        /**
         * Gets the native, non-emulated dimensions of the viewport.
         */
        async #getNativePixelDimensions() {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const viewport = this.viewport();
                const stack = __addDisposableResource(env_1, new DisposableStack(), false);
                if (viewport && viewport.deviceScaleFactor !== 0) {
                    await this.setViewport({ ...viewport, deviceScaleFactor: 0 });
                    stack.defer(() => {
                        void this.setViewport(viewport).catch(debugError);
                    });
                }
                return await this.mainFrame()
                    .isolatedRealm()
                    .evaluate(() => {
                    return [
                        window.visualViewport.width * window.devicePixelRatio,
                        window.visualViewport.height * window.devicePixelRatio,
                        window.devicePixelRatio,
                    ];
                });
            }
            catch (e_1) {
                env_1.error = e_1;
                env_1.hasError = true;
            }
            finally {
                __disposeResources(env_1);
            }
        }
        async screenshot(userOptions = {}) {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                await this.bringToFront();
                // TODO: use structuredClone after Node 16 support is dropped.«
                const options = {
                    ...userOptions,
                    clip: userOptions.clip
                        ? {
                            ...userOptions.clip,
                        }
                        : undefined,
                };
                if (options.type === undefined && options.path !== undefined) {
                    const filePath = options.path;
                    // Note we cannot use Node.js here due to browser compatability.
                    const extension = filePath
                        .slice(filePath.lastIndexOf('.') + 1)
                        .toLowerCase();
                    switch (extension) {
                        case 'png':
                            options.type = 'png';
                            break;
                        case 'jpeg':
                        case 'jpg':
                            options.type = 'jpeg';
                            break;
                        case 'webp':
                            options.type = 'webp';
                            break;
                    }
                }
                if (options.quality !== undefined) {
                    if (options.quality < 0 && options.quality > 100) {
                        throw new Error(`Expected 'quality' (${options.quality}) to be between 0 and 100, inclusive.`);
                    }
                    if (options.type === undefined ||
                        !['jpeg', 'webp'].includes(options.type)) {
                        throw new Error(`${options.type ?? 'png'} screenshots do not support 'quality'.`);
                    }
                }
                assert(!options.clip || !options.fullPage, "'clip' and 'fullPage' are exclusive");
                if (options.clip) {
                    if (options.clip.width <= 0) {
                        throw new Error("'width' in 'clip' must be positive.");
                    }
                    if (options.clip.height <= 0) {
                        throw new Error("'height' in 'clip' must be positive.");
                    }
                }
                setDefaultScreenshotOptions(options);
                options.clip =
                    options.clip && roundRectangle(normalizeRectangle(options.clip));
                const stack = __addDisposableResource(env_2, new AsyncDisposableStack(), true);
                if (options.allowViewportExpansion || options.captureBeyondViewport) {
                    if (options.fullPage) {
                        const dimensions = await this.mainFrame()
                            .isolatedRealm()
                            .evaluate(() => {
                            const { scrollHeight, scrollWidth } = document.documentElement;
                            const { height: viewportHeight, width: viewportWidth } = window.visualViewport;
                            return {
                                height: Math.max(scrollHeight, viewportHeight),
                                width: Math.max(scrollWidth, viewportWidth),
                            };
                        });
                        options.clip = { ...dimensions, x: 0, y: 0 };
                        stack.use(await this._createTemporaryViewportContainingBox(options.clip));
                    }
                    else if (options.clip && !options.captureBeyondViewport) {
                        stack.use(options.clip &&
                            (await this._createTemporaryViewportContainingBox(options.clip)));
                    }
                    else if (!options.clip) {
                        options.captureBeyondViewport = false;
                    }
                }
                const data = await this._screenshot(options);
                if (options.encoding === 'base64') {
                    return data;
                }
                const buffer = Buffer.from(data, 'base64');
                await this._maybeWriteBufferToFile(options.path, buffer);
                return buffer;
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                const result_1 = __disposeResources(env_2);
                if (result_1)
                    await result_1;
            }
        }
        /**
         * @internal
         */
        async _createTemporaryViewportContainingBox(clip) {
            const env_3 = { stack: [], error: void 0, hasError: false };
            try {
                const viewport = await this.mainFrame()
                    .isolatedRealm()
                    .evaluate(() => {
                    return {
                        pageLeft: window.visualViewport.pageLeft,
                        pageTop: window.visualViewport.pageTop,
                        width: window.visualViewport.width,
                        height: window.visualViewport.height,
                    };
                });
                const stack = __addDisposableResource(env_3, new AsyncDisposableStack(), true);
                if (clip.x < viewport.pageLeft || clip.y < viewport.pageTop) {
                    await this.evaluate((left, top) => {
                        window.scroll({ left, top, behavior: 'instant' });
                    }, Math.floor(clip.x), Math.floor(clip.y));
                    stack.defer(async () => {
                        await this.evaluate((left, top) => {
                            window.scroll({ left, top, behavior: 'instant' });
                        }, viewport.pageLeft, viewport.pageTop).catch(debugError);
                    });
                }
                if (clip.width + clip.x > viewport.width ||
                    clip.height + clip.y > viewport.height) {
                    const originalViewport = this.viewport() ?? {
                        width: 0,
                        height: 0,
                    };
                    // We add 1 for fractional x and y.
                    await this.setViewport({
                        width: Math.max(viewport.width, Math.ceil(clip.width + clip.x)),
                        height: Math.max(viewport.height, Math.ceil(clip.height + clip.y)),
                    });
                    stack.defer(async () => {
                        await this.setViewport(originalViewport).catch(debugError);
                    });
                }
                return stack.move();
            }
            catch (e_3) {
                env_3.error = e_3;
                env_3.hasError = true;
            }
            finally {
                const result_2 = __disposeResources(env_3);
                if (result_2)
                    await result_2;
            }
        }
        /**
         * @internal
         */
        _getPDFOptions(options = {}, lengthUnit = 'in') {
            const defaults = {
                scale: 1,
                displayHeaderFooter: false,
                headerTemplate: '',
                footerTemplate: '',
                printBackground: false,
                landscape: false,
                pageRanges: '',
                preferCSSPageSize: false,
                omitBackground: false,
                timeout: 30000,
                tagged: false,
            };
            let width = 8.5;
            let height = 11;
            if (options.format) {
                const format = paperFormats[options.format.toLowerCase()];
                assert(format, 'Unknown paper format: ' + options.format);
                width = format.width;
                height = format.height;
            }
            else {
                width = convertPrintParameterToInches(options.width, lengthUnit) ?? width;
                height =
                    convertPrintParameterToInches(options.height, lengthUnit) ?? height;
            }
            const margin = {
                top: convertPrintParameterToInches(options.margin?.top, lengthUnit) || 0,
                left: convertPrintParameterToInches(options.margin?.left, lengthUnit) || 0,
                bottom: convertPrintParameterToInches(options.margin?.bottom, lengthUnit) || 0,
                right: convertPrintParameterToInches(options.margin?.right, lengthUnit) || 0,
            };
            return {
                ...defaults,
                ...options,
                width,
                height,
                margin,
            };
        }
        async createPDFStream() {
            throw new Error('Not implemented');
        }
        /**
         * The page's title
         *
         * @remarks
         * Shortcut for {@link Frame.title | page.mainFrame().title()}.
         */
        async title() {
            return await this.mainFrame().title();
        }
        /**
         * This method fetches an element with `selector`, scrolls it into view if
         * needed, and then uses {@link Page | Page.mouse} to click in the center of the
         * element. If there's no element matching `selector`, the method throws an
         * error.
         * @remarks Bear in mind that if `click()` triggers a navigation event and
         * there's a separate `page.waitForNavigation()` promise to be resolved, you
         * may end up with a race condition that yields unexpected results. The
         * correct pattern for click and wait for navigation is the following:
         *
         * ```ts
         * const [response] = await Promise.all([
         *   page.waitForNavigation(waitOptions),
         *   page.click(selector, clickOptions),
         * ]);
         * ```
         *
         * Shortcut for {@link Frame.click | page.mainFrame().click(selector[, options]) }.
         * @param selector - A `selector` to search for element to click. If there are
         * multiple elements satisfying the `selector`, the first will be clicked
         * @param options - `Object`
         * @returns Promise which resolves when the element matching `selector` is
         * successfully clicked. The Promise will be rejected if there is no element
         * matching `selector`.
         */
        click(selector, options) {
            return this.mainFrame().click(selector, options);
        }
        /**
         * This method fetches an element with `selector` and focuses it. If there's no
         * element matching `selector`, the method throws an error.
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector }
         * of an element to focus. If there are multiple elements satisfying the
         * selector, the first will be focused.
         * @returns Promise which resolves when the element matching selector is
         * successfully focused. The promise will be rejected if there is no element
         * matching selector.
         * @remarks
         * Shortcut for {@link Frame.focus | page.mainFrame().focus(selector)}.
         */
        focus(selector) {
            return this.mainFrame().focus(selector);
        }
        /**
         * This method fetches an element with `selector`, scrolls it into view if
         * needed, and then uses {@link Page | Page.mouse}
         * to hover over the center of the element.
         * If there's no element matching `selector`, the method throws an error.
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * to search for element to hover. If there are multiple elements satisfying
         * the selector, the first will be hovered.
         * @returns Promise which resolves when the element matching `selector` is
         * successfully hovered. Promise gets rejected if there's no element matching
         * `selector`.
         * @remarks
         * Shortcut for {@link Page.hover | page.mainFrame().hover(selector)}.
         */
        hover(selector) {
            return this.mainFrame().hover(selector);
        }
        /**
         * Triggers a `change` and `input` event once all the provided options have been
         * selected. If there's no `<select>` element matching `selector`, the method
         * throws an error.
         *
         * @example
         *
         * ```ts
         * page.select('select#colors', 'blue'); // single selection
         * page.select('select#colors', 'red', 'green', 'blue'); // multiple selections
         * ```
         *
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | Selector}
         * to query the page for
         * @param values - Values of options to select. If the `<select>` has the
         * `multiple` attribute, all values are considered, otherwise only the first one
         * is taken into account.
         * @returns
         *
         * @remarks
         * Shortcut for {@link Frame.select | page.mainFrame().select()}
         */
        select(selector, ...values) {
            return this.mainFrame().select(selector, ...values);
        }
        /**
         * This method fetches an element with `selector`, scrolls it into view if
         * needed, and then uses {@link Page | Page.touchscreen}
         * to tap in the center of the element.
         * If there's no element matching `selector`, the method throws an error.
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | Selector}
         * to search for element to tap. If there are multiple elements satisfying the
         * selector, the first will be tapped.
         * @returns
         * @remarks
         * Shortcut for {@link Frame.tap | page.mainFrame().tap(selector)}.
         */
        tap(selector) {
            return this.mainFrame().tap(selector);
        }
        /**
         * Sends a `keydown`, `keypress/input`, and `keyup` event for each character
         * in the text.
         *
         * To press a special key, like `Control` or `ArrowDown`, use {@link Keyboard.press}.
         * @example
         *
         * ```ts
         * await page.type('#mytextarea', 'Hello');
         * // Types instantly
         * await page.type('#mytextarea', 'World', {delay: 100});
         * // Types slower, like a user
         * ```
         *
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * of an element to type into. If there are multiple elements satisfying the
         * selector, the first will be used.
         * @param text - A text to type into a focused element.
         * @param options - have property `delay` which is the Time to wait between
         * key presses in milliseconds. Defaults to `0`.
         * @returns
         * @remarks
         */
        type(selector, text, options) {
            return this.mainFrame().type(selector, text, options);
        }
        /**
         * @deprecated Replace with `new Promise(r => setTimeout(r, milliseconds));`.
         *
         * Causes your script to wait for the given number of milliseconds.
         *
         * @remarks
         * It's generally recommended to not wait for a number of seconds, but instead
         * use {@link Frame.waitForSelector}, {@link Frame.waitForXPath} or
         * {@link Frame.waitForFunction} to wait for exactly the conditions you want.
         *
         * @example
         *
         * Wait for 1 second:
         *
         * ```ts
         * await page.waitForTimeout(1000);
         * ```
         *
         * @param milliseconds - the number of milliseconds to wait.
         */
        waitForTimeout(milliseconds) {
            return this.mainFrame().waitForTimeout(milliseconds);
        }
        /**
         * Wait for the `selector` to appear in page. If at the moment of calling the
         * method the `selector` already exists, the method will return immediately. If
         * the `selector` doesn't appear after the `timeout` milliseconds of waiting, the
         * function will throw.
         *
         * @example
         * This method works across navigations:
         *
         * ```ts
         * import puppeteer from 'puppeteer';
         * (async () => {
         *   const browser = await puppeteer.launch();
         *   const page = await browser.newPage();
         *   let currentURL;
         *   page
         *     .waitForSelector('img')
         *     .then(() => console.log('First URL with image: ' + currentURL));
         *   for (currentURL of [
         *     'https://example.com',
         *     'https://google.com',
         *     'https://bbc.com',
         *   ]) {
         *     await page.goto(currentURL);
         *   }
         *   await browser.close();
         * })();
         * ```
         *
         * @param selector - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
         * of an element to wait for
         * @param options - Optional waiting parameters
         * @returns Promise which resolves when element specified by selector string
         * is added to DOM. Resolves to `null` if waiting for hidden: `true` and
         * selector is not found in DOM.
         * @remarks
         * The optional Parameter in Arguments `options` are:
         *
         * - `visible`: A boolean wait for element to be present in DOM and to be
         *   visible, i.e. to not have `display: none` or `visibility: hidden` CSS
         *   properties. Defaults to `false`.
         *
         * - `hidden`: Wait for element to not be found in the DOM or to be hidden,
         *   i.e. have `display: none` or `visibility: hidden` CSS properties. Defaults to
         *   `false`.
         *
         * - `timeout`: maximum time to wait for in milliseconds. Defaults to `30000`
         *   (30 seconds). Pass `0` to disable timeout. The default value can be changed
         *   by using the {@link Page.setDefaultTimeout} method.
         */
        async waitForSelector(selector, options = {}) {
            return await this.mainFrame().waitForSelector(selector, options);
        }
        /**
         * Wait for the `xpath` to appear in page. If at the moment of calling the
         * method the `xpath` already exists, the method will return immediately. If
         * the `xpath` doesn't appear after the `timeout` milliseconds of waiting, the
         * function will throw.
         *
         * @example
         * This method works across navigation
         *
         * ```ts
         * import puppeteer from 'puppeteer';
         * (async () => {
         *   const browser = await puppeteer.launch();
         *   const page = await browser.newPage();
         *   let currentURL;
         *   page
         *     .waitForXPath('//img')
         *     .then(() => console.log('First URL with image: ' + currentURL));
         *   for (currentURL of [
         *     'https://example.com',
         *     'https://google.com',
         *     'https://bbc.com',
         *   ]) {
         *     await page.goto(currentURL);
         *   }
         *   await browser.close();
         * })();
         * ```
         *
         * @param xpath - A
         * {@link https://developer.mozilla.org/en-US/docs/Web/XPath | xpath} of an
         * element to wait for
         * @param options - Optional waiting parameters
         * @returns Promise which resolves when element specified by xpath string is
         * added to DOM. Resolves to `null` if waiting for `hidden: true` and xpath is
         * not found in DOM, otherwise resolves to `ElementHandle`.
         * @remarks
         * The optional Argument `options` have properties:
         *
         * - `visible`: A boolean to wait for element to be present in DOM and to be
         *   visible, i.e. to not have `display: none` or `visibility: hidden` CSS
         *   properties. Defaults to `false`.
         *
         * - `hidden`: A boolean wait for element to not be found in the DOM or to be
         *   hidden, i.e. have `display: none` or `visibility: hidden` CSS properties.
         *   Defaults to `false`.
         *
         * - `timeout`: A number which is maximum time to wait for in milliseconds.
         *   Defaults to `30000` (30 seconds). Pass `0` to disable timeout. The default
         *   value can be changed by using the {@link Page.setDefaultTimeout} method.
         */
        waitForXPath(xpath, options) {
            return this.mainFrame().waitForXPath(xpath, options);
        }
        /**
         * Waits for a function to finish evaluating in the page's context.
         *
         * @example
         * The {@link Page.waitForFunction} can be used to observe viewport size change:
         *
         * ```ts
         * import puppeteer from 'puppeteer';
         * (async () => {
         *   const browser = await puppeteer.launch();
         *   const page = await browser.newPage();
         *   const watchDog = page.waitForFunction('window.innerWidth < 100');
         *   await page.setViewport({width: 50, height: 50});
         *   await watchDog;
         *   await browser.close();
         * })();
         * ```
         *
         * @example
         * To pass arguments from node.js to the predicate of
         * {@link Page.waitForFunction} function:
         *
         * ```ts
         * const selector = '.foo';
         * await page.waitForFunction(
         *   selector => !!document.querySelector(selector),
         *   {},
         *   selector
         * );
         * ```
         *
         * @example
         * The predicate of {@link Page.waitForFunction} can be asynchronous too:
         *
         * ```ts
         * const username = 'github-username';
         * await page.waitForFunction(
         *   async username => {
         *     const githubResponse = await fetch(
         *       `https://api.github.com/users/${username}`
         *     );
         *     const githubUser = await githubResponse.json();
         *     // show the avatar
         *     const img = document.createElement('img');
         *     img.src = githubUser.avatar_url;
         *     // wait 3 seconds
         *     await new Promise((resolve, reject) => setTimeout(resolve, 3000));
         *     img.remove();
         *   },
         *   {},
         *   username
         * );
         * ```
         *
         * @param pageFunction - Function to be evaluated in browser context
         * @param options - Options for configuring waiting behavior.
         */
        waitForFunction(pageFunction, options, ...args) {
            return this.mainFrame().waitForFunction(pageFunction, options, ...args);
        }
        waitForDevicePrompt() {
            throw new Error('Not implemented');
        }
        /** @internal */
        [(_screenshot_decorators = [guarded(function () {
                return this.browser();
            })], disposeSymbol)]() {
            return void this.close().catch(debugError);
        }
        /** @internal */
        [asyncDisposeSymbol]() {
            return this.close();
        }
    };
})();
export { Page };
/**
 * @internal
 */
export const supportedMetrics = new Set([
    'Timestamp',
    'Documents',
    'Frames',
    'JSEventListeners',
    'Nodes',
    'LayoutCount',
    'RecalcStyleCount',
    'LayoutDuration',
    'RecalcStyleDuration',
    'ScriptDuration',
    'TaskDuration',
    'JSHeapUsedSize',
    'JSHeapTotalSize',
]);
/**
 * @internal
 */
export const unitToPixels = {
    px: 1,
    in: 96,
    cm: 37.8,
    mm: 3.78,
};
function convertPrintParameterToInches(parameter, lengthUnit = 'in') {
    if (typeof parameter === 'undefined') {
        return undefined;
    }
    let pixels;
    if (isNumber(parameter)) {
        // Treat numbers as pixel values to be aligned with phantom's paperSize.
        pixels = parameter;
    }
    else if (isString(parameter)) {
        const text = parameter;
        let unit = text.substring(text.length - 2).toLowerCase();
        let valueText = '';
        if (unit in unitToPixels) {
            valueText = text.substring(0, text.length - 2);
        }
        else {
            // In case of unknown unit try to parse the whole parameter as number of pixels.
            // This is consistent with phantom's paperSize behavior.
            unit = 'px';
            valueText = text;
        }
        const value = Number(valueText);
        assert(!isNaN(value), 'Failed to parse parameter value: ' + text);
        pixels = value * unitToPixels[unit];
    }
    else {
        throw new Error('page.pdf() Cannot handle parameter type: ' + typeof parameter);
    }
    return pixels / unitToPixels[lengthUnit];
}
/** @see https://w3c.github.io/webdriver-bidi/#normalize-rect */
function normalizeRectangle(clip) {
    return {
        ...clip,
        ...(clip.width < 0
            ? {
                x: clip.x + clip.width,
                width: -clip.width,
            }
            : {
                x: clip.x,
                width: clip.width,
            }),
        ...(clip.height < 0
            ? {
                y: clip.y + clip.height,
                height: -clip.height,
            }
            : {
                y: clip.y,
                height: clip.height,
            }),
    };
}
function roundRectangle(clip) {
    const x = Math.round(clip.x);
    const y = Math.round(clip.y);
    const width = Math.round(clip.width + clip.x - x);
    const height = Math.round(clip.height + clip.y - y);
    return { ...clip, x, y, width, height };
}
//# sourceMappingURL=Page.js.map