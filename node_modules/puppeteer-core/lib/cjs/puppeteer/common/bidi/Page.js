"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Page_instances, _Page_accessibility, _Page_timeoutSettings, _Page_browserContext, _Page_connection, _Page_frameTree, _Page_networkManager, _Page_viewport, _Page_closedDeferred, _Page_subscribedEvents, _Page_networkManagerEvents, _Page_tracing, _Page_coverage, _Page_emulationManager, _Page_mouse, _Page_touchscreen, _Page_keyboard, _Page_onFrameLoaded, _Page_onFrameDOMContentLoaded, _Page_onFrameAttached, _Page_onFrameNavigated, _Page_onFrameDetached, _Page_removeFramesRecursively, _Page_onLogEntryAdded;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
const Page_js_1 = require("../../api/Page.js");
const assert_js_1 = require("../../util/assert.js");
const Deferred_js_1 = require("../../util/Deferred.js");
const Accessibility_js_1 = require("../Accessibility.js");
const ConsoleMessage_js_1 = require("../ConsoleMessage.js");
const Coverage_js_1 = require("../Coverage.js");
const EmulationManager_js_1 = require("../EmulationManager.js");
const Errors_js_1 = require("../Errors.js");
const FrameTree_js_1 = require("../FrameTree.js");
const NetworkManager_js_1 = require("../NetworkManager.js");
const TimeoutSettings_js_1 = require("../TimeoutSettings.js");
const Tracing_js_1 = require("../Tracing.js");
const util_js_1 = require("../util.js");
const BrowsingContext_js_1 = require("./BrowsingContext.js");
const Frame_js_1 = require("./Frame.js");
const Input_js_1 = require("./Input.js");
const NetworkManager_js_2 = require("./NetworkManager.js");
const Realm_js_1 = require("./Realm.js");
const Serializer_js_1 = require("./Serializer.js");
/**
 * @internal
 */
class Page extends Page_js_1.Page {
    constructor(browserContext, info) {
        super();
        _Page_instances.add(this);
        _Page_accessibility.set(this, void 0);
        _Page_timeoutSettings.set(this, new TimeoutSettings_js_1.TimeoutSettings());
        _Page_browserContext.set(this, void 0);
        _Page_connection.set(this, void 0);
        _Page_frameTree.set(this, new FrameTree_js_1.FrameTree());
        _Page_networkManager.set(this, void 0);
        _Page_viewport.set(this, null);
        _Page_closedDeferred.set(this, Deferred_js_1.Deferred.create());
        _Page_subscribedEvents.set(this, new Map([
            ['log.entryAdded', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onLogEntryAdded).bind(this)],
            ['browsingContext.load', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameLoaded).bind(this)],
            [
                'browsingContext.domContentLoaded',
                __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameDOMContentLoaded).bind(this),
            ],
            ['browsingContext.contextCreated', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameAttached).bind(this)],
            ['browsingContext.contextDestroyed', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameDetached).bind(this)],
            ['browsingContext.fragmentNavigated', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameNavigated).bind(this)],
        ]));
        _Page_networkManagerEvents.set(this, new Map([
            [
                NetworkManager_js_1.NetworkManagerEmittedEvents.Request,
                this.emit.bind(this, "request" /* PageEmittedEvents.Request */),
            ],
            [
                NetworkManager_js_1.NetworkManagerEmittedEvents.RequestServedFromCache,
                this.emit.bind(this, "requestservedfromcache" /* PageEmittedEvents.RequestServedFromCache */),
            ],
            [
                NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFailed,
                this.emit.bind(this, "requestfailed" /* PageEmittedEvents.RequestFailed */),
            ],
            [
                NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFinished,
                this.emit.bind(this, "requestfinished" /* PageEmittedEvents.RequestFinished */),
            ],
            [
                NetworkManager_js_1.NetworkManagerEmittedEvents.Response,
                this.emit.bind(this, "response" /* PageEmittedEvents.Response */),
            ],
        ]));
        _Page_tracing.set(this, void 0);
        _Page_coverage.set(this, void 0);
        _Page_emulationManager.set(this, void 0);
        _Page_mouse.set(this, void 0);
        _Page_touchscreen.set(this, void 0);
        _Page_keyboard.set(this, void 0);
        __classPrivateFieldSet(this, _Page_browserContext, browserContext, "f");
        __classPrivateFieldSet(this, _Page_connection, browserContext.connection, "f");
        __classPrivateFieldSet(this, _Page_networkManager, new NetworkManager_js_2.NetworkManager(__classPrivateFieldGet(this, _Page_connection, "f"), this), "f");
        __classPrivateFieldGet(this, _Page_instances, "m", _Page_onFrameAttached).call(this, {
            ...info,
            url: info.url ?? 'about:blank',
            children: info.children ?? [],
        });
        for (const [event, subscriber] of __classPrivateFieldGet(this, _Page_subscribedEvents, "f")) {
            __classPrivateFieldGet(this, _Page_connection, "f").on(event, subscriber);
        }
        for (const [event, subscriber] of __classPrivateFieldGet(this, _Page_networkManagerEvents, "f")) {
            __classPrivateFieldGet(this, _Page_networkManager, "f").on(event, subscriber);
        }
        // TODO: https://github.com/w3c/webdriver-bidi/issues/443
        __classPrivateFieldSet(this, _Page_accessibility, new Accessibility_js_1.Accessibility(this.mainFrame().context().cdpSession), "f");
        __classPrivateFieldSet(this, _Page_tracing, new Tracing_js_1.Tracing(this.mainFrame().context().cdpSession), "f");
        __classPrivateFieldSet(this, _Page_coverage, new Coverage_js_1.Coverage(this.mainFrame().context().cdpSession), "f");
        __classPrivateFieldSet(this, _Page_emulationManager, new EmulationManager_js_1.EmulationManager(this.mainFrame().context().cdpSession), "f");
        __classPrivateFieldSet(this, _Page_mouse, new Input_js_1.Mouse(this.mainFrame().context()), "f");
        __classPrivateFieldSet(this, _Page_touchscreen, new Input_js_1.Touchscreen(this.mainFrame().context()), "f");
        __classPrivateFieldSet(this, _Page_keyboard, new Input_js_1.Keyboard(this.mainFrame().context()), "f");
    }
    get accessibility() {
        return __classPrivateFieldGet(this, _Page_accessibility, "f");
    }
    get tracing() {
        return __classPrivateFieldGet(this, _Page_tracing, "f");
    }
    get coverage() {
        return __classPrivateFieldGet(this, _Page_coverage, "f");
    }
    get mouse() {
        return __classPrivateFieldGet(this, _Page_mouse, "f");
    }
    get touchscreen() {
        return __classPrivateFieldGet(this, _Page_touchscreen, "f");
    }
    get keyboard() {
        return __classPrivateFieldGet(this, _Page_keyboard, "f");
    }
    browser() {
        return __classPrivateFieldGet(this, _Page_browserContext, "f").browser();
    }
    browserContext() {
        return __classPrivateFieldGet(this, _Page_browserContext, "f");
    }
    mainFrame() {
        const mainFrame = __classPrivateFieldGet(this, _Page_frameTree, "f").getMainFrame();
        (0, assert_js_1.assert)(mainFrame, 'Requesting main frame too early!');
        return mainFrame;
    }
    frames() {
        return Array.from(__classPrivateFieldGet(this, _Page_frameTree, "f").frames());
    }
    frame(frameId) {
        return __classPrivateFieldGet(this, _Page_frameTree, "f").getById(frameId ?? '') || null;
    }
    childFrames(frameId) {
        return __classPrivateFieldGet(this, _Page_frameTree, "f").childFrames(frameId);
    }
    getNavigationResponse(id) {
        return __classPrivateFieldGet(this, _Page_networkManager, "f").getNavigationResponse(id);
    }
    async close() {
        if (__classPrivateFieldGet(this, _Page_closedDeferred, "f").finished()) {
            return;
        }
        __classPrivateFieldGet(this, _Page_closedDeferred, "f").resolve(new Errors_js_1.TargetCloseError('Page closed!'));
        __classPrivateFieldGet(this, _Page_networkManager, "f").dispose();
        await __classPrivateFieldGet(this, _Page_connection, "f").send('browsingContext.close', {
            context: this.mainFrame()._id,
        });
        this.emit("close" /* PageEmittedEvents.Close */);
        this.removeAllListeners();
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluateHandle.name, pageFunction);
        return this.mainFrame().evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluate.name, pageFunction);
        return this.mainFrame().evaluate(pageFunction, ...args);
    }
    async goto(url, options) {
        return this.mainFrame().goto(url, options);
    }
    async reload(options) {
        const [response] = await Promise.all([
            this.waitForResponse(response => {
                return (response.request().isNavigationRequest() &&
                    response.url() === this.url());
            }),
            this.mainFrame().context().reload(options),
        ]);
        return response;
    }
    url() {
        return this.mainFrame().url();
    }
    setDefaultNavigationTimeout(timeout) {
        __classPrivateFieldGet(this, _Page_timeoutSettings, "f").setDefaultNavigationTimeout(timeout);
    }
    setDefaultTimeout(timeout) {
        __classPrivateFieldGet(this, _Page_timeoutSettings, "f").setDefaultTimeout(timeout);
    }
    getDefaultTimeout() {
        return __classPrivateFieldGet(this, _Page_timeoutSettings, "f").timeout();
    }
    async setContent(html, options = {}) {
        await this.mainFrame().setContent(html, options);
    }
    async content() {
        return this.mainFrame().content();
    }
    isJavaScriptEnabled() {
        return __classPrivateFieldGet(this, _Page_emulationManager, "f").javascriptEnabled;
    }
    async setGeolocation(options) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").setGeolocation(options);
    }
    async setJavaScriptEnabled(enabled) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").setJavaScriptEnabled(enabled);
    }
    async emulateMediaType(type) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateMediaType(type);
    }
    async emulateCPUThrottling(factor) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateCPUThrottling(factor);
    }
    async emulateMediaFeatures(features) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateMediaFeatures(features);
    }
    async emulateTimezone(timezoneId) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateTimezone(timezoneId);
    }
    async emulateIdleState(overrides) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateIdleState(overrides);
    }
    async emulateVisionDeficiency(type) {
        return await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateVisionDeficiency(type);
    }
    async setViewport(viewport) {
        const needsReload = await __classPrivateFieldGet(this, _Page_emulationManager, "f").emulateViewport(viewport);
        __classPrivateFieldSet(this, _Page_viewport, viewport, "f");
        if (needsReload) {
            // TODO: reload seems to hang in BiDi.
            // await this.reload();
        }
    }
    viewport() {
        return __classPrivateFieldGet(this, _Page_viewport, "f");
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const { printBackground: background, margin, landscape, width, height, pageRanges, scale, preferCSSPageSize, timeout, } = this._getPDFOptions(options, 'cm');
        const { result } = await (0, util_js_1.waitWithTimeout)(__classPrivateFieldGet(this, _Page_connection, "f").send('browsingContext.print', {
            context: this.mainFrame()._id,
            background,
            margin,
            orientation: landscape ? 'landscape' : 'portrait',
            page: {
                width,
                height,
            },
            pageRanges: pageRanges.split(', '),
            scale,
            shrinkToFit: !preferCSSPageSize,
        }), 'browsingContext.print', timeout);
        const buffer = Buffer.from(result.data, 'base64');
        await this._maybeWriteBufferToFile(path, buffer);
        return buffer;
    }
    async createPDFStream(options) {
        const buffer = await this.pdf(options);
        try {
            const { Readable } = await Promise.resolve().then(() => __importStar(require('stream')));
            return Readable.from(buffer);
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Can only pass a file path in a Node-like environment.');
            }
            throw error;
        }
    }
    async screenshot(options = {}) {
        const { path = undefined, encoding, ...args } = options;
        if (Object.keys(args).length >= 1) {
            throw new Error('BiDi only supports "encoding" and "path" options');
        }
        const { result } = await __classPrivateFieldGet(this, _Page_connection, "f").send('browsingContext.captureScreenshot', {
            context: this.mainFrame()._id,
        });
        if (encoding === 'base64') {
            return result.data;
        }
        const buffer = Buffer.from(result.data, 'base64');
        await this._maybeWriteBufferToFile(path, buffer);
        return buffer;
    }
    waitForRequest(urlOrPredicate, options = {}) {
        const { timeout = __classPrivateFieldGet(this, _Page_timeoutSettings, "f").timeout() } = options;
        return (0, util_js_1.waitForEvent)(__classPrivateFieldGet(this, _Page_networkManager, "f"), NetworkManager_js_1.NetworkManagerEmittedEvents.Request, async (request) => {
            if ((0, util_js_1.isString)(urlOrPredicate)) {
                return urlOrPredicate === request.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(request));
            }
            return false;
        }, timeout, __classPrivateFieldGet(this, _Page_closedDeferred, "f").valueOrThrow());
    }
    waitForResponse(urlOrPredicate, options = {}) {
        const { timeout = __classPrivateFieldGet(this, _Page_timeoutSettings, "f").timeout() } = options;
        return (0, util_js_1.waitForEvent)(__classPrivateFieldGet(this, _Page_networkManager, "f"), NetworkManager_js_1.NetworkManagerEmittedEvents.Response, async (response) => {
            if ((0, util_js_1.isString)(urlOrPredicate)) {
                return urlOrPredicate === response.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(response));
            }
            return false;
        }, timeout, __classPrivateFieldGet(this, _Page_closedDeferred, "f").valueOrThrow());
    }
    async waitForNetworkIdle(options = {}) {
        const { idleTime = 500, timeout = __classPrivateFieldGet(this, _Page_timeoutSettings, "f").timeout() } = options;
        await this._waitForNetworkIdle(__classPrivateFieldGet(this, _Page_networkManager, "f"), idleTime, timeout, __classPrivateFieldGet(this, _Page_closedDeferred, "f"));
    }
    title() {
        return this.mainFrame().title();
    }
}
exports.Page = Page;
_Page_accessibility = new WeakMap(), _Page_timeoutSettings = new WeakMap(), _Page_browserContext = new WeakMap(), _Page_connection = new WeakMap(), _Page_frameTree = new WeakMap(), _Page_networkManager = new WeakMap(), _Page_viewport = new WeakMap(), _Page_closedDeferred = new WeakMap(), _Page_subscribedEvents = new WeakMap(), _Page_networkManagerEvents = new WeakMap(), _Page_tracing = new WeakMap(), _Page_coverage = new WeakMap(), _Page_emulationManager = new WeakMap(), _Page_mouse = new WeakMap(), _Page_touchscreen = new WeakMap(), _Page_keyboard = new WeakMap(), _Page_instances = new WeakSet(), _Page_onFrameLoaded = function _Page_onFrameLoaded(info) {
    const frame = this.frame(info.context);
    if (frame && this.mainFrame() === frame) {
        this.emit("load" /* PageEmittedEvents.Load */);
    }
}, _Page_onFrameDOMContentLoaded = function _Page_onFrameDOMContentLoaded(info) {
    const frame = this.frame(info.context);
    if (frame && this.mainFrame() === frame) {
        this.emit("domcontentloaded" /* PageEmittedEvents.DOMContentLoaded */);
    }
}, _Page_onFrameAttached = function _Page_onFrameAttached(info) {
    if (!this.frame(info.context) &&
        (this.frame(info.parent ?? '') || !__classPrivateFieldGet(this, _Page_frameTree, "f").getMainFrame())) {
        const context = new BrowsingContext_js_1.BrowsingContext(__classPrivateFieldGet(this, _Page_connection, "f"), __classPrivateFieldGet(this, _Page_timeoutSettings, "f"), info);
        __classPrivateFieldGet(this, _Page_connection, "f").registerBrowsingContexts(context);
        const frame = new Frame_js_1.Frame(this, context, __classPrivateFieldGet(this, _Page_timeoutSettings, "f"), info.parent);
        __classPrivateFieldGet(this, _Page_frameTree, "f").addFrame(frame);
        this.emit("frameattached" /* PageEmittedEvents.FrameAttached */, frame);
    }
}, _Page_onFrameNavigated = async function _Page_onFrameNavigated(info) {
    const frameId = info.context;
    let frame = this.frame(frameId);
    // Detach all child frames first.
    if (frame) {
        frame = await __classPrivateFieldGet(this, _Page_frameTree, "f").waitForFrame(frameId);
        this.emit("framenavigated" /* PageEmittedEvents.FrameNavigated */, frame);
    }
}, _Page_onFrameDetached = function _Page_onFrameDetached(info) {
    const frame = this.frame(info.context);
    if (frame) {
        if (frame === this.mainFrame()) {
            this.emit("close" /* PageEmittedEvents.Close */);
        }
        __classPrivateFieldGet(this, _Page_instances, "m", _Page_removeFramesRecursively).call(this, frame);
    }
}, _Page_removeFramesRecursively = function _Page_removeFramesRecursively(frame) {
    for (const child of frame.childFrames()) {
        __classPrivateFieldGet(this, _Page_instances, "m", _Page_removeFramesRecursively).call(this, child);
    }
    frame.dispose();
    __classPrivateFieldGet(this, _Page_networkManager, "f").clearMapAfterFrameDispose(frame);
    __classPrivateFieldGet(this, _Page_frameTree, "f").removeFrame(frame);
    this.emit("framedetached" /* PageEmittedEvents.FrameDetached */, frame);
}, _Page_onLogEntryAdded = function _Page_onLogEntryAdded(event) {
    const frame = this.frame(event.source.context);
    if (!frame) {
        return;
    }
    if (isConsoleLogEntry(event)) {
        const args = event.args.map(arg => {
            return (0, Realm_js_1.getBidiHandle)(frame.context(), arg, frame);
        });
        const text = args
            .reduce((value, arg) => {
            const parsedValue = arg.isPrimitiveValue
                ? Serializer_js_1.BidiSerializer.deserialize(arg.remoteValue())
                : arg.toString();
            return `${value} ${parsedValue}`;
        }, '')
            .slice(1);
        this.emit("console" /* PageEmittedEvents.Console */, new ConsoleMessage_js_1.ConsoleMessage(event.method, text, args, getStackTraceLocations(event.stackTrace)));
    }
    else if (isJavaScriptLogEntry(event)) {
        let message = event.text ?? '';
        if (event.stackTrace) {
            for (const callFrame of event.stackTrace.callFrames) {
                const location = callFrame.url +
                    ':' +
                    callFrame.lineNumber +
                    ':' +
                    callFrame.columnNumber;
                const functionName = callFrame.functionName || '<anonymous>';
                message += `\n    at ${functionName} (${location})`;
            }
        }
        const error = new Error(message);
        error.stack = ''; // Don't capture Puppeteer stacktrace.
        this.emit("pageerror" /* PageEmittedEvents.PageError */, error);
    }
    else {
        (0, util_js_1.debugError)(`Unhandled LogEntry with type "${event.type}", text "${event.text}" and level "${event.level}"`);
    }
};
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
//# sourceMappingURL=Page.js.map