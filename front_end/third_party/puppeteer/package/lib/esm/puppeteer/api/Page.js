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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Page_handlerMap;
import { EventEmitter } from '../common/EventEmitter.js';
import { NetworkManagerEmittedEvents, } from '../common/NetworkManager.js';
import { paperFormats, } from '../common/PDFOptions.js';
import { importFSPromises, isNumber, isString, waitForEvent, withSourcePuppeteerURLIfNone, } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { Locator } from './Locator.js';
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
 * emit various events which are documented in the {@link PageEmittedEvents} enum.
 *
 * @example
 * This example logs a message for a single page `load` event:
 *
 * ```ts
 * page.once('load', () => console.log('Page loaded!'));
 * ```
 *
 * To unsubscribe from events use the {@link Page.off} method:
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
export class Page extends EventEmitter {
    /**
     * @internal
     */
    constructor() {
        super();
        _Page_handlerMap.set(this, new WeakMap());
    }
    /**
     * `true` if the service worker are being bypassed, `false` otherwise.
     */
    isServiceWorkerBypassed() {
        throw new Error('Not implemented');
    }
    /**
     * `true` if drag events are being intercepted, `false` otherwise.
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
     * :::note
     *
     * This method exists to define event typings and handle proper wireup of
     * cooperative request interception. Actual event listening and dispatching is
     * delegated to {@link EventEmitter}.
     *
     * :::
     */
    on(eventName, handler) {
        if (eventName === 'request') {
            const wrap = __classPrivateFieldGet(this, _Page_handlerMap, "f").get(handler) ||
                ((event) => {
                    event.enqueueInterceptAction(() => {
                        return handler(event);
                    });
                });
            __classPrivateFieldGet(this, _Page_handlerMap, "f").set(handler, wrap);
            return super.on(eventName, wrap);
        }
        return super.on(eventName, handler);
    }
    once(eventName, handler) {
        // Note: this method only exists to define the types; we delegate the impl
        // to EventEmitter.
        return super.once(eventName, handler);
    }
    off(eventName, handler) {
        if (eventName === 'request') {
            handler = __classPrivateFieldGet(this, _Page_handlerMap, "f").get(handler) || handler;
        }
        return super.off(eventName, handler);
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
     * Get the browser the page belongs to.
     */
    browser() {
        throw new Error('Not implemented');
    }
    /**
     * Get the browser context that the page belongs to.
     */
    browserContext() {
        throw new Error('Not implemented');
    }
    /**
     * The page's main frame.
     *
     * @remarks
     * Page is guaranteed to have a main frame which persists during navigations.
     */
    mainFrame() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Keyboard}
     */
    get keyboard() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Touchscreen}
     */
    get touchscreen() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Coverage}
     */
    get coverage() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Tracing}
     */
    get tracing() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Accessibility}
     */
    get accessibility() {
        throw new Error('Not implemented');
    }
    /**
     * An array of all frames attached to the page.
     */
    frames() {
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
    setDefaultNavigationTimeout() {
        throw new Error('Not implemented');
    }
    setDefaultTimeout() {
        throw new Error('Not implemented');
    }
    /**
     * Maximum time in milliseconds.
     */
    getDefaultTimeout() {
        throw new Error('Not implemented');
    }
    /**
     * Creates a locator for the provided `selector`. See {@link Locator} for
     * details and supported actions.
     *
     * @remarks
     * Locators API is experimental and we will not follow semver for breaking
     * change in the Locators API.
     */
    locator(selector) {
        return Locator.create(this, selector);
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
        return this.mainFrame().$(selector);
    }
    /**
     * The method runs `document.querySelectorAll` within the page. If no elements
     * match the selector, the return value resolves to `[]`.
     * @remarks
     * Shortcut for {@link Frame.$$ | Page.mainFrame().$$(selector) }.
     * @param selector - A `selector` to query page for
     */
    async $$(selector) {
        return this.mainFrame().$$(selector);
    }
    async evaluateHandle() {
        throw new Error('Not implemented');
    }
    async queryObjects() {
        throw new Error('Not implemented');
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
        return this.mainFrame().$eval(selector, pageFunction, ...args);
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
        return this.mainFrame().$$eval(selector, pageFunction, ...args);
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
        return this.mainFrame().$x(expression);
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
    async addScriptTag() {
        throw new Error('Not implemented');
    }
    async addStyleTag() {
        throw new Error('Not implemented');
    }
    async exposeFunction() {
        throw new Error('Not implemented');
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
    async setUserAgent() {
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
        throw new Error('Not implemented');
    }
    /**
     * The full HTML contents of the page, including the DOCTYPE.
     */
    async content() {
        throw new Error('Not implemented');
    }
    async setContent() {
        throw new Error('Not implemented');
    }
    async goto() {
        throw new Error('Not implemented');
    }
    async reload() {
        throw new Error('Not implemented');
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
    async waitForRequest() {
        throw new Error('Not implemented');
    }
    async waitForResponse() {
        throw new Error('Not implemented');
    }
    async waitForNetworkIdle() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    async _waitForNetworkIdle(networkManager, idleTime, timeout, closedDeferred) {
        const idleDeferred = Deferred.create();
        const abortDeferred = Deferred.create();
        let idleTimer;
        const cleanup = () => {
            clearTimeout(idleTimer);
            abortDeferred.reject(new Error('abort'));
        };
        const evaluate = () => {
            clearTimeout(idleTimer);
            if (networkManager.inFlightRequestsCount() === 0) {
                idleTimer = setTimeout(() => {
                    return idleDeferred.resolve();
                }, idleTime);
            }
        };
        const listenToEvent = (event) => {
            return waitForEvent(networkManager, event, () => {
                evaluate();
                return false;
            }, timeout, abortDeferred);
        };
        const eventPromises = [
            listenToEvent(NetworkManagerEmittedEvents.Request),
            listenToEvent(NetworkManagerEmittedEvents.Response),
            listenToEvent(NetworkManagerEmittedEvents.RequestFailed),
        ];
        evaluate();
        // We don't want to reject the closed deferred when
        // the race if finished so we pass the Promise instead
        const closedPromise = closedDeferred.valueOrThrow();
        await Deferred.race([idleDeferred, ...eventPromises, closedPromise]).then(r => {
            cleanup();
            return r;
        }, error => {
            cleanup();
            throw error;
        });
    }
    async waitForFrame() {
        throw new Error('Not implemented');
    }
    async goBack() {
        throw new Error('Not implemented');
    }
    async goForward() {
        throw new Error('Not implemented');
    }
    /**
     * Brings page to front (activates tab).
     */
    async bringToFront() {
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
    async setBypassCSP() {
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
    async setViewport() {
        throw new Error('Not implemented');
    }
    /**
     * Current page viewport settings.
     *
     * @returns
     *
     * - `width`: page's width in pixels
     *
     * - `height`: page's height in pixels
     *
     * - `deviceScaleFactor`: Specify device scale factor (can be though of as
     *   dpr). Defaults to `1`.
     *
     * - `isMobile`: Whether the meta viewport tag is taken into account. Defaults
     *   to `false`.
     *
     * - `hasTouch`: Specifies if viewport supports touch events. Defaults to
     *   `false`.
     *
     * - `isLandScape`: Specifies if viewport is in landscape mode. Defaults to
     *   `false`.
     */
    viewport() {
        throw new Error('Not implemented');
    }
    async evaluate() {
        throw new Error('Not implemented');
    }
    async evaluateOnNewDocument() {
        throw new Error('Not implemented');
    }
    async removeScriptToEvaluateOnNewDocument() {
        throw new Error('Not implemented');
    }
    async setCacheEnabled() {
        throw new Error('Not implemented');
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
    async screenshot() {
        throw new Error('Not implemented');
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
        const output = {
            ...defaults,
            ...options,
            width,
            height,
            margin,
        };
        return output;
    }
    async createPDFStream() {
        throw new Error('Not implemented');
    }
    async pdf() {
        throw new Error('Not implemented');
    }
    /**
     * The page's title
     *
     * @remarks
     * Shortcut for {@link Frame.title | page.mainFrame().title()}.
     */
    async title() {
        throw new Error('Not implemented');
    }
    async close() {
        throw new Error('Not implemented');
    }
    /**
     * Indicates that the page has been closed.
     * @returns
     */
    isClosed() {
        throw new Error('Not implemented');
    }
    /**
     * {@inheritDoc Mouse}
     */
    get mouse() {
        throw new Error('Not implemented');
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
    waitForXPath() {
        throw new Error('Not implemented');
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
}
_Page_handlerMap = new WeakMap();
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
//# sourceMappingURL=Page.js.map