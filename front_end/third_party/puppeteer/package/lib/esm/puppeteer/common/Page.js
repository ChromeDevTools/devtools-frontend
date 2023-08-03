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
import { Page, } from '../api/Page.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { Accessibility } from './Accessibility.js';
import { Binding } from './Binding.js';
import { CDPSessionEmittedEvents, isTargetClosedError, } from './Connection.js';
import { ConsoleMessage } from './ConsoleMessage.js';
import { Coverage } from './Coverage.js';
import { CDPDialog } from './Dialog.js';
import { EmulationManager } from './EmulationManager.js';
import { TargetCloseError } from './Errors.js';
import { FileChooser } from './FileChooser.js';
import { FrameManager, FrameManagerEmittedEvents } from './FrameManager.js';
import { CDPKeyboard, CDPMouse, CDPTouchscreen } from './Input.js';
import { MAIN_WORLD } from './IsolatedWorlds.js';
import { NetworkManagerEmittedEvents, } from './NetworkManager.js';
import { TimeoutSettings } from './TimeoutSettings.js';
import { Tracing } from './Tracing.js';
import { createClientError, createJSHandle, debugError, evaluationString, getReadableAsBuffer, getReadableFromProtocolStream, isString, pageBindingInitString, releaseObject, validateDialogType, valueFromRemoteObject, waitForEvent, waitWithTimeout, withSourcePuppeteerURLIfNone, } from './util.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export class CDPPage extends Page {
    /**
     * @internal
     */
    static async _create(client, target, ignoreHTTPSErrors, defaultViewport, screenshotTaskQueue) {
        const page = new CDPPage(client, target, ignoreHTTPSErrors, screenshotTaskQueue);
        await page.#initialize();
        if (defaultViewport) {
            try {
                await page.setViewport(defaultViewport);
            }
            catch (err) {
                if (isErrorLike(err) && isTargetClosedError(err)) {
                    debugError(err);
                }
                else {
                    throw err;
                }
            }
        }
        return page;
    }
    #closed = false;
    #client;
    #target;
    #keyboard;
    #mouse;
    #timeoutSettings = new TimeoutSettings();
    #touchscreen;
    #accessibility;
    #frameManager;
    #emulationManager;
    #tracing;
    #bindings = new Map();
    #exposedFunctions = new Map();
    #coverage;
    #viewport;
    #screenshotTaskQueue;
    #workers = new Map();
    #fileChooserDeferreds = new Set();
    #sessionCloseDeferred = Deferred.create();
    #serviceWorkerBypassed = false;
    #userDragInterceptionEnabled = false;
    /**
     * @internal
     */
    constructor(client, target, ignoreHTTPSErrors, screenshotTaskQueue) {
        super();
        this.#client = client;
        this.#target = target;
        this.#keyboard = new CDPKeyboard(client);
        this.#mouse = new CDPMouse(client, this.#keyboard);
        this.#touchscreen = new CDPTouchscreen(client, this.#keyboard);
        this.#accessibility = new Accessibility(client);
        this.#frameManager = new FrameManager(client, this, ignoreHTTPSErrors, this.#timeoutSettings);
        this.#emulationManager = new EmulationManager(client);
        this.#tracing = new Tracing(client);
        this.#coverage = new Coverage(client);
        this.#screenshotTaskQueue = screenshotTaskQueue;
        this.#viewport = null;
        this.#target
            ._targetManager()
            .addTargetInterceptor(this.#client, this.#onAttachedToTarget);
        this.#target
            ._targetManager()
            .on("targetGone" /* TargetManagerEmittedEvents.TargetGone */, this.#onDetachedFromTarget);
        this.#frameManager.on(FrameManagerEmittedEvents.FrameAttached, event => {
            return this.emit("frameattached" /* PageEmittedEvents.FrameAttached */, event);
        });
        this.#frameManager.on(FrameManagerEmittedEvents.FrameDetached, event => {
            return this.emit("framedetached" /* PageEmittedEvents.FrameDetached */, event);
        });
        this.#frameManager.on(FrameManagerEmittedEvents.FrameNavigated, event => {
            return this.emit("framenavigated" /* PageEmittedEvents.FrameNavigated */, event);
        });
        const networkManager = this.#frameManager.networkManager;
        networkManager.on(NetworkManagerEmittedEvents.Request, event => {
            return this.emit("request" /* PageEmittedEvents.Request */, event);
        });
        networkManager.on(NetworkManagerEmittedEvents.RequestServedFromCache, event => {
            return this.emit("requestservedfromcache" /* PageEmittedEvents.RequestServedFromCache */, event);
        });
        networkManager.on(NetworkManagerEmittedEvents.Response, event => {
            return this.emit("response" /* PageEmittedEvents.Response */, event);
        });
        networkManager.on(NetworkManagerEmittedEvents.RequestFailed, event => {
            return this.emit("requestfailed" /* PageEmittedEvents.RequestFailed */, event);
        });
        networkManager.on(NetworkManagerEmittedEvents.RequestFinished, event => {
            return this.emit("requestfinished" /* PageEmittedEvents.RequestFinished */, event);
        });
        client.once(CDPSessionEmittedEvents.Disconnected, () => {
            return this.#sessionCloseDeferred.resolve(new TargetCloseError('Target closed'));
        });
        client.on('Page.domContentEventFired', () => {
            return this.emit("domcontentloaded" /* PageEmittedEvents.DOMContentLoaded */);
        });
        client.on('Page.loadEventFired', () => {
            return this.emit("load" /* PageEmittedEvents.Load */);
        });
        client.on('Runtime.consoleAPICalled', event => {
            return this.#onConsoleAPI(event);
        });
        client.on('Runtime.bindingCalled', event => {
            return this.#onBindingCalled(event);
        });
        client.on('Page.javascriptDialogOpening', event => {
            return this.#onDialog(event);
        });
        client.on('Runtime.exceptionThrown', exception => {
            return this.#handleException(exception.exceptionDetails);
        });
        client.on('Inspector.targetCrashed', () => {
            return this.#onTargetCrashed();
        });
        client.on('Performance.metrics', event => {
            return this.#emitMetrics(event);
        });
        client.on('Log.entryAdded', event => {
            return this.#onLogEntryAdded(event);
        });
        client.on('Page.fileChooserOpened', event => {
            return this.#onFileChooser(event);
        });
        this.#target._isClosedDeferred
            .valueOrThrow()
            .then(() => {
            this.#target
                ._targetManager()
                .removeTargetInterceptor(this.#client, this.#onAttachedToTarget);
            this.#target
                ._targetManager()
                .off("targetGone" /* TargetManagerEmittedEvents.TargetGone */, this.#onDetachedFromTarget);
            this.emit("close" /* PageEmittedEvents.Close */);
            this.#closed = true;
        })
            .catch(debugError);
    }
    #onDetachedFromTarget = (target) => {
        const sessionId = target._session()?.id();
        const worker = this.#workers.get(sessionId);
        if (!worker) {
            return;
        }
        this.#workers.delete(sessionId);
        this.emit("workerdestroyed" /* PageEmittedEvents.WorkerDestroyed */, worker);
    };
    #onAttachedToTarget = (createdTarget) => {
        this.#frameManager.onAttachedToTarget(createdTarget);
        if (createdTarget._getTargetInfo().type === 'worker') {
            const session = createdTarget._session();
            assert(session);
            const worker = new WebWorker(session, createdTarget.url(), this.#addConsoleMessage.bind(this), this.#handleException.bind(this));
            this.#workers.set(session.id(), worker);
            this.emit("workercreated" /* PageEmittedEvents.WorkerCreated */, worker);
        }
        if (createdTarget._session()) {
            this.#target
                ._targetManager()
                .addTargetInterceptor(createdTarget._session(), this.#onAttachedToTarget);
        }
    };
    async #initialize() {
        try {
            await Promise.all([
                this.#frameManager.initialize(),
                this.#client.send('Performance.enable'),
                this.#client.send('Log.enable'),
            ]);
        }
        catch (err) {
            if (isErrorLike(err) && isTargetClosedError(err)) {
                debugError(err);
            }
            else {
                throw err;
            }
        }
    }
    async #onFileChooser(event) {
        if (!this.#fileChooserDeferreds.size) {
            return;
        }
        const frame = this.#frameManager.frame(event.frameId);
        assert(frame, 'This should never happen.');
        // This is guaranteed to be an HTMLInputElement handle by the event.
        const handle = (await frame.worlds[MAIN_WORLD].adoptBackendNode(event.backendNodeId));
        const fileChooser = new FileChooser(handle, event);
        for (const promise of this.#fileChooserDeferreds) {
            promise.resolve(fileChooser);
        }
        this.#fileChooserDeferreds.clear();
    }
    /**
     * @internal
     */
    _client() {
        return this.#client;
    }
    isServiceWorkerBypassed() {
        return this.#serviceWorkerBypassed;
    }
    isDragInterceptionEnabled() {
        return this.#userDragInterceptionEnabled;
    }
    isJavaScriptEnabled() {
        return this.#emulationManager.javascriptEnabled;
    }
    waitForFileChooser(options = {}) {
        const needsEnable = this.#fileChooserDeferreds.size === 0;
        const { timeout = this.#timeoutSettings.timeout() } = options;
        const deferred = Deferred.create({
            message: `Waiting for \`FileChooser\` failed: ${timeout}ms exceeded`,
            timeout,
        });
        this.#fileChooserDeferreds.add(deferred);
        let enablePromise;
        if (needsEnable) {
            enablePromise = this.#client.send('Page.setInterceptFileChooserDialog', {
                enabled: true,
            });
        }
        return Promise.all([deferred.valueOrThrow(), enablePromise])
            .then(([result]) => {
            return result;
        })
            .catch(error => {
            this.#fileChooserDeferreds.delete(deferred);
            throw error;
        });
    }
    async setGeolocation(options) {
        return await this.#emulationManager.setGeolocation(options);
    }
    target() {
        return this.#target;
    }
    browser() {
        return this.#target.browser();
    }
    browserContext() {
        return this.#target.browserContext();
    }
    #onTargetCrashed() {
        this.emit('error', new Error('Page crashed!'));
    }
    #onLogEntryAdded(event) {
        const { level, text, args, source, url, lineNumber } = event.entry;
        if (args) {
            args.map(arg => {
                return releaseObject(this.#client, arg);
            });
        }
        if (source !== 'worker') {
            this.emit("console" /* PageEmittedEvents.Console */, new ConsoleMessage(level, text, [], [{ url, lineNumber }]));
        }
    }
    mainFrame() {
        return this.#frameManager.mainFrame();
    }
    get keyboard() {
        return this.#keyboard;
    }
    get touchscreen() {
        return this.#touchscreen;
    }
    get coverage() {
        return this.#coverage;
    }
    get tracing() {
        return this.#tracing;
    }
    get accessibility() {
        return this.#accessibility;
    }
    frames() {
        return this.#frameManager.frames();
    }
    workers() {
        return Array.from(this.#workers.values());
    }
    async setRequestInterception(value) {
        return this.#frameManager.networkManager.setRequestInterception(value);
    }
    async setBypassServiceWorker(bypass) {
        this.#serviceWorkerBypassed = bypass;
        return this.#client.send('Network.setBypassServiceWorker', { bypass });
    }
    async setDragInterception(enabled) {
        this.#userDragInterceptionEnabled = enabled;
        return this.#client.send('Input.setInterceptDrags', { enabled });
    }
    setOfflineMode(enabled) {
        return this.#frameManager.networkManager.setOfflineMode(enabled);
    }
    emulateNetworkConditions(networkConditions) {
        return this.#frameManager.networkManager.emulateNetworkConditions(networkConditions);
    }
    setDefaultNavigationTimeout(timeout) {
        this.#timeoutSettings.setDefaultNavigationTimeout(timeout);
    }
    setDefaultTimeout(timeout) {
        this.#timeoutSettings.setDefaultTimeout(timeout);
    }
    getDefaultTimeout() {
        return this.#timeoutSettings.timeout();
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        const context = await this.mainFrame().executionContext();
        return context.evaluateHandle(pageFunction, ...args);
    }
    async queryObjects(prototypeHandle) {
        const context = await this.mainFrame().executionContext();
        assert(!prototypeHandle.disposed, 'Prototype JSHandle is disposed!');
        assert(prototypeHandle.id, 'Prototype JSHandle must not be referencing primitive value');
        const response = await context._client.send('Runtime.queryObjects', {
            prototypeObjectId: prototypeHandle.id,
        });
        return createJSHandle(context, response.objects);
    }
    async cookies(...urls) {
        const originalCookies = (await this.#client.send('Network.getCookies', {
            urls: urls.length ? urls : [this.url()],
        })).cookies;
        const unsupportedCookieAttributes = ['priority'];
        const filterUnsupportedAttributes = (cookie) => {
            for (const attr of unsupportedCookieAttributes) {
                delete cookie[attr];
            }
            return cookie;
        };
        return originalCookies.map(filterUnsupportedAttributes);
    }
    async deleteCookie(...cookies) {
        const pageURL = this.url();
        for (const cookie of cookies) {
            const item = Object.assign({}, cookie);
            if (!cookie.url && pageURL.startsWith('http')) {
                item.url = pageURL;
            }
            await this.#client.send('Network.deleteCookies', item);
        }
    }
    async setCookie(...cookies) {
        const pageURL = this.url();
        const startsWithHTTP = pageURL.startsWith('http');
        const items = cookies.map(cookie => {
            const item = Object.assign({}, cookie);
            if (!item.url && startsWithHTTP) {
                item.url = pageURL;
            }
            assert(item.url !== 'about:blank', `Blank page can not have cookie "${item.name}"`);
            assert(!String.prototype.startsWith.call(item.url || '', 'data:'), `Data URL page can not have cookie "${item.name}"`);
            return item;
        });
        await this.deleteCookie(...items);
        if (items.length) {
            await this.#client.send('Network.setCookies', { cookies: items });
        }
    }
    async exposeFunction(name, pptrFunction) {
        if (this.#bindings.has(name)) {
            throw new Error(`Failed to add page binding with name ${name}: window['${name}'] already exists!`);
        }
        let binding;
        switch (typeof pptrFunction) {
            case 'function':
                binding = new Binding(name, pptrFunction);
                break;
            default:
                binding = new Binding(name, pptrFunction.default);
                break;
        }
        this.#bindings.set(name, binding);
        const expression = pageBindingInitString('exposedFun', name);
        await this.#client.send('Runtime.addBinding', { name });
        const { identifier } = await this.#client.send('Page.addScriptToEvaluateOnNewDocument', {
            source: expression,
        });
        this.#exposedFunctions.set(name, identifier);
        await Promise.all(this.frames().map(frame => {
            return frame.evaluate(expression).catch(debugError);
        }));
    }
    async removeExposedFunction(name) {
        const exposedFun = this.#exposedFunctions.get(name);
        if (!exposedFun) {
            throw new Error(`Failed to remove page binding with name ${name}: window['${name}'] does not exists!`);
        }
        await this.#client.send('Runtime.removeBinding', { name });
        await this.removeScriptToEvaluateOnNewDocument(exposedFun);
        await Promise.all(this.frames().map(frame => {
            return frame
                .evaluate(name => {
                // Removes the dangling Puppeteer binding wrapper.
                // @ts-expect-error: In a different context.
                globalThis[name] = undefined;
            }, name)
                .catch(debugError);
        }));
        this.#exposedFunctions.delete(name);
        this.#bindings.delete(name);
    }
    async authenticate(credentials) {
        return this.#frameManager.networkManager.authenticate(credentials);
    }
    async setExtraHTTPHeaders(headers) {
        return this.#frameManager.networkManager.setExtraHTTPHeaders(headers);
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        return this.#frameManager.networkManager.setUserAgent(userAgent, userAgentMetadata);
    }
    async metrics() {
        const response = await this.#client.send('Performance.getMetrics');
        return this.#buildMetricsObject(response.metrics);
    }
    #emitMetrics(event) {
        this.emit("metrics" /* PageEmittedEvents.Metrics */, {
            title: event.title,
            metrics: this.#buildMetricsObject(event.metrics),
        });
    }
    #buildMetricsObject(metrics) {
        const result = {};
        for (const metric of metrics || []) {
            if (supportedMetrics.has(metric.name)) {
                result[metric.name] = metric.value;
            }
        }
        return result;
    }
    #handleException(exceptionDetails) {
        this.emit("pageerror" /* PageEmittedEvents.PageError */, createClientError(exceptionDetails));
    }
    async #onConsoleAPI(event) {
        if (event.executionContextId === 0) {
            // DevTools protocol stores the last 1000 console messages. These
            // messages are always reported even for removed execution contexts. In
            // this case, they are marked with executionContextId = 0 and are
            // reported upon enabling Runtime agent.
            //
            // Ignore these messages since:
            // - there's no execution context we can use to operate with message
            //   arguments
            // - these messages are reported before Puppeteer clients can subscribe
            //   to the 'console'
            //   page event.
            //
            // @see https://github.com/puppeteer/puppeteer/issues/3865
            return;
        }
        const context = this.#frameManager.getExecutionContextById(event.executionContextId, this.#client);
        if (!context) {
            debugError(new Error(`ExecutionContext not found for a console message: ${JSON.stringify(event)}`));
            return;
        }
        const values = event.args.map(arg => {
            return createJSHandle(context, arg);
        });
        this.#addConsoleMessage(event.type, values, event.stackTrace);
    }
    async #onBindingCalled(event) {
        let payload;
        try {
            payload = JSON.parse(event.payload);
        }
        catch {
            // The binding was either called by something in the page or it was
            // called before our wrapper was initialized.
            return;
        }
        const { type, name, seq, args, isTrivial } = payload;
        if (type !== 'exposedFun') {
            return;
        }
        const context = this.#frameManager.executionContextById(event.executionContextId, this.#client);
        if (!context) {
            return;
        }
        const binding = this.#bindings.get(name);
        await binding?.run(context, seq, args, isTrivial);
    }
    #addConsoleMessage(eventType, args, stackTrace) {
        if (!this.listenerCount("console" /* PageEmittedEvents.Console */)) {
            args.forEach(arg => {
                return arg.dispose();
            });
            return;
        }
        const textTokens = [];
        for (const arg of args) {
            const remoteObject = arg.remoteObject();
            if (remoteObject.objectId) {
                textTokens.push(arg.toString());
            }
            else {
                textTokens.push(valueFromRemoteObject(remoteObject));
            }
        }
        const stackTraceLocations = [];
        if (stackTrace) {
            for (const callFrame of stackTrace.callFrames) {
                stackTraceLocations.push({
                    url: callFrame.url,
                    lineNumber: callFrame.lineNumber,
                    columnNumber: callFrame.columnNumber,
                });
            }
        }
        const message = new ConsoleMessage(eventType, textTokens.join(' '), args, stackTraceLocations);
        this.emit("console" /* PageEmittedEvents.Console */, message);
    }
    #onDialog(event) {
        const type = validateDialogType(event.type);
        const dialog = new CDPDialog(this.#client, type, event.message, event.defaultPrompt);
        this.emit("dialog" /* PageEmittedEvents.Dialog */, dialog);
    }
    url() {
        return this.mainFrame().url();
    }
    async content() {
        return await this.mainFrame().content();
    }
    async setContent(html, options = {}) {
        await this.mainFrame().setContent(html, options);
    }
    async goto(url, options = {}) {
        return await this.mainFrame().goto(url, options);
    }
    async reload(options) {
        const result = await Promise.all([
            this.waitForNavigation(options),
            this.#client.send('Page.reload'),
        ]);
        return result[0];
    }
    async createCDPSession() {
        return await this.target().createCDPSession();
    }
    async waitForRequest(urlOrPredicate, options = {}) {
        const { timeout = this.#timeoutSettings.timeout() } = options;
        return waitForEvent(this.#frameManager.networkManager, NetworkManagerEmittedEvents.Request, async (request) => {
            if (isString(urlOrPredicate)) {
                return urlOrPredicate === request.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(request));
            }
            return false;
        }, timeout, this.#sessionCloseDeferred.valueOrThrow());
    }
    async waitForResponse(urlOrPredicate, options = {}) {
        const { timeout = this.#timeoutSettings.timeout() } = options;
        return waitForEvent(this.#frameManager.networkManager, NetworkManagerEmittedEvents.Response, async (response) => {
            if (isString(urlOrPredicate)) {
                return urlOrPredicate === response.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(response));
            }
            return false;
        }, timeout, this.#sessionCloseDeferred.valueOrThrow());
    }
    async waitForNetworkIdle(options = {}) {
        const { idleTime = 500, timeout = this.#timeoutSettings.timeout() } = options;
        await this._waitForNetworkIdle(this.#frameManager.networkManager, idleTime, timeout, this.#sessionCloseDeferred);
    }
    async waitForFrame(urlOrPredicate, options = {}) {
        const { timeout = this.#timeoutSettings.timeout() } = options;
        let predicate;
        if (isString(urlOrPredicate)) {
            predicate = (frame) => {
                return Promise.resolve(urlOrPredicate === frame.url());
            };
        }
        else {
            predicate = (frame) => {
                const value = urlOrPredicate(frame);
                if (typeof value === 'boolean') {
                    return Promise.resolve(value);
                }
                return value;
            };
        }
        const eventRace = Deferred.race([
            waitForEvent(this.#frameManager, FrameManagerEmittedEvents.FrameAttached, predicate, timeout, this.#sessionCloseDeferred.valueOrThrow()),
            waitForEvent(this.#frameManager, FrameManagerEmittedEvents.FrameNavigated, predicate, timeout, this.#sessionCloseDeferred.valueOrThrow()),
            ...this.frames().map(async (frame) => {
                if (await predicate(frame)) {
                    return frame;
                }
                return await eventRace;
            }),
        ]);
        return eventRace;
    }
    async goBack(options = {}) {
        return this.#go(-1, options);
    }
    async goForward(options = {}) {
        return this.#go(+1, options);
    }
    async #go(delta, options) {
        const history = await this.#client.send('Page.getNavigationHistory');
        const entry = history.entries[history.currentIndex + delta];
        if (!entry) {
            return null;
        }
        const result = await Promise.all([
            this.waitForNavigation(options),
            this.#client.send('Page.navigateToHistoryEntry', { entryId: entry.id }),
        ]);
        return result[0];
    }
    async bringToFront() {
        await this.#client.send('Page.bringToFront');
    }
    async setJavaScriptEnabled(enabled) {
        return await this.#emulationManager.setJavaScriptEnabled(enabled);
    }
    async setBypassCSP(enabled) {
        await this.#client.send('Page.setBypassCSP', { enabled });
    }
    async emulateMediaType(type) {
        return await this.#emulationManager.emulateMediaType(type);
    }
    async emulateCPUThrottling(factor) {
        return await this.#emulationManager.emulateCPUThrottling(factor);
    }
    async emulateMediaFeatures(features) {
        return await this.#emulationManager.emulateMediaFeatures(features);
    }
    async emulateTimezone(timezoneId) {
        return await this.#emulationManager.emulateTimezone(timezoneId);
    }
    async emulateIdleState(overrides) {
        return await this.#emulationManager.emulateIdleState(overrides);
    }
    async emulateVisionDeficiency(type) {
        return await this.#emulationManager.emulateVisionDeficiency(type);
    }
    async setViewport(viewport) {
        const needsReload = await this.#emulationManager.emulateViewport(viewport);
        this.#viewport = viewport;
        if (needsReload) {
            await this.reload();
        }
    }
    viewport() {
        return this.#viewport;
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
        return this.mainFrame().evaluate(pageFunction, ...args);
    }
    async evaluateOnNewDocument(pageFunction, ...args) {
        const source = evaluationString(pageFunction, ...args);
        const { identifier } = await this.#client.send('Page.addScriptToEvaluateOnNewDocument', {
            source,
        });
        return { identifier };
    }
    async removeScriptToEvaluateOnNewDocument(identifier) {
        await this.#client.send('Page.removeScriptToEvaluateOnNewDocument', {
            identifier,
        });
    }
    async setCacheEnabled(enabled = true) {
        await this.#frameManager.networkManager.setCacheEnabled(enabled);
    }
    async screenshot(options = {}) {
        let screenshotType = "png" /* Protocol.Page.CaptureScreenshotRequestFormat.Png */;
        // options.type takes precedence over inferring the type from options.path
        // because it may be a 0-length file with no extension created beforehand
        // (i.e. as a temp file).
        if (options.type) {
            screenshotType =
                options.type;
        }
        else if (options.path) {
            const filePath = options.path;
            const extension = filePath
                .slice(filePath.lastIndexOf('.') + 1)
                .toLowerCase();
            switch (extension) {
                case 'png':
                    screenshotType = "png" /* Protocol.Page.CaptureScreenshotRequestFormat.Png */;
                    break;
                case 'jpeg':
                case 'jpg':
                    screenshotType = "jpeg" /* Protocol.Page.CaptureScreenshotRequestFormat.Jpeg */;
                    break;
                case 'webp':
                    screenshotType = "webp" /* Protocol.Page.CaptureScreenshotRequestFormat.Webp */;
                    break;
                default:
                    throw new Error(`Unsupported screenshot type for extension \`.${extension}\``);
            }
        }
        if (options.quality) {
            assert(screenshotType === "jpeg" /* Protocol.Page.CaptureScreenshotRequestFormat.Jpeg */ ||
                screenshotType === "webp" /* Protocol.Page.CaptureScreenshotRequestFormat.Webp */, 'options.quality is unsupported for the ' +
                screenshotType +
                ' screenshots');
            assert(typeof options.quality === 'number', 'Expected options.quality to be a number but found ' +
                typeof options.quality);
            assert(Number.isInteger(options.quality), 'Expected options.quality to be an integer');
            assert(options.quality >= 0 && options.quality <= 100, 'Expected options.quality to be between 0 and 100 (inclusive), got ' +
                options.quality);
        }
        assert(!options.clip || !options.fullPage, 'options.clip and options.fullPage are exclusive');
        if (options.clip) {
            assert(typeof options.clip.x === 'number', 'Expected options.clip.x to be a number but found ' +
                typeof options.clip.x);
            assert(typeof options.clip.y === 'number', 'Expected options.clip.y to be a number but found ' +
                typeof options.clip.y);
            assert(typeof options.clip.width === 'number', 'Expected options.clip.width to be a number but found ' +
                typeof options.clip.width);
            assert(typeof options.clip.height === 'number', 'Expected options.clip.height to be a number but found ' +
                typeof options.clip.height);
            assert(options.clip.width !== 0, 'Expected options.clip.width not to be 0.');
            assert(options.clip.height !== 0, 'Expected options.clip.height not to be 0.');
        }
        return this.#screenshotTaskQueue.postTask(() => {
            return this.#screenshotTask(screenshotType, options);
        });
    }
    async #screenshotTask(format, options = {}) {
        await this.#client.send('Target.activateTarget', {
            targetId: this.#target._targetId,
        });
        let clip = options.clip ? processClip(options.clip) : undefined;
        let captureBeyondViewport = options.captureBeyondViewport ?? true;
        const fromSurface = options.fromSurface;
        if (options.fullPage) {
            // Overwrite clip for full page.
            clip = undefined;
            if (!captureBeyondViewport) {
                const metrics = await this.#client.send('Page.getLayoutMetrics');
                // Fallback to `contentSize` in case of using Firefox.
                const { width, height } = metrics.cssContentSize || metrics.contentSize;
                const { isMobile = false, deviceScaleFactor = 1, isLandscape = false, } = this.#viewport || {};
                const screenOrientation = isLandscape
                    ? { angle: 90, type: 'landscapePrimary' }
                    : { angle: 0, type: 'portraitPrimary' };
                await this.#client.send('Emulation.setDeviceMetricsOverride', {
                    mobile: isMobile,
                    width,
                    height,
                    deviceScaleFactor,
                    screenOrientation,
                });
            }
        }
        else if (!clip) {
            captureBeyondViewport = false;
        }
        const shouldSetDefaultBackground = options.omitBackground && (format === 'png' || format === 'webp');
        if (shouldSetDefaultBackground) {
            await this.#emulationManager.setTransparentBackgroundColor();
        }
        const result = await this.#client.send('Page.captureScreenshot', {
            format,
            optimizeForSpeed: options.optimizeForSpeed,
            quality: options.quality,
            clip: clip && {
                ...clip,
                scale: clip.scale ?? 1,
            },
            captureBeyondViewport,
            fromSurface,
        });
        if (shouldSetDefaultBackground) {
            await this.#emulationManager.resetDefaultBackgroundColor();
        }
        if (options.fullPage && this.#viewport) {
            await this.setViewport(this.#viewport);
        }
        if (options.encoding === 'base64') {
            return result.data;
        }
        const buffer = Buffer.from(result.data, 'base64');
        await this._maybeWriteBufferToFile(options.path, buffer);
        return buffer;
        function processClip(clip) {
            const x = Math.round(clip.x);
            const y = Math.round(clip.y);
            const width = Math.round(clip.width + clip.x - x);
            const height = Math.round(clip.height + clip.y - y);
            return { x, y, width, height, scale: clip.scale };
        }
    }
    async createPDFStream(options = {}) {
        const { landscape, displayHeaderFooter, headerTemplate, footerTemplate, printBackground, scale, width: paperWidth, height: paperHeight, margin, pageRanges, preferCSSPageSize, omitBackground, timeout, } = this._getPDFOptions(options);
        if (omitBackground) {
            await this.#emulationManager.setTransparentBackgroundColor();
        }
        const printCommandPromise = this.#client.send('Page.printToPDF', {
            transferMode: 'ReturnAsStream',
            landscape,
            displayHeaderFooter,
            headerTemplate,
            footerTemplate,
            printBackground,
            scale,
            paperWidth,
            paperHeight,
            marginTop: margin.top,
            marginBottom: margin.bottom,
            marginLeft: margin.left,
            marginRight: margin.right,
            pageRanges,
            preferCSSPageSize,
        });
        const result = await waitWithTimeout(printCommandPromise, 'Page.printToPDF', timeout);
        if (omitBackground) {
            await this.#emulationManager.resetDefaultBackgroundColor();
        }
        assert(result.stream, '`stream` is missing from `Page.printToPDF');
        return getReadableFromProtocolStream(this.#client, result.stream);
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const readable = await this.createPDFStream(options);
        const buffer = await getReadableAsBuffer(readable, path);
        assert(buffer, 'Could not create buffer');
        return buffer;
    }
    async title() {
        return this.mainFrame().title();
    }
    async close(options = { runBeforeUnload: undefined }) {
        const connection = this.#client.connection();
        assert(connection, 'Protocol error: Connection closed. Most likely the page has been closed.');
        const runBeforeUnload = !!options.runBeforeUnload;
        if (runBeforeUnload) {
            await this.#client.send('Page.close');
        }
        else {
            await connection.send('Target.closeTarget', {
                targetId: this.#target._targetId,
            });
            await this.#target._isClosedDeferred.valueOrThrow();
        }
    }
    isClosed() {
        return this.#closed;
    }
    get mouse() {
        return this.#mouse;
    }
    /**
     * This method is typically coupled with an action that triggers a device
     * request from an api such as WebBluetooth.
     *
     * :::caution
     *
     * This must be called before the device request is made. It will not return a
     * currently active device prompt.
     *
     * :::
     *
     * @example
     *
     * ```ts
     * const [devicePrompt] = Promise.all([
     *   page.waitForDevicePrompt(),
     *   page.click('#connect-bluetooth'),
     * ]);
     * await devicePrompt.select(
     *   await devicePrompt.waitForDevice(({name}) => name.includes('My Device'))
     * );
     * ```
     */
    waitForDevicePrompt(options = {}) {
        return this.mainFrame().waitForDevicePrompt(options);
    }
}
const supportedMetrics = new Set([
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
//# sourceMappingURL=Page.js.map