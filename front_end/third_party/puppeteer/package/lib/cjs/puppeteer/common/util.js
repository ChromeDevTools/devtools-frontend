"use strict";
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
var _PuppeteerURL_functionName, _PuppeteerURL_siteString;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageContent = exports.setPageContent = exports.getReadableFromProtocolStream = exports.getReadableAsBuffer = exports.importFSPromises = exports.waitWithTimeout = exports.pageBindingInitString = exports.addPageBinding = exports.evaluationString = exports.createJSHandle = exports.waitForEvent = exports.isDate = exports.isRegExp = exports.isPlainObject = exports.isNumber = exports.isString = exports.removeEventListeners = exports.addEventListener = exports.releaseObject = exports.valueFromRemoteObject = exports.getSourcePuppeteerURLIfAvailable = exports.withSourcePuppeteerURLIfNone = exports.PuppeteerURL = exports.createClientError = exports.createEvaluationError = exports.debugError = void 0;
const environment_js_1 = require("../environment.js");
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Debug_js_1 = require("./Debug.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
exports.debugError = (0, Debug_js_1.debug)('puppeteer:error');
/**
 * @internal
 */
function createEvaluationError(details) {
    let name;
    let message;
    if (!details.exception) {
        name = 'Error';
        message = details.text;
    }
    else if ((details.exception.type !== 'object' ||
        details.exception.subtype !== 'error') &&
        !details.exception.objectId) {
        return valueFromRemoteObject(details.exception);
    }
    else {
        const detail = getErrorDetails(details);
        name = detail.name;
        message = detail.message;
    }
    const messageHeight = message.split('\n').length;
    const error = new Error(message);
    error.name = name;
    const stackLines = error.stack.split('\n');
    const messageLines = stackLines.splice(0, messageHeight);
    // The first line is this function which we ignore.
    stackLines.shift();
    if (details.stackTrace && stackLines.length < Error.stackTraceLimit) {
        for (const frame of details.stackTrace.callFrames.reverse()) {
            if (PuppeteerURL.isPuppeteerURL(frame.url) &&
                frame.url !== PuppeteerURL.INTERNAL_URL) {
                const url = PuppeteerURL.parse(frame.url);
                stackLines.unshift(`    at ${frame.functionName || url.functionName} (${url.functionName} at ${url.siteString}, <anonymous>:${frame.lineNumber}:${frame.columnNumber})`);
            }
            else {
                stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
            }
            if (stackLines.length >= Error.stackTraceLimit) {
                break;
            }
        }
    }
    error.stack = [...messageLines, ...stackLines].join('\n');
    return error;
}
exports.createEvaluationError = createEvaluationError;
/**
 * @internal
 */
function createClientError(details) {
    let name;
    let message;
    if (!details.exception) {
        name = 'Error';
        message = details.text;
    }
    else if ((details.exception.type !== 'object' ||
        details.exception.subtype !== 'error') &&
        !details.exception.objectId) {
        return valueFromRemoteObject(details.exception);
    }
    else {
        const detail = getErrorDetails(details);
        name = detail.name;
        message = detail.message;
    }
    const messageHeight = message.split('\n').length;
    const error = new Error(message);
    error.name = name;
    const stackLines = [];
    const messageLines = error.stack.split('\n').splice(0, messageHeight);
    if (details.stackTrace && stackLines.length < Error.stackTraceLimit) {
        for (const frame of details.stackTrace.callFrames.reverse()) {
            stackLines.push(`    at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
            if (stackLines.length >= Error.stackTraceLimit) {
                break;
            }
        }
    }
    error.stack = [...messageLines, ...stackLines].join('\n');
    return error;
}
exports.createClientError = createClientError;
const getErrorDetails = (details) => {
    let name = '';
    let message;
    const lines = details.exception?.description?.split('\n    at ') ?? [];
    const size = Math.min(details.stackTrace?.callFrames.length ?? 0, lines.length - 1);
    lines.splice(-size, size);
    if (details.exception?.className) {
        name = details.exception.className;
    }
    message = lines.join('\n');
    if (name && message.startsWith(`${name}: `)) {
        message = message.slice(name.length + 2);
    }
    return { message, name };
};
/**
 * @internal
 */
const SOURCE_URL = Symbol('Source URL for Puppeteer evaluation scripts');
/**
 * @internal
 */
class PuppeteerURL {
    constructor() {
        _PuppeteerURL_functionName.set(this, void 0);
        _PuppeteerURL_siteString.set(this, void 0);
    }
    static fromCallSite(functionName, site) {
        const url = new PuppeteerURL();
        __classPrivateFieldSet(url, _PuppeteerURL_functionName, functionName, "f");
        __classPrivateFieldSet(url, _PuppeteerURL_siteString, site.toString(), "f");
        return url;
    }
    get functionName() {
        return __classPrivateFieldGet(this, _PuppeteerURL_functionName, "f");
    }
    get siteString() {
        return __classPrivateFieldGet(this, _PuppeteerURL_siteString, "f");
    }
    toString() {
        return `pptr:${[
            __classPrivateFieldGet(this, _PuppeteerURL_functionName, "f"),
            encodeURIComponent(__classPrivateFieldGet(this, _PuppeteerURL_siteString, "f")),
        ].join(';')}`;
    }
}
exports.PuppeteerURL = PuppeteerURL;
_PuppeteerURL_functionName = new WeakMap(), _PuppeteerURL_siteString = new WeakMap();
PuppeteerURL.INTERNAL_URL = 'pptr:internal';
PuppeteerURL.parse = (url) => {
    url = url.slice('pptr:'.length);
    const [functionName = '', siteString = ''] = url.split(';');
    const puppeteerUrl = new PuppeteerURL();
    __classPrivateFieldSet(puppeteerUrl, _PuppeteerURL_functionName, functionName, "f");
    __classPrivateFieldSet(puppeteerUrl, _PuppeteerURL_siteString, decodeURIComponent(siteString), "f");
    return puppeteerUrl;
};
PuppeteerURL.isPuppeteerURL = (url) => {
    return url.startsWith('pptr:');
};
/**
 * @internal
 */
const withSourcePuppeteerURLIfNone = (functionName, object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object;
    }
    const original = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => {
        // First element is the function. Second element is the caller of this
        // function. Third element is the caller of the caller of this function
        // which is precisely what we want.
        return stack[2];
    };
    const site = new Error().stack;
    Error.prepareStackTrace = original;
    return Object.assign(object, {
        [SOURCE_URL]: PuppeteerURL.fromCallSite(functionName, site),
    });
};
exports.withSourcePuppeteerURLIfNone = withSourcePuppeteerURLIfNone;
/**
 * @internal
 */
const getSourcePuppeteerURLIfAvailable = (object) => {
    if (Object.prototype.hasOwnProperty.call(object, SOURCE_URL)) {
        return object[SOURCE_URL];
    }
    return undefined;
};
exports.getSourcePuppeteerURLIfAvailable = getSourcePuppeteerURLIfAvailable;
/**
 * @internal
 */
function valueFromRemoteObject(remoteObject) {
    (0, assert_js_1.assert)(!remoteObject.objectId, 'Cannot extract value when objectId is given');
    if (remoteObject.unserializableValue) {
        if (remoteObject.type === 'bigint') {
            return BigInt(remoteObject.unserializableValue.replace('n', ''));
        }
        switch (remoteObject.unserializableValue) {
            case '-0':
                return -0;
            case 'NaN':
                return NaN;
            case 'Infinity':
                return Infinity;
            case '-Infinity':
                return -Infinity;
            default:
                throw new Error('Unsupported unserializable value: ' +
                    remoteObject.unserializableValue);
        }
    }
    return remoteObject.value;
}
exports.valueFromRemoteObject = valueFromRemoteObject;
/**
 * @internal
 */
async function releaseObject(client, remoteObject) {
    if (!remoteObject.objectId) {
        return;
    }
    await client
        .send('Runtime.releaseObject', { objectId: remoteObject.objectId })
        .catch(error => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        (0, exports.debugError)(error);
    });
}
exports.releaseObject = releaseObject;
/**
 * @internal
 */
function addEventListener(emitter, eventName, handler) {
    emitter.on(eventName, handler);
    return { emitter, eventName, handler };
}
exports.addEventListener = addEventListener;
/**
 * @internal
 */
function removeEventListeners(listeners) {
    for (const listener of listeners) {
        listener.emitter.removeListener(listener.eventName, listener.handler);
    }
    listeners.length = 0;
}
exports.removeEventListeners = removeEventListeners;
/**
 * @internal
 */
const isString = (obj) => {
    return typeof obj === 'string' || obj instanceof String;
};
exports.isString = isString;
/**
 * @internal
 */
const isNumber = (obj) => {
    return typeof obj === 'number' || obj instanceof Number;
};
exports.isNumber = isNumber;
/**
 * @internal
 */
const isPlainObject = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Object;
};
exports.isPlainObject = isPlainObject;
/**
 * @internal
 */
const isRegExp = (obj) => {
    return typeof obj === 'object' && obj?.constructor === RegExp;
};
exports.isRegExp = isRegExp;
/**
 * @internal
 */
const isDate = (obj) => {
    return typeof obj === 'object' && obj?.constructor === Date;
};
exports.isDate = isDate;
/**
 * @internal
 */
async function waitForEvent(emitter, eventName, predicate, timeout, abortPromise) {
    const deferred = Deferred_js_1.Deferred.create({
        message: `Timeout exceeded while waiting for event ${String(eventName)}`,
        timeout,
    });
    const listener = addEventListener(emitter, eventName, async (event) => {
        if (await predicate(event)) {
            deferred.resolve(event);
        }
    });
    return Deferred_js_1.Deferred.race([deferred, abortPromise]).then(r => {
        removeEventListeners([listener]);
        if ((0, ErrorLike_js_1.isErrorLike)(r)) {
            throw r;
        }
        return r;
    }, error => {
        removeEventListeners([listener]);
        throw error;
    });
}
exports.waitForEvent = waitForEvent;
/**
 * @internal
 */
function createJSHandle(context, remoteObject) {
    if (remoteObject.subtype === 'node' && context._world) {
        return new ElementHandle_js_1.CDPElementHandle(context, remoteObject, context._world.frame());
    }
    return new JSHandle_js_1.CDPJSHandle(context, remoteObject);
}
exports.createJSHandle = createJSHandle;
/**
 * @internal
 */
function evaluationString(fun, ...args) {
    if ((0, exports.isString)(fun)) {
        (0, assert_js_1.assert)(args.length === 0, 'Cannot evaluate a string with arguments');
        return fun;
    }
    function serializeArgument(arg) {
        if (Object.is(arg, undefined)) {
            return 'undefined';
        }
        return JSON.stringify(arg);
    }
    return `(${fun})(${args.map(serializeArgument).join(',')})`;
}
exports.evaluationString = evaluationString;
/**
 * @internal
 */
function addPageBinding(type, name) {
    // This is the CDP binding.
    // @ts-expect-error: In a different context.
    const callCDP = globalThis[name];
    // We replace the CDP binding with a Puppeteer binding.
    Object.assign(globalThis, {
        [name](...args) {
            // This is the Puppeteer binding.
            // @ts-expect-error: In a different context.
            const callPuppeteer = globalThis[name];
            callPuppeteer.args ??= new Map();
            callPuppeteer.callbacks ??= new Map();
            const seq = (callPuppeteer.lastSeq ?? 0) + 1;
            callPuppeteer.lastSeq = seq;
            callPuppeteer.args.set(seq, args);
            callCDP(JSON.stringify({
                type,
                name,
                seq,
                args,
                isTrivial: !args.some(value => {
                    return value instanceof Node;
                }),
            }));
            return new Promise((resolve, reject) => {
                callPuppeteer.callbacks.set(seq, {
                    resolve(value) {
                        callPuppeteer.args.delete(seq);
                        resolve(value);
                    },
                    reject(value) {
                        callPuppeteer.args.delete(seq);
                        reject(value);
                    },
                });
            });
        },
    });
}
exports.addPageBinding = addPageBinding;
/**
 * @internal
 */
function pageBindingInitString(type, name) {
    return evaluationString(addPageBinding, type, name);
}
exports.pageBindingInitString = pageBindingInitString;
/**
 * @internal
 */
async function waitWithTimeout(promise, taskName, timeout) {
    const deferred = Deferred_js_1.Deferred.create({
        message: `waiting for ${taskName} failed: timeout ${timeout}ms exceeded`,
        timeout,
    });
    return await Deferred_js_1.Deferred.race([promise, deferred]).finally(() => {
        deferred.reject(new Error('Cleared'));
    });
}
exports.waitWithTimeout = waitWithTimeout;
/**
 * @internal
 */
let fs = null;
/**
 * @internal
 */
async function importFSPromises() {
    if (!fs) {
        try {
            fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Cannot write to a path outside of a Node-like environment.');
            }
            throw error;
        }
    }
    return fs;
}
exports.importFSPromises = importFSPromises;
/**
 * @internal
 */
async function getReadableAsBuffer(readable, path) {
    const buffers = [];
    if (path) {
        const fs = await importFSPromises();
        const fileHandle = await fs.open(path, 'w+');
        try {
            for await (const chunk of readable) {
                buffers.push(chunk);
                await fileHandle.writeFile(chunk);
            }
        }
        finally {
            await fileHandle.close();
        }
    }
    else {
        for await (const chunk of readable) {
            buffers.push(chunk);
        }
    }
    try {
        return Buffer.concat(buffers);
    }
    catch (error) {
        return null;
    }
}
exports.getReadableAsBuffer = getReadableAsBuffer;
/**
 * @internal
 */
async function getReadableFromProtocolStream(client, handle) {
    // TODO: Once Node 18 becomes the lowest supported version, we can migrate to
    // ReadableStream.
    if (!environment_js_1.isNode) {
        throw new Error('Cannot create a stream outside of Node.js environment.');
    }
    const { Readable } = await Promise.resolve().then(() => __importStar(require('stream')));
    let eof = false;
    return new Readable({
        async read(size) {
            if (eof) {
                return;
            }
            try {
                const response = await client.send('IO.read', { handle, size });
                this.push(response.data, response.base64Encoded ? 'base64' : undefined);
                if (response.eof) {
                    eof = true;
                    await client.send('IO.close', { handle });
                    this.push(null);
                }
            }
            catch (error) {
                if ((0, ErrorLike_js_1.isErrorLike)(error)) {
                    this.destroy(error);
                    return;
                }
                throw error;
            }
        },
    });
}
exports.getReadableFromProtocolStream = getReadableFromProtocolStream;
/**
 * @internal
 */
async function setPageContent(page, content) {
    // We rely upon the fact that document.open() will reset frame lifecycle with "init"
    // lifecycle event. @see https://crrev.com/608658
    return page.evaluate(html => {
        document.open();
        document.write(html);
        document.close();
    }, content);
}
exports.setPageContent = setPageContent;
/**
 * @internal
 */
function getPageContent() {
    let content = '';
    for (const node of document.childNodes) {
        switch (node) {
            case document.documentElement:
                content += document.documentElement.outerHTML;
                break;
            default:
                content += new XMLSerializer().serializeToString(node);
                break;
        }
    }
    return content;
}
exports.getPageContent = getPageContent;
//# sourceMappingURL=util.js.map