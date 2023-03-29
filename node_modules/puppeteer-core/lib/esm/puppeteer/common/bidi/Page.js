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
var _Page_instances, _Page_context, _Page_subscribedEvents, _Page_onLogEntryAdded, _Page_onLoad, _Page_onDOMLoad;
import { Page as PageBase, } from '../../api/Page.js';
import { isErrorLike } from '../../util/ErrorLike.js';
import { ConsoleMessage } from '../ConsoleMessage.js';
import { debugError, waitWithTimeout } from '../util.js';
import { getBidiHandle } from './Context.js';
import { BidiSerializer } from './Serializer.js';
/**
 * @internal
 */
export class Page extends PageBase {
    constructor(context) {
        super();
        _Page_instances.add(this);
        _Page_context.set(this, void 0);
        _Page_subscribedEvents.set(this, new Map([
            ['log.entryAdded', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onLogEntryAdded).bind(this)],
            ['browsingContext.load', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onLoad).bind(this)],
            ['browsingContext.domContentLoaded', __classPrivateFieldGet(this, _Page_instances, "m", _Page_onDOMLoad).bind(this)],
        ]));
        __classPrivateFieldSet(this, _Page_context, context, "f");
        __classPrivateFieldGet(this, _Page_context, "f").connection
            .send('session.subscribe', {
            events: [
                ...__classPrivateFieldGet(this, _Page_subscribedEvents, "f").keys(),
            ],
            contexts: [__classPrivateFieldGet(this, _Page_context, "f").id],
        })
            .catch(error => {
            if (isErrorLike(error) && !error.message.includes('Target closed')) {
                throw error;
            }
        });
        for (const [event, subscriber] of __classPrivateFieldGet(this, _Page_subscribedEvents, "f")) {
            __classPrivateFieldGet(this, _Page_context, "f").on(event, subscriber);
        }
    }
    async close() {
        await __classPrivateFieldGet(this, _Page_context, "f").connection.send('session.unsubscribe', {
            events: [...__classPrivateFieldGet(this, _Page_subscribedEvents, "f").keys()],
            contexts: [__classPrivateFieldGet(this, _Page_context, "f").id],
        });
        await __classPrivateFieldGet(this, _Page_context, "f").connection.send('browsingContext.close', {
            context: __classPrivateFieldGet(this, _Page_context, "f").id,
        });
        for (const [event, subscriber] of __classPrivateFieldGet(this, _Page_subscribedEvents, "f")) {
            __classPrivateFieldGet(this, _Page_context, "f").off(event, subscriber);
        }
    }
    async evaluateHandle(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Page_context, "f").evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Page_context, "f").evaluate(pageFunction, ...args);
    }
    async goto(url, options) {
        return __classPrivateFieldGet(this, _Page_context, "f").goto(url, options);
    }
    url() {
        return __classPrivateFieldGet(this, _Page_context, "f").url();
    }
    setDefaultNavigationTimeout(timeout) {
        __classPrivateFieldGet(this, _Page_context, "f")._timeoutSettings.setDefaultNavigationTimeout(timeout);
    }
    setDefaultTimeout(timeout) {
        __classPrivateFieldGet(this, _Page_context, "f")._timeoutSettings.setDefaultTimeout(timeout);
    }
    async setContent(html, options = {}) {
        await __classPrivateFieldGet(this, _Page_context, "f").setContent(html, options);
    }
    async content() {
        return await this.evaluate(() => {
            let retVal = '';
            if (document.doctype) {
                retVal = new XMLSerializer().serializeToString(document.doctype);
            }
            if (document.documentElement) {
                retVal += document.documentElement.outerHTML;
            }
            return retVal;
        });
    }
    async pdf(options = {}) {
        const { path = undefined } = options;
        const { printBackground: background, margin, landscape, width, height, pageRanges, scale, preferCSSPageSize, timeout, } = this._getPDFOptions(options, 'cm');
        const { result } = await waitWithTimeout(__classPrivateFieldGet(this, _Page_context, "f").connection.send('browsingContext.print', {
            context: __classPrivateFieldGet(this, _Page_context, "f")._contextId,
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
    async screenshot(options = {}) {
        const { path = undefined, encoding, ...args } = options;
        if (Object.keys(args).length >= 1) {
            throw new Error('BiDi only supports "encoding" and "path" options');
        }
        const { result } = await __classPrivateFieldGet(this, _Page_context, "f").connection.send('browsingContext.captureScreenshot', {
            context: __classPrivateFieldGet(this, _Page_context, "f")._contextId,
        });
        if (encoding === 'base64') {
            return result.data;
        }
        const buffer = Buffer.from(result.data, 'base64');
        await this._maybeWriteBufferToFile(path, buffer);
        return buffer;
    }
}
_Page_context = new WeakMap(), _Page_subscribedEvents = new WeakMap(), _Page_instances = new WeakSet(), _Page_onLogEntryAdded = function _Page_onLogEntryAdded(event) {
    var _a;
    if (isConsoleLogEntry(event)) {
        const args = event.args.map(arg => {
            return getBidiHandle(__classPrivateFieldGet(this, _Page_context, "f"), arg);
        });
        const text = args
            .reduce((value, arg) => {
            const parsedValue = arg.isPrimitiveValue
                ? BidiSerializer.deserialize(arg.remoteValue())
                : arg.toString();
            return `${value} ${parsedValue}`;
        }, '')
            .slice(1);
        this.emit("console" /* PageEmittedEvents.Console */, new ConsoleMessage(event.method, text, args, getStackTraceLocations(event.stackTrace)));
    }
    else if (isJavaScriptLogEntry(event)) {
        let message = (_a = event.text) !== null && _a !== void 0 ? _a : '';
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
        debugError(`Unhandled LogEntry with type "${event.type}", text "${event.text}" and level "${event.level}"`);
    }
}, _Page_onLoad = function _Page_onLoad(_event) {
    this.emit("load" /* PageEmittedEvents.Load */);
}, _Page_onDOMLoad = function _Page_onDOMLoad(_event) {
    this.emit("domcontentloaded" /* PageEmittedEvents.DOMContentLoaded */);
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