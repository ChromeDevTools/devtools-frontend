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
const Dialog_js_1 = require("./Dialog.js");
const Frame_js_1 = require("./Frame.js");
const Input_js_1 = require("./Input.js");
const NetworkManager_js_2 = require("./NetworkManager.js");
const Realm_js_1 = require("./Realm.js");
const Serializer_js_1 = require("./Serializer.js");
/**
 * @internal
 */
class Page extends Page_js_1.Page {
    #accessibility;
    #timeoutSettings = new TimeoutSettings_js_1.TimeoutSettings();
    #connection;
    #frameTree = new FrameTree_js_1.FrameTree();
    #networkManager;
    #viewport = null;
    #closedDeferred = Deferred_js_1.Deferred.create();
    #subscribedEvents = new Map([
        ['log.entryAdded', this.#onLogEntryAdded.bind(this)],
        ['browsingContext.load', this.#onFrameLoaded.bind(this)],
        [
            'browsingContext.domContentLoaded',
            this.#onFrameDOMContentLoaded.bind(this),
        ],
        [
            'browsingContext.navigationStarted',
            this.#onFrameNavigationStarted.bind(this),
        ],
        ['browsingContext.userPromptOpened', this.#onDialog.bind(this)],
    ]);
    #networkManagerEvents = new Map([
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
    ]);
    #browsingContextEvents = new Map([
        [BrowsingContext_js_1.BrowsingContextEmittedEvents.Created, this.#onContextCreated.bind(this)],
        [
            BrowsingContext_js_1.BrowsingContextEmittedEvents.Destroyed,
            this.#onContextDestroyed.bind(this),
        ],
    ]);
    #tracing;
    #coverage;
    #emulationManager;
    #mouse;
    #touchscreen;
    #keyboard;
    #browsingContext;
    #browserContext;
    constructor(browsingContext, browserContext) {
        super();
        this.#browsingContext = browsingContext;
        this.#browserContext = browserContext;
        this.#connection = browsingContext.connection;
        for (const [event, subscriber] of this.#browsingContextEvents) {
            this.#browsingContext.on(event, subscriber);
        }
        this.#networkManager = new NetworkManager_js_2.NetworkManager(this.#connection, this);
        for (const [event, subscriber] of this.#subscribedEvents) {
            this.#connection.on(event, subscriber);
        }
        for (const [event, subscriber] of this.#networkManagerEvents) {
            this.#networkManager.on(event, subscriber);
        }
        const frame = new Frame_js_1.Frame(this, this.#browsingContext, this.#timeoutSettings, this.#browsingContext.parent);
        this.#frameTree.addFrame(frame);
        this.emit("frameattached" /* PageEmittedEvents.FrameAttached */, frame);
        // TODO: https://github.com/w3c/webdriver-bidi/issues/443
        this.#accessibility = new Accessibility_js_1.Accessibility(this.mainFrame().context().cdpSession);
        this.#tracing = new Tracing_js_1.Tracing(this.mainFrame().context().cdpSession);
        this.#coverage = new Coverage_js_1.Coverage(this.mainFrame().context().cdpSession);
        this.#emulationManager = new EmulationManager_js_1.EmulationManager(this.mainFrame().context().cdpSession);
        this.#mouse = new Input_js_1.Mouse(this.mainFrame().context());
        this.#touchscreen = new Input_js_1.Touchscreen(this.mainFrame().context());
        this.#keyboard = new Input_js_1.Keyboard(this.mainFrame().context());
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
        (0, assert_js_1.assert)(mainFrame, 'Requesting main frame too early!');
        return mainFrame;
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
            this.emit("load" /* PageEmittedEvents.Load */);
        }
    }
    #onFrameDOMContentLoaded(info) {
        const frame = this.frame(info.context);
        if (frame && this.mainFrame() === frame) {
            this.emit("domcontentloaded" /* PageEmittedEvents.DOMContentLoaded */);
        }
    }
    #onContextCreated(context) {
        if (!this.frame(context.id) &&
            (this.frame(context.parent ?? '') || !this.#frameTree.getMainFrame())) {
            const frame = new Frame_js_1.Frame(this, context, this.#timeoutSettings, context.parent);
            this.#frameTree.addFrame(frame);
            if (frame !== this.mainFrame()) {
                this.emit("frameattached" /* PageEmittedEvents.FrameAttached */, frame);
            }
        }
    }
    async #onFrameNavigationStarted(info) {
        const frameId = info.context;
        const frame = this.frame(frameId);
        if (frame) {
            // TODO: Investigate if a navigationCompleted event should be in Spec
            const predicate = (event) => {
                if (event.context === frame?._id) {
                    return true;
                }
                return false;
            };
            await Deferred_js_1.Deferred.race([
                (0, util_js_1.waitForEvent)(this.#connection, 'browsingContext.domContentLoaded', predicate, 0, this.#closedDeferred.valueOrThrow()).catch(util_js_1.debugError),
                (0, util_js_1.waitForEvent)(this.#connection, 'browsingContext.fragmentNavigated', predicate, 0, this.#closedDeferred.valueOrThrow()).catch(util_js_1.debugError),
            ]);
            this.emit("framenavigated" /* PageEmittedEvents.FrameNavigated */, frame);
        }
    }
    #onContextDestroyed(context) {
        const frame = this.frame(context.id);
        if (frame) {
            if (frame === this.mainFrame()) {
                this.emit("close" /* PageEmittedEvents.Close */);
            }
            this.#removeFramesRecursively(frame);
        }
    }
    #removeFramesRecursively(frame) {
        for (const child of frame.childFrames()) {
            this.#removeFramesRecursively(child);
        }
        frame.dispose();
        this.#networkManager.clearMapAfterFrameDispose(frame);
        this.#frameTree.removeFrame(frame);
        this.emit("framedetached" /* PageEmittedEvents.FrameDetached */, frame);
    }
    #onLogEntryAdded(event) {
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
    }
    #onDialog(event) {
        const frame = this.frame(event.context);
        if (!frame) {
            return;
        }
        const type = (0, util_js_1.validateDialogType)(event.type);
        const dialog = new Dialog_js_1.Dialog(frame.context(), type, event.message);
        this.emit("dialog" /* PageEmittedEvents.Dialog */, dialog);
    }
    getNavigationResponse(id) {
        return this.#networkManager.getNavigationResponse(id);
    }
    async close() {
        if (this.#closedDeferred.finished()) {
            return;
        }
        this.#closedDeferred.resolve(new Errors_js_1.TargetCloseError('Page closed!'));
        this.#networkManager.dispose();
        await this.#connection.send('browsingContext.close', {
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
            this.mainFrame()
                .context()
                .reload({
                ...options,
                timeout: options?.timeout ?? this.#timeoutSettings.navigationTimeout(),
            }),
        ]);
        return response;
    }
    url() {
        return this.mainFrame().url();
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
    async setContent(html, options = {}) {
        await this.mainFrame().setContent(html, options);
    }
    async content() {
        return this.mainFrame().content();
    }
    isJavaScriptEnabled() {
        return this.#emulationManager.javascriptEnabled;
    }
    async setGeolocation(options) {
        return await this.#emulationManager.setGeolocation(options);
    }
    async setJavaScriptEnabled(enabled) {
        return await this.#emulationManager.setJavaScriptEnabled(enabled);
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
            // TODO: reload seems to hang in BiDi.
            // await this.reload();
        }
    }
    viewport() {
        return this.#viewport;
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const { printBackground: background, margin, landscape, width, height, pageRanges: ranges, scale, preferCSSPageSize, timeout, } = this._getPDFOptions(options, 'cm');
        const pageRanges = ranges ? ranges.split(', ') : [];
        const { result } = await (0, util_js_1.waitWithTimeout)(this.#connection.send('browsingContext.print', {
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
        const { result } = await this.#connection.send('browsingContext.captureScreenshot', {
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
        const { timeout = this.#timeoutSettings.timeout() } = options;
        return (0, util_js_1.waitForEvent)(this.#networkManager, NetworkManager_js_1.NetworkManagerEmittedEvents.Request, async (request) => {
            if ((0, util_js_1.isString)(urlOrPredicate)) {
                return urlOrPredicate === request.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(request));
            }
            return false;
        }, timeout, this.#closedDeferred.valueOrThrow());
    }
    waitForResponse(urlOrPredicate, options = {}) {
        const { timeout = this.#timeoutSettings.timeout() } = options;
        return (0, util_js_1.waitForEvent)(this.#networkManager, NetworkManager_js_1.NetworkManagerEmittedEvents.Response, async (response) => {
            if ((0, util_js_1.isString)(urlOrPredicate)) {
                return urlOrPredicate === response.url();
            }
            if (typeof urlOrPredicate === 'function') {
                return !!(await urlOrPredicate(response));
            }
            return false;
        }, timeout, this.#closedDeferred.valueOrThrow());
    }
    async waitForNetworkIdle(options = {}) {
        const { idleTime = 500, timeout = this.#timeoutSettings.timeout() } = options;
        await this._waitForNetworkIdle(this.#networkManager, idleTime, timeout, this.#closedDeferred);
    }
    title() {
        return this.mainFrame().title();
    }
    async createCDPSession() {
        const { sessionId } = await this.mainFrame()
            .context()
            .cdpSession.send('Target.attachToTarget', {
            targetId: this.mainFrame()._id,
            flatten: true,
        });
        return new BrowsingContext_js_1.CDPSessionWrapper(this.mainFrame().context(), sessionId);
    }
}
exports.Page = Page;
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