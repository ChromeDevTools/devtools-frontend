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
import { firstValueFrom, from, raceWith } from '../../third_party/rxjs/rxjs.js';
import { Page, } from '../api/Page.js';
import { Accessibility } from '../cdp/Accessibility.js';
import { Coverage } from '../cdp/Coverage.js';
import { EmulationManager as CdpEmulationManager } from '../cdp/EmulationManager.js';
import { FrameTree } from '../cdp/FrameTree.js';
import { Tracing } from '../cdp/Tracing.js';
import { ConsoleMessage, } from '../common/ConsoleMessage.js';
import { ProtocolError, TargetCloseError, TimeoutError, } from '../common/Errors.js';
import { NetworkManagerEvent } from '../common/NetworkManagerEvents.js';
import { debugError, evaluationString, timeout, validateDialogType, waitForHTTP, waitWithTimeout, } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { disposeSymbol } from '../util/disposable.js';
import { BrowsingContextEvent, CdpSessionWrapper, getWaitUntilSingle, } from './BrowsingContext.js';
import { BidiDeserializer } from './Deserializer.js';
import { BidiDialog } from './Dialog.js';
import { BidiElementHandle } from './ElementHandle.js';
import { EmulationManager } from './EmulationManager.js';
import { BidiFrame, lifeCycleToReadinessState } from './Frame.js';
import { BidiKeyboard, BidiMouse, BidiTouchscreen } from './Input.js';
import { BidiNetworkManager } from './NetworkManager.js';
import { createBidiHandle } from './Realm.js';
/**
 * @internal
 */
export class BidiPage extends Page {
    #accessibility;
    #connection;
    #frameTree = new FrameTree();
    #networkManager;
    #viewport = null;
    #closedDeferred = Deferred.create();
    #subscribedEvents = new Map([
        ['log.entryAdded', this.#onLogEntryAdded.bind(this)],
        ['browsingContext.load', this.#onFrameLoaded.bind(this)],
        [
            'browsingContext.fragmentNavigated',
            this.#onFrameFragmentNavigated.bind(this),
        ],
        [
            'browsingContext.domContentLoaded',
            this.#onFrameDOMContentLoaded.bind(this),
        ],
        ['browsingContext.userPromptOpened', this.#onDialog.bind(this)],
    ]);
    #networkManagerEvents = [
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
        [
            NetworkManagerEvent.Response,
            (response) => {
                this.emit("response" /* PageEvent.Response */, response);
            },
        ],
    ];
    #browsingContextEvents = new Map([
        [BrowsingContextEvent.Created, this.#onContextCreated.bind(this)],
        [BrowsingContextEvent.Destroyed, this.#onContextDestroyed.bind(this)],
    ]);
    #tracing;
    #coverage;
    #cdpEmulationManager;
    #emulationManager;
    #mouse;
    #touchscreen;
    #keyboard;
    #browsingContext;
    #browserContext;
    _client() {
        return this.mainFrame().context().cdpSession;
    }
    constructor(browsingContext, browserContext) {
        super();
        this.#browsingContext = browsingContext;
        this.#browserContext = browserContext;
        this.#connection = browsingContext.connection;
        for (const [event, subscriber] of this.#browsingContextEvents) {
            this.#browsingContext.on(event, subscriber);
        }
        this.#networkManager = new BidiNetworkManager(this.#connection, this);
        for (const [event, subscriber] of this.#subscribedEvents) {
            this.#connection.on(event, subscriber);
        }
        for (const [event, subscriber] of this.#networkManagerEvents) {
            // TODO: remove any
            this.#networkManager.on(event, subscriber);
        }
        const frame = new BidiFrame(this, this.#browsingContext, this._timeoutSettings, this.#browsingContext.parent);
        this.#frameTree.addFrame(frame);
        this.emit("frameattached" /* PageEvent.FrameAttached */, frame);
        // TODO: https://github.com/w3c/webdriver-bidi/issues/443
        this.#accessibility = new Accessibility(this.mainFrame().context().cdpSession);
        this.#tracing = new Tracing(this.mainFrame().context().cdpSession);
        this.#coverage = new Coverage(this.mainFrame().context().cdpSession);
        this.#cdpEmulationManager = new CdpEmulationManager(this.mainFrame().context().cdpSession);
        this.#emulationManager = new EmulationManager(browsingContext);
        this.#mouse = new BidiMouse(this.mainFrame().context());
        this.#touchscreen = new BidiTouchscreen(this.mainFrame().context());
        this.#keyboard = new BidiKeyboard(this);
    }
    /**
     * @internal
     */
    get connection() {
        return this.#connection;
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        // TODO: handle CDP-specific cases such as mprach.
        await this._client().send('Network.setUserAgentOverride', {
            userAgent: userAgent,
            userAgentMetadata: userAgentMetadata,
        });
    }
    async setBypassCSP(enabled) {
        // TODO: handle CDP-specific cases such as mprach.
        await this._client().send('Page.setBypassCSP', { enabled });
    }
    async queryObjects(prototypeHandle) {
        assert(!prototypeHandle.disposed, 'Prototype JSHandle is disposed!');
        assert(prototypeHandle.id, 'Prototype JSHandle must not be referencing primitive value');
        const response = await this.mainFrame().client.send('Runtime.queryObjects', {
            prototypeObjectId: prototypeHandle.id,
        });
        return createBidiHandle(this.mainFrame().mainRealm(), {
            type: 'array',
            handle: response.objects.objectId,
        });
    }
    _setBrowserContext(browserContext) {
        this.#browserContext = browserContext;
    }
    get accessibility() {
        return this.#accessibility;
    }
    get tracing() {
        return this.#tracing;
    }
    get coverage() {
        return this.#coverage;
    }
    get mouse() {
        return this.#mouse;
    }
    get touchscreen() {
        return this.#touchscreen;
    }
    get keyboard() {
        return this.#keyboard;
    }
    browser() {
        return this.browserContext().browser();
    }
    browserContext() {
        return this.#browserContext;
    }
    mainFrame() {
        const mainFrame = this.#frameTree.getMainFrame();
        assert(mainFrame, 'Requesting main frame too early!');
        return mainFrame;
    }
    /**
     * @internal
     */
    async focusedFrame() {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const frame = __addDisposableResource(env_1, await this.mainFrame()
                .isolatedRealm()
                .evaluateHandle(() => {
                let frame;
                let win = window;
                while (win?.document.activeElement instanceof HTMLIFrameElement) {
                    frame = win.document.activeElement;
                    win = frame.contentWindow;
                }
                return frame;
            }), false);
            if (!(frame instanceof BidiElementHandle)) {
                return this.mainFrame();
            }
            return await frame.contentFrame();
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    frames() {
        return Array.from(this.#frameTree.frames());
    }
    frame(frameId) {
        return this.#frameTree.getById(frameId ?? '') || null;
    }
    childFrames(frameId) {
        return this.#frameTree.childFrames(frameId);
    }
    #onFrameLoaded(info) {
        const frame = this.frame(info.context);
        if (frame && this.mainFrame() === frame) {
            this.emit("load" /* PageEvent.Load */, undefined);
        }
    }
    #onFrameFragmentNavigated(info) {
        const frame = this.frame(info.context);
        if (frame) {
            this.emit("framenavigated" /* PageEvent.FrameNavigated */, frame);
        }
    }
    #onFrameDOMContentLoaded(info) {
        const frame = this.frame(info.context);
        if (frame) {
            frame._hasStartedLoading = true;
            if (this.mainFrame() === frame) {
                this.emit("domcontentloaded" /* PageEvent.DOMContentLoaded */, undefined);
            }
            this.emit("framenavigated" /* PageEvent.FrameNavigated */, frame);
        }
    }
    #onContextCreated(context) {
        if (!this.frame(context.id) &&
            (this.frame(context.parent ?? '') || !this.#frameTree.getMainFrame())) {
            const frame = new BidiFrame(this, context, this._timeoutSettings, context.parent);
            this.#frameTree.addFrame(frame);
            if (frame !== this.mainFrame()) {
                this.emit("frameattached" /* PageEvent.FrameAttached */, frame);
            }
        }
    }
    #onContextDestroyed(context) {
        const frame = this.frame(context.id);
        if (frame) {
            if (frame === this.mainFrame()) {
                this.emit("close" /* PageEvent.Close */, undefined);
            }
            this.#removeFramesRecursively(frame);
        }
    }
    #removeFramesRecursively(frame) {
        for (const child of frame.childFrames()) {
            this.#removeFramesRecursively(child);
        }
        frame[disposeSymbol]();
        this.#networkManager.clearMapAfterFrameDispose(frame);
        this.#frameTree.removeFrame(frame);
        this.emit("framedetached" /* PageEvent.FrameDetached */, frame);
    }
    #onLogEntryAdded(event) {
        const frame = this.frame(event.source.context);
        if (!frame) {
            return;
        }
        if (isConsoleLogEntry(event)) {
            const args = event.args.map(arg => {
                return createBidiHandle(frame.mainRealm(), arg);
            });
            const text = args
                .reduce((value, arg) => {
                const parsedValue = arg.isPrimitiveValue
                    ? BidiDeserializer.deserialize(arg.remoteValue())
                    : arg.toString();
                return `${value} ${parsedValue}`;
            }, '')
                .slice(1);
            this.emit("console" /* PageEvent.Console */, new ConsoleMessage(event.method, text, args, getStackTraceLocations(event.stackTrace)));
        }
        else if (isJavaScriptLogEntry(event)) {
            const error = new Error(event.text ?? '');
            const messageHeight = error.message.split('\n').length;
            const messageLines = error.stack.split('\n').splice(0, messageHeight);
            const stackLines = [];
            if (event.stackTrace) {
                for (const frame of event.stackTrace.callFrames) {
                    // Note we need to add `1` because the values are 0-indexed.
                    stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`);
                    if (stackLines.length >= Error.stackTraceLimit) {
                        break;
                    }
                }
            }
            error.stack = [...messageLines, ...stackLines].join('\n');
            this.emit("pageerror" /* PageEvent.PageError */, error);
        }
        else {
            debugError(`Unhandled LogEntry with type "${event.type}", text "${event.text}" and level "${event.level}"`);
        }
    }
    #onDialog(event) {
        const frame = this.frame(event.context);
        if (!frame) {
            return;
        }
        const type = validateDialogType(event.type);
        const dialog = new BidiDialog(frame.context(), type, event.message, event.defaultValue);
        this.emit("dialog" /* PageEvent.Dialog */, dialog);
    }
    getNavigationResponse(id) {
        return this.#networkManager.getNavigationResponse(id);
    }
    isClosed() {
        return this.#closedDeferred.finished();
    }
    async close() {
        if (this.#closedDeferred.finished()) {
            return;
        }
        this.#closedDeferred.reject(new TargetCloseError('Page closed!'));
        this.#networkManager.dispose();
        await this.#connection.send('browsingContext.close', {
            context: this.mainFrame()._id,
        });
        this.emit("close" /* PageEvent.Close */, undefined);
        this.removeAllListeners();
    }
    async reload(options = {}) {
        const { waitUntil = 'load', timeout = this._timeoutSettings.navigationTimeout(), } = options;
        const readinessState = lifeCycleToReadinessState.get(getWaitUntilSingle(waitUntil));
        try {
            const { result } = await waitWithTimeout(this.#connection.send('browsingContext.reload', {
                context: this.mainFrame()._id,
                wait: readinessState,
            }), 'Navigation', timeout);
            return this.getNavigationResponse(result.navigation);
        }
        catch (error) {
            if (error instanceof ProtocolError) {
                error.message += ` at ${this.url}`;
            }
            else if (error instanceof TimeoutError) {
                error.message = 'Navigation timeout of ' + timeout + ' ms exceeded';
            }
            throw error;
        }
    }
    setDefaultNavigationTimeout(timeout) {
        this._timeoutSettings.setDefaultNavigationTimeout(timeout);
    }
    setDefaultTimeout(timeout) {
        this._timeoutSettings.setDefaultTimeout(timeout);
    }
    getDefaultTimeout() {
        return this._timeoutSettings.timeout();
    }
    isJavaScriptEnabled() {
        return this.#cdpEmulationManager.javascriptEnabled;
    }
    async setGeolocation(options) {
        return await this.#cdpEmulationManager.setGeolocation(options);
    }
    async setJavaScriptEnabled(enabled) {
        return await this.#cdpEmulationManager.setJavaScriptEnabled(enabled);
    }
    async emulateMediaType(type) {
        return await this.#cdpEmulationManager.emulateMediaType(type);
    }
    async emulateCPUThrottling(factor) {
        return await this.#cdpEmulationManager.emulateCPUThrottling(factor);
    }
    async emulateMediaFeatures(features) {
        return await this.#cdpEmulationManager.emulateMediaFeatures(features);
    }
    async emulateTimezone(timezoneId) {
        return await this.#cdpEmulationManager.emulateTimezone(timezoneId);
    }
    async emulateIdleState(overrides) {
        return await this.#cdpEmulationManager.emulateIdleState(overrides);
    }
    async emulateVisionDeficiency(type) {
        return await this.#cdpEmulationManager.emulateVisionDeficiency(type);
    }
    async setViewport(viewport) {
        if (!this.#browsingContext.supportsCdp()) {
            await this.#emulationManager.emulateViewport(viewport);
            this.#viewport = viewport;
            return;
        }
        const needsReload = await this.#cdpEmulationManager.emulateViewport(viewport);
        this.#viewport = viewport;
        if (needsReload) {
            await this.reload();
        }
    }
    viewport() {
        return this.#viewport;
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const { printBackground: background, margin, landscape, width, height, pageRanges: ranges, scale, preferCSSPageSize, timeout: ms, } = this._getPDFOptions(options, 'cm');
        const pageRanges = ranges ? ranges.split(', ') : [];
        const { result } = await firstValueFrom(from(this.#connection.send('browsingContext.print', {
            context: this.mainFrame()._id,
            background,
            margin,
            orientation: landscape ? 'landscape' : 'portrait',
            page: {
                width,
                height,
            },
            pageRanges,
            scale,
            shrinkToFit: !preferCSSPageSize,
        })).pipe(raceWith(timeout(ms))));
        const buffer = Buffer.from(result.data, 'base64');
        await this._maybeWriteBufferToFile(path, buffer);
        return buffer;
    }
    async createPDFStream(options) {
        const buffer = await this.pdf(options);
        try {
            const { Readable } = await import('stream');
            return Readable.from(buffer);
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Can only pass a file path in a Node-like environment.');
            }
            throw error;
        }
    }
    async _screenshot(options) {
        const { clip, type, captureBeyondViewport, allowViewportExpansion, quality } = options;
        if (captureBeyondViewport && !allowViewportExpansion) {
            throw new Error(`BiDi does not support 'captureBeyondViewport'. Use 'allowViewportExpansion'.`);
        }
        if (options.omitBackground !== undefined && options.omitBackground) {
            throw new Error(`BiDi does not support 'omitBackground'.`);
        }
        if (options.optimizeForSpeed !== undefined && options.optimizeForSpeed) {
            throw new Error(`BiDi does not support 'optimizeForSpeed'.`);
        }
        if (options.fromSurface !== undefined && !options.fromSurface) {
            throw new Error(`BiDi does not support 'fromSurface'.`);
        }
        if (clip !== undefined && clip.scale !== undefined && clip.scale !== 1) {
            throw new Error(`BiDi does not support 'scale' in 'clip'.`);
        }
        const { result: { data }, } = await this.#connection.send('browsingContext.captureScreenshot', {
            context: this.mainFrame()._id,
            format: {
                type: `image/${type}`,
                ...(quality === undefined ? {} : { quality: quality / 100 }),
            },
            clip: clip && {
                type: 'box',
                ...clip,
            },
        });
        return data;
    }
    async waitForRequest(urlOrPredicate, options = {}) {
        const { timeout = this._timeoutSettings.timeout() } = options;
        return await waitForHTTP(this.#networkManager, NetworkManagerEvent.Request, urlOrPredicate, timeout, this.#closedDeferred);
    }
    async waitForResponse(urlOrPredicate, options = {}) {
        const { timeout = this._timeoutSettings.timeout() } = options;
        return await waitForHTTP(this.#networkManager, NetworkManagerEvent.Response, urlOrPredicate, timeout, this.#closedDeferred);
    }
    async waitForNetworkIdle(options = {}) {
        const { idleTime = 500, timeout = this._timeoutSettings.timeout() } = options;
        await this._waitForNetworkIdle(this.#networkManager, idleTime, timeout, this.#closedDeferred);
    }
    async createCDPSession() {
        const { sessionId } = await this.mainFrame()
            .context()
            .cdpSession.send('Target.attachToTarget', {
            targetId: this.mainFrame()._id,
            flatten: true,
        });
        return new CdpSessionWrapper(this.mainFrame().context(), sessionId);
    }
    async bringToFront() {
        await this.#connection.send('browsingContext.activate', {
            context: this.mainFrame()._id,
        });
    }
    async evaluateOnNewDocument(pageFunction, ...args) {
        const expression = evaluationExpression(pageFunction, ...args);
        const { result } = await this.#connection.send('script.addPreloadScript', {
            functionDeclaration: expression,
            // TODO: should change spec to accept browsingContext
        });
        return { identifier: result.script };
    }
    async removeScriptToEvaluateOnNewDocument(id) {
        await this.#connection.send('script.removePreloadScript', {
            script: id,
        });
    }
    async exposeFunction(name, pptrFunction) {
        return await this.mainFrame().exposeFunction(name, 'default' in pptrFunction ? pptrFunction.default : pptrFunction);
    }
    isDragInterceptionEnabled() {
        return false;
    }
    async setCacheEnabled(enabled) {
        // TODO: handle CDP-specific cases such as mprach.
        await this._client().send('Network.setCacheDisabled', {
            cacheDisabled: !enabled,
        });
    }
}
function isConsoleLogEntry(event) {
    return event.type === 'console';
}
function isJavaScriptLogEntry(event) {
    return event.type === 'javascript';
}
function getStackTraceLocations(stackTrace) {
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
    return stackTraceLocations;
}
function evaluationExpression(fun, ...args) {
    return `() => {${evaluationString(fun, ...args)}}`;
}
//# sourceMappingURL=Page.js.map