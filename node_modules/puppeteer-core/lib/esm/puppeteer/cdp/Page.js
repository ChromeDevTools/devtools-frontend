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
import { CDPSessionEvent } from '../api/CDPSession.js';
import { Page, } from '../api/Page.js';
import { ConsoleMessage, } from '../common/ConsoleMessage.js';
import { TargetCloseError } from '../common/Errors.js';
import { FileChooser } from '../common/FileChooser.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { createClientError, debugError, evaluationString, getReadableAsBuffer, getReadableFromProtocolStream, isString, pageBindingInitString, validateDialogType, valueFromRemoteObject, waitForEvent, waitWithTimeout, } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { AsyncDisposableStack } from '../util/disposable.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { Accessibility } from './Accessibility.js';
import { Binding } from './Binding.js';
import { CdpCDPSession } from './CDPSession.js';
import { isTargetClosedError } from './Connection.js';
import { Coverage } from './Coverage.js';
import { CdpDialog } from './Dialog.js';
import { EmulationManager } from './EmulationManager.js';
import { createCdpHandle, releaseObject } from './ExecutionContext.js';
import { FirefoxTargetManager } from './FirefoxTargetManager.js';
import { FrameManager, FrameManagerEvent } from './FrameManager.js';
import { CdpKeyboard, CdpMouse, CdpTouchscreen } from './Input.js';
import { MAIN_WORLD } from './IsolatedWorlds.js';
import { NetworkManagerEvent, } from './NetworkManager.js';
import { Tracing } from './Tracing.js';
import { WebWorker } from './WebWorker.js';
/**
 * @internal
 */
export class CdpPage extends Page {
    static async _create(client, target, ignoreHTTPSErrors, defaultViewport) {
        const page = new CdpPage(client, target, ignoreHTTPSErrors);
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
    #tabSession;
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
    #workers = new Map();
    #fileChooserDeferreds = new Set();
    #sessionCloseDeferred = Deferred.create();
    #serviceWorkerBypassed = false;
    #userDragInterceptionEnabled = false;
    #frameManagerHandlers = [
        [
            FrameManagerEvent.FrameAttached,
            (frame) => {
                this.emit("frameattached" /* PageEvent.FrameAttached */, frame);
            },
        ],
        [
            FrameManagerEvent.FrameDetached,
            (frame) => {
                this.emit("framedetached" /* PageEvent.FrameDetached */, frame);
            },
        ],
        [
            FrameManagerEvent.FrameNavigated,
            (frame) => {
                this.emit("framenavigated" /* PageEvent.FrameNavigated */, frame);
            },
        ],
    ];
    #networkManagerHandlers = [
        [
            NetworkManagerEvent.Request,
            (request) => {
                this.emit("request" /* PageEvent.Request */, request);
            },
        ],
        [
            NetworkManagerEvent.RequestServedFromCache,
            (request) => {
                this.emit("requestservedfromcache" /* PageEvent.RequestServedFromCache */, request);
            },
        ],
        [
            NetworkManagerEvent.Response,
            (response) => {
                this.emit("response" /* PageEvent.Response */, response);
            },
        ],
        [
            NetworkManagerEvent.RequestFailed,
            (request) => {
                this.emit("requestfailed" /* PageEvent.RequestFailed */, request);
            },
        ],
        [
            NetworkManagerEvent.RequestFinished,
            (request) => {
                this.emit("requestfinished" /* PageEvent.RequestFinished */, request);
            },
        ],
    ];
    #sessionHandlers = [
        [
            CDPSessionEvent.Disconnected,
            () => {
                this.#sessionCloseDeferred.resolve(new TargetCloseError('Target closed'));
            },
        ],
        [
            'Page.domContentEventFired',
            () => {
                return this.emit("domcontentloaded" /* PageEvent.DOMContentLoaded */, undefined);
            },
        ],
        [
            'Page.loadEventFired',
            () => {
                return this.emit("load" /* PageEvent.Load */, undefined);
            },
        ],
        ['Runtime.consoleAPICalled', this.#onConsoleAPI.bind(this)],
        ['Runtime.bindingCalled', this.#onBindingCalled.bind(this)],
        ['Page.javascriptDialogOpening', this.#onDialog.bind(this)],
        ['Runtime.exceptionThrown', this.#handleException.bind(this)],
        ['Inspector.targetCrashed', this.#onTargetCrashed.bind(this)],
        ['Performance.metrics', this.#emitMetrics.bind(this)],
        ['Log.entryAdded', this.#onLogEntryAdded.bind(this)],
        ['Page.fileChooserOpened', this.#onFileChooser.bind(this)],
    ];
    constructor(client, target, ignoreHTTPSErrors) {
        super();
        this.#client = client;
        this.#tabSession = client.parentSession();
        this.#target = target;
        this.#keyboard = new CdpKeyboard(client);
        this.#mouse = new CdpMouse(client, this.#keyboard);
        this.#touchscreen = new CdpTouchscreen(client, this.#keyboard);
        this.#accessibility = new Accessibility(client);
        this.#frameManager = new FrameManager(client, this, ignoreHTTPSErrors, this.#timeoutSettings);
        this.#emulationManager = new EmulationManager(client);
        this.#tracing = new Tracing(client);
        this.#coverage = new Coverage(client);
        this.#viewport = null;
        this.#setupEventListeners();
        this.#tabSession?.on(CDPSessionEvent.Swapped, async (newSession) => {
            this.#client = newSession;
            assert(this.#client instanceof CdpCDPSession, 'CDPSession is not instance of CDPSessionImpl');
            this.#target = this.#client._target();
            assert(this.#target, 'Missing target on swap');
            this.#keyboard.updateClient(newSession);
            this.#mouse.updateClient(newSession);
            this.#touchscreen.updateClient(newSession);
            this.#accessibility.updateClient(newSession);
            this.#emulationManager.updateClient(newSession);
            this.#tracing.updateClient(newSession);
            this.#coverage.updateClient(newSession);
            await this.#frameManager.swapFrameTree(newSession);
            this.#setupEventListeners();
        });
        this.#tabSession?.on(CDPSessionEvent.Ready, session => {
            assert(session instanceof CdpCDPSession);
            if (session._target()._subtype() !== 'prerender') {
                return;
            }
            this.#frameManager.registerSpeculativeSession(session).catch(debugError);
            this.#emulationManager
                .registerSpeculativeSession(session)
                .catch(debugError);
        });
    }
    #setupEventListeners() {
        this.#client.on(CDPSessionEvent.Ready, this.#onAttachedToTarget);
        this.#target
            ._targetManager()
            .on("targetGone" /* TargetManagerEvent.TargetGone */, this.#onDetachedFromTarget);
        for (const [eventName, handler] of this.#frameManagerHandlers) {
            this.#frameManager.on(eventName, handler);
        }
        for (const [eventName, handler] of this.#networkManagerHandlers) {
            // TODO: Remove any.
            this.#frameManager.networkManager.on(eventName, handler);
        }
        for (const [eventName, handler] of this.#sessionHandlers) {
            // TODO: Remove any.
            this.#client.on(eventName, handler);
        }
        this.#target._isClosedDeferred
            .valueOrThrow()
            .then(() => {
            this.#client.off(CDPSessionEvent.Ready, this.#onAttachedToTarget);
            this.#target
                ._targetManager()
                .off("targetGone" /* TargetManagerEvent.TargetGone */, this.#onDetachedFromTarget);
            this.emit("close" /* PageEvent.Close */, undefined);
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
        this.emit("workerdestroyed" /* PageEvent.WorkerDestroyed */, worker);
    };
    #onAttachedToTarget = (session) => {
        assert(session instanceof CdpCDPSession);
        this.#frameManager.onAttachedToTarget(session._target());
        if (session._target()._getTargetInfo().type === 'worker') {
            const worker = new WebWorker(session, session._target().url(), this.#addConsoleMessage.bind(this), this.#handleException.bind(this));
            this.#workers.set(session.id(), worker);
            this.emit("workercreated" /* PageEvent.WorkerCreated */, worker);
        }
        session.on(CDPSessionEvent.Ready, this.#onAttachedToTarget);
    };
    async #initialize() {
        try {
            await Promise.all([
                this.#frameManager.initialize(this.#client),
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
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            if (!this.#fileChooserDeferreds.size) {
                return;
            }
            const frame = this.#frameManager.frame(event.frameId);
            assert(frame, 'This should never happen.');
            // This is guaranteed to be an HTMLInputElement handle by the event.
            const handle = __addDisposableResource(env_1, (await frame.worlds[MAIN_WORLD].adoptBackendNode(event.backendNodeId)), false);
            const fileChooser = new FileChooser(handle.move(), event);
            for (const promise of this.#fileChooserDeferreds) {
                promise.resolve(fileChooser);
            }
            this.#fileChooserDeferreds.clear();
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
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
    async waitForFileChooser(options = {}) {
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
        try {
            const [result] = await Promise.all([
                deferred.valueOrThrow(),
                enablePromise,
            ]);
            return result;
        }
        catch (error) {
            this.#fileChooserDeferreds.delete(deferred);
            throw error;
        }
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
        this.emit("error" /* PageEvent.Error */, new Error('Page crashed!'));
    }
    #onLogEntryAdded(event) {
        const { level, text, args, source, url, lineNumber } = event.entry;
        if (args) {
            args.map(arg => {
                return releaseObject(this.#client, arg);
            });
        }
        if (source !== 'worker') {
            this.emit("console" /* PageEvent.Console */, new ConsoleMessage(level, text, [], [{ url, lineNumber }]));
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
        return await this.#frameManager.networkManager.setRequestInterception(value);
    }
    async setBypassServiceWorker(bypass) {
        this.#serviceWorkerBypassed = bypass;
        return await this.#client.send('Network.setBypassServiceWorker', { bypass });
    }
    async setDragInterception(enabled) {
        this.#userDragInterceptionEnabled = enabled;
        return await this.#client.send('Input.setInterceptDrags', { enabled });
    }
    async setOfflineMode(enabled) {
        return await this.#frameManager.networkManager.setOfflineMode(enabled);
    }
    async emulateNetworkConditions(networkConditions) {
        return await this.#frameManager.networkManager.emulateNetworkConditions(networkConditions);
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
    async queryObjects(prototypeHandle) {
        assert(!prototypeHandle.disposed, 'Prototype JSHandle is disposed!');
        assert(prototypeHandle.id, 'Prototype JSHandle must not be referencing primitive value');
        const response = await this.mainFrame().client.send('Runtime.queryObjects', {
            prototypeObjectId: prototypeHandle.id,
        });
        return createCdpHandle(this.mainFrame().mainRealm(), response.objects);
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
        return await this.#frameManager.networkManager.authenticate(credentials);
    }
    async setExtraHTTPHeaders(headers) {
        return await this.#frameManager.networkManager.setExtraHTTPHeaders(headers);
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        return await this.#frameManager.networkManager.setUserAgent(userAgent, userAgentMetadata);
    }
    async metrics() {
        const response = await this.#client.send('Performance.getMetrics');
        return this.#buildMetricsObject(response.metrics);
    }
    #emitMetrics(event) {
        this.emit("metrics" /* PageEvent.Metrics */, {
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
    #handleException(exception) {
        this.emit("pageerror" /* PageEvent.PageError */, createClientError(exception.exceptionDetails));
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
            return createCdpHandle(context._world, arg);
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
        if (!this.listenerCount("console" /* PageEvent.Console */)) {
            args.forEach(arg => {
                return arg.dispose();
            });
            return;
        }
        const textTokens = [];
        // eslint-disable-next-line max-len -- The comment is long.
        // eslint-disable-next-line rulesdir/use-using -- These are not owned by this function.
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
        this.emit("console" /* PageEvent.Console */, message);
    }
    #onDialog(event) {
        const type = validateDialogType(event.type);
        const dialog = new CdpDialog(this.#client, type, event.message, event.defaultPrompt);
        this.emit("dialog" /* PageEvent.Dialog */, dialog);
    }
    async reload(options) {
        const [result] = await Promise.all([
            this.waitForNavigation(options),
            this.#client.send('Page.reload'),
        ]);
        return result;
    }
    async createCDPSession() {
        return await this.target().createCDPSession();
    }
    async waitForRequest(urlOrPredicate, options = {}) {
        const { timeout = this.#timeoutSettings.timeout() } = options;
        return await waitForEvent(this.#frameManager.networkManager, NetworkManagerEvent.Request, async (request) => {
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
        return await waitForEvent(this.#frameManager.networkManager, NetworkManagerEvent.Response, async (response) => {
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
    async goBack(options = {}) {
        return await this.#go(-1, options);
    }
    async goForward(options = {}) {
        return await this.#go(+1, options);
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
    async _screenshot(options) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            const { fromSurface, omitBackground, optimizeForSpeed, quality, clip: userClip, type, captureBeyondViewport, } = options;
            const isFirefox = this.target()._targetManager() instanceof FirefoxTargetManager;
            const stack = __addDisposableResource(env_2, new AsyncDisposableStack(), true);
            // Firefox omits background by default; it's not configurable.
            if (!isFirefox && omitBackground && (type === 'png' || type === 'webp')) {
                await this.#emulationManager.setTransparentBackgroundColor();
                stack.defer(async () => {
                    await this.#emulationManager
                        .resetDefaultBackgroundColor()
                        .catch(debugError);
                });
            }
            let clip = userClip;
            if (clip && !captureBeyondViewport) {
                const viewport = await this.mainFrame()
                    .isolatedRealm()
                    .evaluate(() => {
                    const { height, pageLeft: x, pageTop: y, width, } = window.visualViewport;
                    return { x, y, height, width };
                });
                clip = getIntersectionRect(clip, viewport);
            }
            // We need to do these spreads because Firefox doesn't allow unknown options.
            const { data } = await this.#client.send('Page.captureScreenshot', {
                format: type,
                ...(optimizeForSpeed ? { optimizeForSpeed } : {}),
                ...(quality !== undefined ? { quality } : {}),
                clip: clip && {
                    ...clip,
                    scale: clip.scale ?? 1,
                },
                ...(!fromSurface ? { fromSurface } : {}),
                captureBeyondViewport,
            });
            return data;
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
        return await getReadableFromProtocolStream(this.#client, result.stream);
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const readable = await this.createPDFStream(options);
        const buffer = await getReadableAsBuffer(readable, path);
        assert(buffer, 'Could not create buffer');
        return buffer;
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
    async waitForDevicePrompt(options = {}) {
        return await this.mainFrame().waitForDevicePrompt(options);
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
/** @see https://w3c.github.io/webdriver-bidi/#rectangle-intersection */
function getIntersectionRect(clip, viewport) {
    // Note these will already be normalized.
    const x = Math.max(clip.x, viewport.x);
    const y = Math.max(clip.y, viewport.y);
    return {
        x,
        y,
        width: Math.max(Math.min(clip.x + clip.width, viewport.x + viewport.width) - x, 0),
        height: Math.max(Math.min(clip.y + clip.height, viewport.y + viewport.height) - y, 0),
    };
}
//# sourceMappingURL=Page.js.map