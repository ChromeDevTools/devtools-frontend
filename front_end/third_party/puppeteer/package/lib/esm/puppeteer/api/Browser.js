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
import { EventEmitter } from '../common/EventEmitter.js';
import { waitWithTimeout } from '../common/util.js';
import { Deferred } from '../util/Deferred.js';
/**
 * @internal
 */
export const WEB_PERMISSION_TO_PROTOCOL_PERMISSION = new Map([
    ['geolocation', 'geolocation'],
    ['midi', 'midi'],
    ['notifications', 'notifications'],
    // TODO: push isn't a valid type?
    // ['push', 'push'],
    ['camera', 'videoCapture'],
    ['microphone', 'audioCapture'],
    ['background-sync', 'backgroundSync'],
    ['ambient-light-sensor', 'sensors'],
    ['accelerometer', 'sensors'],
    ['gyroscope', 'sensors'],
    ['magnetometer', 'sensors'],
    ['accessibility-events', 'accessibilityEvents'],
    ['clipboard-read', 'clipboardReadWrite'],
    ['clipboard-write', 'clipboardReadWrite'],
    ['clipboard-sanitized-write', 'clipboardSanitizedWrite'],
    ['payment-handler', 'paymentHandler'],
    ['persistent-storage', 'durableStorage'],
    ['idle-detection', 'idleDetection'],
    // chrome-specific permissions we have.
    ['midi-sysex', 'midiSysex'],
]);
/**
 * A Browser is created when Puppeteer connects to a browser instance, either through
 * {@link PuppeteerNode.launch} or {@link Puppeteer.connect}.
 *
 * @remarks
 *
 * The Browser class extends from Puppeteer's {@link EventEmitter} class and will
 * emit various events which are documented in the {@link BrowserEmittedEvents} enum.
 *
 * @example
 * An example of using a {@link Browser} to create a {@link Page}:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   await browser.close();
 * })();
 * ```
 *
 * @example
 * An example of disconnecting from and reconnecting to a {@link Browser}:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   // Store the endpoint to be able to reconnect to the browser.
 *   const browserWSEndpoint = browser.wsEndpoint();
 *   // Disconnect puppeteer from the browser.
 *   browser.disconnect();
 *
 *   // Use the endpoint to reestablish a connection
 *   const browser2 = await puppeteer.connect({browserWSEndpoint});
 *   // Close the browser.
 *   await browser2.close();
 * })();
 * ```
 *
 * @public
 */
export class Browser extends EventEmitter {
    /**
     * @internal
     */
    constructor() {
        super();
    }
    /**
     * @internal
     */
    _attach() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    _detach() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    get _targets() {
        throw new Error('Not implemented');
    }
    /**
     * The spawned browser process. Returns `null` if the browser instance was created with
     * {@link Puppeteer.connect}.
     */
    process() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    _getIsPageTargetCallback() {
        throw new Error('Not implemented');
    }
    createIncognitoBrowserContext() {
        throw new Error('Not implemented');
    }
    /**
     * Returns an array of all open browser contexts. In a newly created browser, this will
     * return a single instance of {@link BrowserContext}.
     */
    browserContexts() {
        throw new Error('Not implemented');
    }
    /**
     * Returns the default browser context. The default browser context cannot be closed.
     */
    defaultBrowserContext() {
        throw new Error('Not implemented');
    }
    _disposeContext() {
        throw new Error('Not implemented');
    }
    /**
     * The browser websocket endpoint which can be used as an argument to
     * {@link Puppeteer.connect}.
     *
     * @returns The Browser websocket url.
     *
     * @remarks
     *
     * The format is `ws://${host}:${port}/devtools/browser/<id>`.
     *
     * You can find the `webSocketDebuggerUrl` from `http://${host}:${port}/json/version`.
     * Learn more about the
     * {@link https://chromedevtools.github.io/devtools-protocol | devtools protocol} and
     * the {@link
     * https://chromedevtools.github.io/devtools-protocol/#how-do-i-access-the-browser-target
     * | browser endpoint}.
     */
    wsEndpoint() {
        throw new Error('Not implemented');
    }
    /**
     * Promise which resolves to a new {@link Page} object. The Page is created in
     * a default browser context.
     */
    newPage() {
        throw new Error('Not implemented');
    }
    _createPageInContext() {
        throw new Error('Not implemented');
    }
    /**
     * All active targets inside the Browser. In case of multiple browser contexts, returns
     * an array with all the targets in all browser contexts.
     */
    targets() {
        throw new Error('Not implemented');
    }
    /**
     * The target associated with the browser.
     */
    target() {
        throw new Error('Not implemented');
    }
    /**
     * Searches for a target in all browser contexts.
     *
     * @param predicate - A function to be run for every target.
     * @returns The first target found that matches the `predicate` function.
     *
     * @example
     *
     * An example of finding a target for a page opened via `window.open`:
     *
     * ```ts
     * await page.evaluate(() => window.open('https://www.example.com/'));
     * const newWindowTarget = await browser.waitForTarget(
     *   target => target.url() === 'https://www.example.com/'
     * );
     * ```
     */
    async waitForTarget(predicate, options = {}) {
        const { timeout = 30000 } = options;
        const targetDeferred = Deferred.create();
        this.on("targetcreated" /* BrowserEmittedEvents.TargetCreated */, check);
        this.on("targetchanged" /* BrowserEmittedEvents.TargetChanged */, check);
        try {
            this.targets().forEach(check);
            if (!timeout) {
                return await targetDeferred.valueOrThrow();
            }
            return await waitWithTimeout(targetDeferred.valueOrThrow(), 'target', timeout);
        }
        finally {
            this.off("targetcreated" /* BrowserEmittedEvents.TargetCreated */, check);
            this.off("targetchanged" /* BrowserEmittedEvents.TargetChanged */, check);
        }
        async function check(target) {
            if ((await predicate(target)) && !targetDeferred.resolved()) {
                targetDeferred.resolve(target);
            }
        }
    }
    /**
     * An array of all open pages inside the Browser.
     *
     * @remarks
     *
     * In case of multiple browser contexts, returns an array with all the pages in all
     * browser contexts. Non-visible pages, such as `"background_page"`, will not be listed
     * here. You can find them using {@link Target.page}.
     */
    async pages() {
        const contextPages = await Promise.all(this.browserContexts().map(context => {
            return context.pages();
        }));
        // Flatten array.
        return contextPages.reduce((acc, x) => {
            return acc.concat(x);
        }, []);
    }
    /**
     * A string representing the browser name and version.
     *
     * @remarks
     *
     * For headless browser, this is similar to `HeadlessChrome/61.0.3153.0`. For
     * non-headless or new-headless, this is similar to `Chrome/61.0.3153.0`. For
     * Firefox, it is similar to `Firefox/116.0a1`.
     *
     * The format of browser.version() might change with future releases of
     * browsers.
     */
    version() {
        throw new Error('Not implemented');
    }
    /**
     * The browser's original user agent. Pages can override the browser user agent with
     * {@link Page.setUserAgent}.
     */
    userAgent() {
        throw new Error('Not implemented');
    }
    /**
     * Closes the browser and all of its pages (if any were opened). The
     * {@link Browser} object itself is considered to be disposed and cannot be
     * used anymore.
     */
    close() {
        throw new Error('Not implemented');
    }
    /**
     * Disconnects Puppeteer from the browser, but leaves the browser process running.
     * After calling `disconnect`, the {@link Browser} object is considered disposed and
     * cannot be used anymore.
     */
    disconnect() {
        throw new Error('Not implemented');
    }
    /**
     * Indicates that the browser is connected.
     */
    isConnected() {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=Browser.js.map