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
import { debugError, waitWithTimeout } from '../common/util.js';
import { Deferred } from '../util/Deferred.js';
import { asyncDisposeSymbol, disposeSymbol } from '../util/disposable.js';
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
 * {@link Browser} represents a browser instance that is either:
 *
 * - connected to via {@link Puppeteer.connect} or
 * - launched by {@link PuppeteerNode.launch}.
 *
 * {@link Browser} {@link EventEmitter | emits} various events which are
 * documented in the {@link BrowserEvent} enum.
 *
 * @example Using a {@link Browser} to create a {@link Page}:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * const browser = await puppeteer.launch();
 * const page = await browser.newPage();
 * await page.goto('https://example.com');
 * await browser.close();
 * ```
 *
 * @example Disconnecting from and reconnecting to a {@link Browser}:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * const browser = await puppeteer.launch();
 * // Store the endpoint to be able to reconnect to the browser.
 * const browserWSEndpoint = browser.wsEndpoint();
 * // Disconnect puppeteer from the browser.
 * browser.disconnect();
 *
 * // Use the endpoint to reestablish a connection
 * const browser2 = await puppeteer.connect({browserWSEndpoint});
 * // Close the browser.
 * await browser2.close();
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
     * Gets the associated
     * {@link https://nodejs.org/api/child_process.html#class-childprocess | ChildProcess}.
     *
     * @returns `null` if this instance was connected to via
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
    _disposeContext() {
        throw new Error('Not implemented');
    }
    _createPageInContext() {
        throw new Error('Not implemented');
    }
    /**
     * Waits until a {@link Target | target} matching the given `predicate`
     * appears and returns it.
     *
     * This will look all open {@link BrowserContext | browser contexts}.
     *
     * @example Finding a target for a page opened via `window.open`:
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
        this.on("targetcreated" /* BrowserEvent.TargetCreated */, check);
        this.on("targetchanged" /* BrowserEvent.TargetChanged */, check);
        try {
            this.targets().forEach(check);
            if (!timeout) {
                return await targetDeferred.valueOrThrow();
            }
            return await waitWithTimeout(targetDeferred.valueOrThrow(), 'target', timeout);
        }
        finally {
            this.off("targetcreated" /* BrowserEvent.TargetCreated */, check);
            this.off("targetchanged" /* BrowserEvent.TargetChanged */, check);
        }
        async function check(target) {
            if ((await predicate(target)) && !targetDeferred.resolved()) {
                targetDeferred.resolve(target);
            }
        }
    }
    /**
     * Gets a list of all open {@link Page | pages} inside this {@link Browser}.
     *
     * If there ar multiple {@link BrowserContext | browser contexts}, this
     * returns all {@link Page | pages} in all
     * {@link BrowserContext | browser contexts}.
     *
     * @remarks Non-visible {@link Page | pages}, such as `"background_page"`,
     * will not be listed here. You can find them using {@link Target.page}.
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
     * Gets this {@link Browser | browser's} original user agent.
     *
     * {@link Page | Pages} can override the user agent with
     * {@link Page.setUserAgent}.
     */
    userAgent() {
        throw new Error('Not implemented');
    }
    /**
     * Disconnects Puppeteer from this {@link Browser | browser}, but leaves the
     * process running.
     */
    disconnect() {
        throw new Error('Not implemented');
    }
    /**
     * Whether Puppeteer is connected to this {@link Browser | browser}.
     *
     * @deprecated Use {@link Browser.connected}.
     */
    isConnected() {
        return this.connected;
    }
    /** @internal */
    [disposeSymbol]() {
        return void this.close().catch(debugError);
    }
    /** @internal */
    [asyncDisposeSymbol]() {
        return this.close();
    }
}
//# sourceMappingURL=Browser.js.map